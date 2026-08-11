// =============================================
// NOBODYSWATCHING.LIVE — Achievement award endpoint
// Called from the client (index.html / profile.html) when a signed-in
// streamer does something achievement-worthy. Not scheduled — invoked
// directly at /.netlify/functions/award-achievement.
//
// Achievements are private (only the streamer sees their own) and
// participation-only — never tied to viewer/follower counts. See
// migration-achievements.sql and netlify/functions/lib/achievements.mjs.
//
// Two kinds of achievement key, handled differently:
//
// - SELF_REPORTED: pure UI-interaction achievements (used Raid Finder,
//   hit Random Streamer, clicked a Playing Now chip). There's nothing
//   persisted to verify beyond "this signed-in user did the thing just
//   now" — same honesty limit as not being able to confirm a raid
//   actually happened on Twitch. Awarded on request from any
//   authenticated user.
//
// - VERIFIED: checked against the profile's actual saved row before
//   awarding, so calling this endpoint directly (bypassing the UI)
//   can't self-grant something that isn't true.
// =============================================

import { createClient } from '@supabase/supabase-js';
import { loadAchievementIds, award } from './lib/achievements.mjs';

const SELF_REPORTED_KEYS = new Set(['used_raid_finder', 'feeling_lucky', 'playing_the_field']);
const VERIFIED_KEYS = new Set(['profile_setup', 'full_house', 'told_us_vibe']);

function meetsProfileSetup(p) {
    return !!(p.avatar_url && p.bio && p.timezone && p.genres && p.genres.length > 0);
}

function meetsFullHouse(p) {
    return !!(p.twitch_url && p.youtube_url && p.kick_url && p.rumble_url && p.tiktok_url && p.velora_url);
}

function meetsToldUsVibe(p) {
    return !!(p.vibes && p.vibes.length > 0);
}

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing required environment variables');
        return new Response('Missing config', { status: 500 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response('Invalid JSON body', { status: 400 });
    }

    const key = body?.key;
    if (!key || !(SELF_REPORTED_KEYS.has(key) || VERIFIED_KEYS.has(key))) {
        return new Response('Unknown or unsupported achievement key', { status: 400 });
    }

    // Verify the caller actually has a valid session — this is what stops
    // someone from awarding achievements to an arbitrary profile.
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
        return new Response('Missing auth token', { status: 401 });
    }

    // Single service-role client, used both to verify the token (passing
    // the user's JWT explicitly to getUser) and to perform the write —
    // the standard pattern for verifying a user server-side without
    // needing a separate anon-key client.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
        return new Response('Invalid session', { status: 401 });
    }

    if (VERIFIED_KEYS.has(key)) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('avatar_url, bio, timezone, genres, vibes, twitch_url, youtube_url, kick_url, rumble_url, tiktok_url, velora_url')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError || !profile) {
            return new Response('Profile not found', { status: 404 });
        }

        const meetsCondition =
            (key === 'profile_setup' && meetsProfileSetup(profile)) ||
            (key === 'full_house' && meetsFullHouse(profile)) ||
            (key === 'told_us_vibe' && meetsToldUsVibe(profile));

        if (!meetsCondition) {
            // Not an error — the frontend calls this opportunistically after
            // every profile save, whether or not the condition is met yet.
            return new Response(JSON.stringify({ awarded: false, reason: 'condition not met' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    const achievementIds = await loadAchievementIds(supabase);
    const newlyAwarded = await award(supabase, achievementIds, user.id, key);

    return new Response(JSON.stringify({ awarded: newlyAwarded }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
