// =============================================
// NOBODYSWATCHING.LIVE — Discord "Who's Live" Announcer
// Runs every 30 minutes via Netlify Scheduled Functions.
//
// Posts one currently-live streamer to a Discord channel, spotlight
// style, as a gentle nudge for the community to go say hi. This is
// deliberately NOT triggered by "someone just went live" events —
// that would risk spamming the channel every time a connection blips.
// Instead it's a predictable, bounded cadence: one post every 30
// minutes, or none at all if nobody's genuinely live.
// =============================================

import { createClient } from '@supabase/supabase-js';

export const config = {
    schedule: "*/30 * * * *"
};

export default async function handler() {
    const {
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        DISCORD_LIVE_WEBHOOK_URL
    } = process.env;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DISCORD_LIVE_WEBHOOK_URL) {
        console.error('Missing required environment variables');
        return new Response('Missing config', { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        // 1. Get everyone genuinely live right now — same fairness bar as
        // the on-site Spotlight: no reruns, no manually-exempt streamers,
        // and never a hidden/flagged channel.
        const { data: liveProfiles, error: fetchError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, live_game, live_viewer_count, live_thumbnail_url')
            .eq('is_live', true)
            .eq('is_rerun', false)
            .eq('spotlight_exempt', false)
            .eq('is_visible', true);

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            return new Response('DB error', { status: 500 });
        }

        if (!liveProfiles || liveProfiles.length === 0) {
            console.log('Nobody genuinely live right now — skipping this cycle');
            return new Response('Nobody live, skipped', { status: 200 });
        }

        // 2. Rank everyone by how long it's been since they were last
        // announced — never-announced counts as maximally overdue. This
        // replaces an earlier "lowest viewer count" model, which had a
        // real problem at scale: with enough people live at once, anyone
        // above the very smallest tier could be permanently excluded
        // from the pool, and worse, a small streamer succeeding and
        // growing their viewer count would quietly lose their spot in
        // rotation — the opposite of what this feature is for. Ranking
        // by overdue-ness instead guarantees everyone eligible surfaces
        // eventually, and naturally avoids repeating whoever was just
        // announced (their timestamp is now the most recent, so they
        // rank least-overdue without needing separate repeat-avoidance logic).
        const candidateIds = liveProfiles.map(p => p.id);
        const { data: history } = await supabase
            .from('discord_announcements')
            .select('streamer_id, announced_at')
            .in('streamer_id', candidateIds)
            .order('announced_at', { ascending: false });

        const lastAnnouncedMap = new Map();
        (history || []).forEach(row => {
            if (!lastAnnouncedMap.has(row.streamer_id)) {
                lastAnnouncedMap.set(row.streamer_id, row.announced_at);
            }
        });

        const ranked = liveProfiles.map(p => {
            const lastAnnounced = lastAnnouncedMap.get(p.id);
            const lastAnnouncedTime = lastAnnounced ? new Date(lastAnnounced).getTime() : -Infinity;
            return { profile: p, lastAnnouncedTime };
        });

        ranked.sort((a, b) => a.lastAnnouncedTime - b.lastAnnouncedTime);

        // 3. Always pick the single most overdue person — deterministic,
        // not random. Randomly picking from a "top 5 overdue" pool sounds
        // fair, but breaks down badly with few candidates: during quiet
        // hours with only 2-3 people live, that pool is basically
        // everyone live, including whoever was JUST announced, and pure
        // chance could pick them again almost immediately. Taking the
        // single most overdue candidate directly guarantees fairness
        // regardless of how many people happen to be live at once.
        const pick = ranked[0].profile;

        // 4. Post to Discord as a rich embed
        const profileUrl = `https://nobodyswatching.live/streamer.html?user=${encodeURIComponent(pick.username)}`;
        const viewers = pick.live_viewer_count || 0;

        const embed = {
            title: `🔴 ${pick.username} is live right now`,
            description: `${pick.live_game || 'Streaming'}\n👁 ${viewers} viewer${viewers !== 1 ? 's' : ''} watching`,
            url: profileUrl,
            color: 959909, // matches the site's teal accent (#0ea5a5)
            footer: { text: 'Go be one more.' }
        };
        if (pick.avatar_url) embed.thumbnail = { url: pick.avatar_url };
        if (pick.live_thumbnail_url) embed.image = { url: pick.live_thumbnail_url };

        const discordRes = await fetch(DISCORD_LIVE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });

        if (!discordRes.ok) {
            const bodySnippet = await discordRes.text().catch(() => '');
            console.error(`Discord webhook returned ${discordRes.status}: ${bodySnippet.slice(0, 200)}`);
            return new Response('Discord post failed', { status: 500 });
        }

        // 5. Log this pick — this history is what the overdue-ranking above
        // is built from, so every announcement here feeds fair rotation
        // for everyone else going forward.
        await supabase
            .from('discord_announcements')
            .insert({ streamer_id: pick.id });

        console.log(`Announced ${pick.username} to Discord (${viewers} viewers)`);
        return new Response(`Announced ${pick.username}`, { status: 200 });

    } catch (err) {
        console.error('Unexpected error:', err);
        return new Response('Internal error', { status: 500 });
    }
}
