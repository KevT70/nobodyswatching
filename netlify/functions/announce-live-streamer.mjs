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

        // 2. Avoid repeating the same person twice in a row, but only if
        // there's actually someone else to pick instead.
        const { data: lastAnnouncement } = await supabase
            .from('discord_announcements')
            .select('streamer_id')
            .order('announced_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let candidates = liveProfiles;
        if (lastAnnouncement && liveProfiles.length > 1) {
            const withoutLast = liveProfiles.filter(p => p.id !== lastAnnouncement.streamer_id);
            if (withoutLast.length > 0) candidates = withoutLast;
        }

        // 3. Pick randomly from the lowest-viewer handful — same fairness
        // philosophy as the on-site Spotlight and the Raid Finder.
        const sorted = [...candidates].sort((a, b) => (a.live_viewer_count || 0) - (b.live_viewer_count || 0));
        const pool = sorted.slice(0, 5);
        const pick = pool[Math.floor(Math.random() * pool.length)];

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

        // 5. Log this pick so the next cycle can avoid repeating it immediately
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
