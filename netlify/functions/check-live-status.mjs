// =============================================
// NOBODYSWATCHING.LIVE — Multi-Platform Live Status Checker
// Runs every 3 minutes via Netlify Scheduled Functions
// Supports: Twitch, Kick, YouTube (optional)
// =============================================

import { createClient } from '@supabase/supabase-js';

export const config = {
    schedule: "*/3 * * * *"
};

// =============================================
// TWITCH
// =============================================
async function getTwitchToken(clientId, clientSecret) {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        })
    });
    if (!response.ok) throw new Error(`Twitch token error: ${response.status}`);
    const data = await response.json();
    return data.access_token;
}

async function checkTwitchLive(usernames, clientId, accessToken) {
    if (usernames.length === 0) return new Map();

    const allStreams = [];
    for (let i = 0; i < usernames.length; i += 100) {
        const batch = usernames.slice(i, i + 100);
        const params = batch.map(u => `user_login=${encodeURIComponent(u)}`).join('&');
        const response = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!response.ok) {
            console.error(`Twitch API error: ${response.status}`);
            continue;
        }
        const data = await response.json();
        allStreams.push(...(data.data || []));
    }

    const liveMap = new Map();
    for (const stream of allStreams) {
        const isRerun = (stream.type && stream.type !== 'live') ||
            (stream.tags || []).some(t => t.toLowerCase() === 'rerun' || t.toLowerCase() === 'rebroadcast');

        const thumbUrl = stream.thumbnail_url
            ? stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')
            : null;
        liveMap.set(stream.user_login.toLowerCase(), {
            game: stream.game_name || null,
            viewers: stream.viewer_count || 0,
            thumbnail: thumbUrl,
            platform: 'twitch.tv',
            isRerun: isRerun
        });
    }
    return liveMap;
}

// =============================================
// KICK — live detection disabled.
//
// Kick's WAF actively blocks requests from this API endpoint
// ("Request blocked by security policy"), and that's not something
// we can reliably work around from a serverless function. Kick
// stays a supported platform LINK on profiles — same as Rumble,
// TikTok, and Velora — but we don't attempt to detect live status
// on it for now. Revisit if Kick ever ships an official API.
// =============================================
async function checkKickLive(usernames) {
    return new Map();
}

// =============================================
// YOUTUBE — InnerTube-based live detection.
//
// This uses YouTube's own internal "InnerTube" API — the same one
// youtube.com's web player calls under the hood, and the technique
// used by tools like yt-dlp. It uses a public WEB-client key that's
// baked into every YouTube page load, so it isn't subject to the
// Developer API's 10,000-unit daily quota at all.
//
// We still use the official (cheap, 1-unit) channels.list call to
// resolve @handles to a channel ID — that was never the expensive
// part, only search.list (100 units) was, and we no longer use it.
// =============================================
const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_CONTEXT = {
    client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.00.00'
    }
};

async function resolveYouTubeChannelId(identifier, type, apiKey, cachedChannelId) {
    if (type === 'channel_id') return identifier;
    if (cachedChannelId) return cachedChannelId; // Already resolved on a previous run — skip the API call
    if (!apiKey) return null;
    try {
        const res = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(identifier)}&key=${apiKey}`
        );
        if (!res.ok) {
            console.error(`YouTube handle resolve returned ${res.status} for ${identifier}`);
            return null;
        }
        const data = await res.json();
        return data.items?.[0]?.id || null;
    } catch (err) {
        console.error(`YouTube handle resolve failed for ${identifier}:`, err.message);
        return null;
    }
}

// Search the raw InnerTube response TEXT for a live-badge marker, then
// find the nearest videoId to it. This is deliberately loose about
// exact JSON structure (fields aren't always siblings in the same
// object) but related fields do end up serialized near each other,
// so proximity in the raw text is a more forgiving signal than an
// exact object-shape match.
function findLiveVideoId(rawText) {
    const liveMarkerMatch = rawText.match(/"style":"LIVE"|LIVE_NOW/);
    if (!liveMarkerMatch) return null;

    const liveIndex = liveMarkerMatch.index;
    const windowStart = Math.max(0, liveIndex - 4000);
    const windowEnd = Math.min(rawText.length, liveIndex + 4000);
    const window = rawText.slice(windowStart, windowEnd);
    const liveIndexInWindow = liveIndex - windowStart;

    const videoIdMatches = [...window.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
    if (videoIdMatches.length === 0) return null;

    let closest = null;
    let closestDist = Infinity;
    for (const m of videoIdMatches) {
        const dist = Math.abs(m.index - liveIndexInWindow);
        if (dist < closestDist) {
            closestDist = dist;
            closest = m[1];
        }
    }
    return closest;
}

async function checkYouTubeLive(channelIdentifiers, apiKey) {
    const liveMap = new Map();
    const resolvedChannelIds = new Map(); // identifier -> channelId, for anything newly resolved this run

    for (const { identifier, type, cachedChannelId } of channelIdentifiers) {
        try {
            const channelId = await resolveYouTubeChannelId(identifier, type, apiKey, cachedChannelId);
            if (!channelId) {
                console.log(`YouTube check for ${identifier}: could not resolve channel ID, skipping`);
                continue;
            }
            if (!cachedChannelId) {
                resolvedChannelIds.set(identifier.toLowerCase(), channelId);
            }

            const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${INNERTUBE_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://www.youtube.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                },
                body: JSON.stringify({
                    context: INNERTUBE_CONTEXT,
                    browseId: channelId
                })
            });

            if (!response.ok) {
                const bodySnippet = await response.text().catch(() => '');
                console.error(`YouTube InnerTube browse returned ${response.status} for ${identifier}: ${bodySnippet.slice(0, 200)}`);
                continue;
            }

            const rawText = await response.text();
            const videoId = findLiveVideoId(rawText);

            // Deep diagnostic round: "LIVE" appears in lots of unrelated InnerTube
            // strings (chat labels, offline-status text, UI copy), so we've been
            // guessing at the wrong marker. This dumps real context so we can see
            // what's actually there instead of guessing again.
            if (!videoId && identifier.toLowerCase() === 'thejiggyjoe21') {
                const allLiveMatches = [...rawText.matchAll(/LIVE/g)].slice(0, 8);
                console.log(`YouTube DEEP DEBUG for ${identifier}: found ${allLiveMatches.length} "LIVE" occurrences (showing up to 8)`);
                allLiveMatches.forEach((m, i) => {
                    const start = Math.max(0, m.index - 80);
                    const end = Math.min(rawText.length, m.index + 80);
                    console.log(`  [${i}] ...${rawText.slice(start, end)}...`);
                });
                // Check for other known InnerTube live-signal patterns
                console.log(`  liveBroadcastContent: ${rawText.includes('"liveBroadcastContent"')}`);
                console.log(`  isLiveNow: ${rawText.includes('isLiveNow')}`);
                console.log(`  watching now: ${rawText.includes('watching')}`);
                console.log(`  thumbnailOverlayTimeStatusRenderer: ${rawText.includes('thumbnailOverlayTimeStatusRenderer')}`);
            }

            // Temporary diagnostic logging — remove once we've confirmed this works reliably
            console.log(`YouTube InnerTube check for ${identifier}: channelId=${channelId}, responseLength=${rawText.length}, containsLIVE=${rawText.includes('LIVE')}, videoId=${videoId || 'none'}`);

            if (!videoId) continue; // Not live

            // Free oEmbed call for title + thumbnail — no API key, no quota
            let title = null;
            let thumbnail = null;
            try {
                const oembedRes = await fetch(
                    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
                );
                if (oembedRes.ok) {
                    const oembedData = await oembedRes.json();
                    title = oembedData.title || null;
                    thumbnail = oembedData.thumbnail_url || null;
                }
            } catch (e) { /* title/thumbnail are nice-to-have */ }

            // Cheap, targeted Data API call (1 unit) for viewer count only —
            // only runs for channels we already know are live right now.
            let viewers = 0;
            if (apiKey) {
                try {
                    const statsRes = await fetch(
                        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`
                    );
                    if (statsRes.ok) {
                        const statsData = await statsRes.json();
                        viewers = parseInt(statsData.items?.[0]?.liveStreamingDetails?.concurrentViewers || '0');
                    } else {
                        const bodySnippet = await statsRes.text().catch(() => '');
                        console.error(`YouTube viewer count lookup returned ${statsRes.status} for ${identifier}: ${bodySnippet.slice(0, 200)}`);
                    }
                } catch (e) {
                    console.error(`YouTube viewer count fetch failed for ${identifier}:`, e.message);
                }
            }

            liveMap.set(identifier.toLowerCase(), {
                game: title,
                viewers: viewers,
                thumbnail: thumbnail,
                platform: 'youtube.com'
            });
        } catch (err) {
            console.error(`YouTube check failed for ${identifier}:`, err.message);
        }
    }

    return { liveMap, resolvedChannelIds };
}

// =============================================
// URL PARSERS
// =============================================
function extractKickUsername(url) {
    if (!url) return null;
    const match = url.match(/kick\.com\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

function extractYouTubeIdentifier(url) {
    if (!url) return null;
    const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
    if (handleMatch) return { identifier: handleMatch[1], type: 'handle' };
    const channelMatch = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
    if (channelMatch) return { identifier: channelMatch[1], type: 'channel_id' };
    return null;
}

// =============================================
// MAIN HANDLER
// =============================================
export default async function handler() {
    const {
        TWITCH_CLIENT_ID,
        TWITCH_CLIENT_SECRET,
        YOUTUBE_API_KEY,
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    } = process.env;

    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing required environment variables');
        return new Response('Missing config', { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        // 1. Get all profiles
        const { data: profiles, error: fetchError } = await supabase
            .from('profiles')
            .select('id, twitch_username, kick_url, youtube_url, youtube_channel_id, is_live, preferred_platform');

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            return new Response('DB error', { status: 500 });
        }

        if (!profiles || profiles.length === 0) {
            console.log('No profiles found');
            return new Response('No profiles to check', { status: 200 });
        }

        console.log(`Checking ${profiles.length} streamer(s) across platforms...`);

        // 2. Collect usernames per platform
        const twitchUsernames = profiles
            .map(p => p.twitch_username)
            .filter(Boolean);

        const kickUsernames = profiles
            .map(p => extractKickUsername(p.kick_url))
            .filter(Boolean);

        const youtubeChannels = profiles
            .map(p => {
                const info = extractYouTubeIdentifier(p.youtube_url);
                if (!info) return null;
                return { ...info, cachedChannelId: p.youtube_channel_id || null };
            })
            .filter(Boolean);

        console.log(`Found: ${twitchUsernames.length} Twitch, ${kickUsernames.length} Kick, ${youtubeChannels.length} YouTube`);

        // 3. Check all platforms in parallel
        const twitchToken = twitchUsernames.length > 0
            ? await getTwitchToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET)
            : null;

        const [twitchLive, kickLive, youtubeResult] = await Promise.all([
            twitchToken ? checkTwitchLive(twitchUsernames, TWITCH_CLIENT_ID, twitchToken) : new Map(),
            kickUsernames.length > 0 ? checkKickLive(kickUsernames) : new Map(),
            youtubeChannels.length > 0 ? checkYouTubeLive(youtubeChannels, YOUTUBE_API_KEY) : { liveMap: new Map(), resolvedChannelIds: new Map() }
        ]);

        const youtubeLive = youtubeResult.liveMap;
        const newlyResolvedChannelIds = youtubeResult.resolvedChannelIds;

        console.log(`Live: ${twitchLive.size} Twitch, ${kickLive.size} Kick, ${youtubeLive.size} YouTube`);

        // 3b. Persist any newly-resolved YouTube channel IDs so future runs
        // skip the paid resolve step for these profiles entirely.
        if (newlyResolvedChannelIds.size > 0) {
            const idUpdates = profiles
                .filter(p => {
                    const info = extractYouTubeIdentifier(p.youtube_url);
                    return info && info.type === 'handle' && newlyResolvedChannelIds.has(info.identifier.toLowerCase());
                })
                .map(p => {
                    const info = extractYouTubeIdentifier(p.youtube_url);
                    const channelId = newlyResolvedChannelIds.get(info.identifier.toLowerCase());
                    return supabase.from('profiles').update({ youtube_channel_id: channelId }).eq('id', p.id);
                });
            await Promise.all(idUpdates);
            console.log(`Cached ${idUpdates.length} newly-resolved YouTube channel ID(s)`);
        }

        // 4. Build combined live status per profile.
        // A streamer can be live on more than one platform at once — we track
        // ALL of them, then pick a "primary" one for the main Watch Now button:
        // their preferred_platform if it's currently live, otherwise the
        // fallback priority order: Twitch > Kick > YouTube.
        const PLATFORM_KEY_MAP = {
            twitch: 'twitch.tv',
            kick: 'kick.com',
            youtube: 'youtube.com'
        };

        const updates = profiles.map(profile => {
            // Collect every platform this profile is currently live on
            const liveEntries = []; // [{ key: 'twitch.tv', data: {...} }, ...]

            if (profile.twitch_username) {
                const tStream = twitchLive.get(profile.twitch_username.toLowerCase());
                if (tStream) liveEntries.push({ key: 'twitch.tv', data: tStream });
            }
            const kickUser = extractKickUsername(profile.kick_url);
            if (kickUser) {
                const kStream = kickLive.get(kickUser.toLowerCase());
                if (kStream) liveEntries.push({ key: 'kick.com', data: kStream });
            }
            const ytInfo = extractYouTubeIdentifier(profile.youtube_url);
            if (ytInfo) {
                const yStream = youtubeLive.get(ytInfo.identifier.toLowerCase());
                if (yStream) liveEntries.push({ key: 'youtube.com', data: yStream });
            }

            if (liveEntries.length > 0) {
                // Try the streamer's preferred platform first, if it's live right now
                const preferredKey = PLATFORM_KEY_MAP[profile.preferred_platform];
                let primary = preferredKey
                    ? liveEntries.find(e => e.key === preferredKey)
                    : null;

                // Fall back to fixed priority order: Twitch > Kick > YouTube
                if (!primary) {
                    primary = liveEntries.find(e => e.key === 'twitch.tv')
                        || liveEntries.find(e => e.key === 'kick.com')
                        || liveEntries.find(e => e.key === 'youtube.com');
                }

                return supabase
                    .from('profiles')
                    .update({
                        is_live: true,
                        is_rerun: primary.data.isRerun || false,
                        live_game: primary.data.game,
                        live_viewer_count: primary.data.viewers,
                        live_thumbnail_url: primary.data.thumbnail,
                        live_platform: primary.key,
                        live_platforms: liveEntries.map(e => e.key),
                        last_live_at: new Date().toISOString()
                    })
                    .eq('id', profile.id);
            } else if (profile.is_live) {
                return supabase
                    .from('profiles')
                    .update({
                        is_live: false,
                        is_rerun: false,
                        live_game: null,
                        live_viewer_count: 0,
                        live_thumbnail_url: null,
                        live_platform: null,
                        live_platforms: []
                    })
                    .eq('id', profile.id);
            }

            return null;
        }).filter(Boolean);

        const results = await Promise.all(updates);
        const errors = results.filter(r => r.error);

        if (errors.length > 0) {
            console.error(`${errors.length} update(s) failed:`, errors.map(e => e.error));
        }

        const totalLive = twitchLive.size + kickLive.size + youtubeLive.size;
        console.log(`Done. ${updates.length} profile(s) updated, ${totalLive} live total`);
        return new Response(`Checked ${profiles.length} profiles, ${totalLive} live`, { status: 200 });

    } catch (err) {
        console.error('Unexpected error:', err);
        return new Response('Internal error', { status: 500 });
    }
}
