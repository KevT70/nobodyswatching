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
        const thumbUrl = stream.thumbnail_url
            ? stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')
            : null;
        liveMap.set(stream.user_login.toLowerCase(), {
            game: stream.game_name || null,
            viewers: stream.viewer_count || 0,
            thumbnail: thumbUrl,
            platform: 'twitch.tv'
        });
    }
    return liveMap;
}

// =============================================
// KICK (unofficial API — no auth required)
// =============================================
async function checkKickLive(usernames) {
    const liveMap = new Map();

    for (const username of usernames) {
        try {
            const response = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(username)}`, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) continue;

            const data = await response.json();

            if (data.livestream && data.livestream.is_live) {
                liveMap.set(username.toLowerCase(), {
                    game: data.livestream.categories?.[0]?.name || null,
                    viewers: data.livestream.viewer_count || 0,
                    thumbnail: data.livestream.thumbnail?.url || null,
                    platform: 'kick.com'
                });
            }
        } catch (err) {
            console.error(`Kick check failed for ${username}:`, err.message);
        }
    }

    return liveMap;
}

// =============================================
// YOUTUBE (requires YOUTUBE_API_KEY env var)
// =============================================
async function checkYouTubeLive(channelIdentifiers, apiKey) {
    if (!apiKey) return new Map();
    const liveMap = new Map();

    for (const { identifier, type } of channelIdentifiers) {
        try {
            let channelId = identifier;

            // If it's a handle (@username), resolve to channel ID first
            if (type === 'handle') {
                const searchRes = await fetch(
                    `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(identifier)}&key=${apiKey}`
                );
                if (!searchRes.ok) continue;
                const searchData = await searchRes.json();
                if (!searchData.items || searchData.items.length === 0) continue;
                channelId = searchData.items[0].id;
            }

            // Search for live streams from this channel
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`
            );
            if (!response.ok) continue;

            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const liveVideo = data.items[0];

                // Get viewer count
                let viewers = 0;
                try {
                    const statsRes = await fetch(
                        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${liveVideo.id.videoId}&key=${apiKey}`
                    );
                    if (statsRes.ok) {
                        const statsData = await statsRes.json();
                        viewers = parseInt(statsData.items?.[0]?.liveStreamingDetails?.concurrentViewers || '0');
                    }
                } catch (e) { /* viewer count is nice-to-have */ }

                const thumbUrl = liveVideo.snippet.thumbnails?.medium?.url || null;

                liveMap.set(identifier.toLowerCase(), {
                    game: liveVideo.snippet.title || null,
                    viewers: viewers,
                    thumbnail: thumbUrl,
                    platform: 'youtube.com'
                });
            }
        } catch (err) {
            console.error(`YouTube check failed for ${identifier}:`, err.message);
        }
    }

    return liveMap;
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
            .select('id, twitch_username, kick_url, youtube_url, is_live');

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
            .map(p => extractYouTubeIdentifier(p.youtube_url))
            .filter(Boolean);

        console.log(`Found: ${twitchUsernames.length} Twitch, ${kickUsernames.length} Kick, ${youtubeChannels.length} YouTube`);

        // 3. Check all platforms in parallel
        const twitchToken = twitchUsernames.length > 0
            ? await getTwitchToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET)
            : null;

        const [twitchLive, kickLive, youtubeLive] = await Promise.all([
            twitchToken ? checkTwitchLive(twitchUsernames, TWITCH_CLIENT_ID, twitchToken) : new Map(),
            kickUsernames.length > 0 ? checkKickLive(kickUsernames) : new Map(),
            youtubeChannels.length > 0 ? checkYouTubeLive(youtubeChannels, YOUTUBE_API_KEY) : new Map()
        ]);

        console.log(`Live: ${twitchLive.size} Twitch, ${kickLive.size} Kick, ${youtubeLive.size} YouTube`);

        // 4. Build combined live status per profile
        // Priority: Twitch > Kick > YouTube
        const updates = profiles.map(profile => {
            let liveData = null;

            // Check Twitch
            if (profile.twitch_username) {
                const tStream = twitchLive.get(profile.twitch_username.toLowerCase());
                if (tStream) liveData = tStream;
            }

            // Check Kick (only if not already live on Twitch)
            if (!liveData) {
                const kickUser = extractKickUsername(profile.kick_url);
                if (kickUser) {
                    const kStream = kickLive.get(kickUser.toLowerCase());
                    if (kStream) liveData = kStream;
                }
            }

            // Check YouTube (only if not already live elsewhere)
            if (!liveData) {
                const ytInfo = extractYouTubeIdentifier(profile.youtube_url);
                if (ytInfo) {
                    const yStream = youtubeLive.get(ytInfo.identifier.toLowerCase());
                    if (yStream) liveData = yStream;
                }
            }

            if (liveData) {
                return supabase
                    .from('profiles')
                    .update({
                        is_live: true,
                        live_game: liveData.game,
                        live_viewer_count: liveData.viewers,
                        live_thumbnail_url: liveData.thumbnail,
                        live_platform: liveData.platform,
                        last_live_at: new Date().toISOString()
                    })
                    .eq('id', profile.id);
            } else if (profile.is_live) {
                return supabase
                    .from('profiles')
                    .update({
                        is_live: false,
                        live_game: null,
                        live_viewer_count: 0,
                        live_thumbnail_url: null,
                        live_platform: null
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
