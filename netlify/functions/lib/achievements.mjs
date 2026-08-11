// =============================================
// SHARED ACHIEVEMENT HELPERS
//
// Used by both the scheduled poller (check-live-status.mjs) and the
// client-triggered award endpoint (award-achievement.mjs). Achievements
// are always written with the service role key — never directly by a
// signed-in user — so they're earned, not self-granted. See
// migration-achievements.sql for the schema and catalog.
// =============================================

// Loads the achievement catalog fresh each call rather than caching
// across invocations — cheap query, and it means a newly-added row in
// the Table Editor is picked up on the very next run without a redeploy.
export async function loadAchievementIds(supabase) {
    const { data, error } = await supabase.from('achievements').select('id, key');
    if (error) {
        console.error('Failed to load achievements catalog:', error.message);
        return new Map();
    }
    return new Map(data.map(a => [a.key, a.id]));
}

// Awards `key` to `profileId`, silently doing nothing if the profile
// already has it (relies on the UNIQUE (profile_id, achievement_id)
// constraint) or if the key isn't in the catalog. Returns true only if
// this call newly awarded it — handy for triggering a toast/animation
// only on first earn, not on every repeat check.
export async function award(supabase, achievementIds, profileId, key) {
    const achievementId = achievementIds.get(key);
    if (!achievementId) {
        console.warn(`Achievement key "${key}" not found in catalog, skipping`);
        return false;
    }

    const { error } = await supabase
        .from('profile_achievements')
        .insert({ profile_id: profileId, achievement_id: achievementId });

    if (!error) return true;

    // 23505 = unique_violation — already earned, not a real error
    if (error.code !== '23505') {
        console.error(`Failed to award "${key}" to ${profileId}:`, error.message);
    }
    return false;
}
