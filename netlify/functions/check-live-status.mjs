// =============================================
// NOBODYSWATCHING.LIVE — Twitch Live Status Checker
// Runs every 3 minutes via Netlify Scheduled Functions
// =============================================

import { createClient } from '@supabase/supabase-js';

// Schedule: every 3 minutes
export const config = {
    schedule: "*/3 * * * *"
};

// =============================================
// GET TWITCH APP ACCESS TOKEN
// Uses client credentials flow (no user needed)
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

    if (!response.ok) {
        throw new Error(`Twitch token error: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
}

// =============================================
// CHECK TWITCH LIVE STATUS
// Batch up to 100 usernames per request
// =============================================
async function checkLiveStatus(usernames, clientId, accessToken) {
    if (usernames.length === 0) return [];

    // Twitch API allows up to 100 user_login params per request
    const batches = [];
    for (let i = 0; i < usernames.length; i += 100) {
        batches.push(usernames.slice(i, i + 100));
    }

    const allStreams = [];

    for (const batch of batches) {
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

    return allStreams;
}

// =============================================
// MAIN HANDLER
// =============================================
export default async function handler() {
    const {
        TWITCH_CLIENT_ID,
        TWITCH_CLIENT_SECRET,
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    } = process.env;

    // Validate env vars
    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing environment variables');
        return new Response('Missing config', { status: 500 });
    }

    // Init Supabase with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        // 1. Get all profiles with a twitch username
        const { data: profiles, error: fetchError } = await supabase
            .from('profiles')
            .select('id, twitch_username, is_live')
            .not('twitch_username', 'is', null)
            .neq('twitch_username', '');

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            return new Response('DB error', { status: 500 });
        }

        if (!profiles || profiles.length === 0) {
            console.log('No profiles with Twitch usernames found');
            return new Response('No profiles to check', { status: 200 });
        }

        console.log(`Checking ${profiles.length} streamer(s)...`);

        // 2. Get Twitch access token
        const accessToken = await getTwitchToken(TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET);

        // 3. Check who's live
        const twitchUsernames = profiles.map(p => p.twitch_username).filter(Boolean);
        const liveStreams = await checkLiveStatus(twitchUsernames, TWITCH_CLIENT_ID, accessToken);

        // Build a map of live usernames for quick lookup
        const liveMap = new Map();
        for (const stream of liveStreams) {
            liveMap.set(stream.user_login.toLowerCase(), stream);
        }

        console.log(`${liveMap.size} streamer(s) currently live`);

        // 4. Update each profile
        const updates = profiles.map(profile => {
            const stream = liveMap.get((profile.twitch_username || '').toLowerCase());

            if (stream) {
                // Streamer is LIVE
                // Build thumbnail URL (replace {width} and {height} placeholders)
                const thumbUrl = stream.thumbnail_url
                    ? stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')
                    : null;

                return supabase
                    .from('profiles')
                    .update({
                        is_live: true,
                        live_game: stream.game_name || null,
                        live_viewer_count: stream.viewer_count || 0,
                        live_thumbnail_url: thumbUrl,
                        live_platform: 'twitch.tv',
                        last_live_at: new Date().toISOString()
                    })
                    .eq('id', profile.id);
            } else {
                // Streamer is OFFLINE — only update if they were previously live
                if (profile.is_live) {
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
                return null; // No update needed
            }
        }).filter(Boolean);

        // Execute all updates
        const results = await Promise.all(updates);
        const errors = results.filter(r => r.error);

        if (errors.length > 0) {
            console.error(`${errors.length} update(s) failed:`, errors.map(e => e.error));
        }

        console.log(`Updated ${updates.length} profile(s) successfully`);
        return new Response(`Checked ${profiles.length} profiles, ${liveMap.size} live`, { status: 200 });

    } catch (err) {
        console.error('Unexpected error:', err);
        return new Response('Internal error', { status: 500 });
    }
}
