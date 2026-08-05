# Changelog

All notable changes to NobodysWatching.live are documented here.

---

## [2026-05-08] - Additional Functionality added from feedback

### BUG FIXES
- Amended to remove Kick Live Status checking as this is being blocked by the API. Changing YouTube approach to use the free redirect-based live detection as we're burning through API credits now that numbers have increased.

### Added
- What I've fixed: changed the select('*') to only pull the ~20 columns the homepage actually renders (username, bio, platform links, live status, etc.) instead of everything including unused fields. Small optimisation, but it reduces the payload size and read cost on every single visit.

- VTuber added to both the profile checkboxes and the homepage genre filter.

- Profile form has a new "Preferred Platform" dropdown that only shows platforms they've actually linked (updates live as they type URLs), so someone like TheJiggyJoe could set YouTube as preferred even though Twitch normally wins by default.

- Streamer page shows the "Also live on" band exactly like the mockup - nested inside the same red-tinted live banner card, dot-plus-pill styling, only appears when someone's genuinely multi-streaming.

- Directory and carousel cards now use a single shared pill-rendering system across the board - spotlight, carousel, and grid all call the same helper. Live platforms get solid colour fills with a dot; linked-but-offline platforms get the muted outline treatment with a muted dot, exactly matching what we mocked up together. As a bonus, the directory grid cards' platform badges are now actually clickable too, they were static, non-clickable spans before this, so this is a genuine upgrade for every streamer, not just multi-streamers.

- Cleaned up all the old, now-unused CSS from the previous single-pill system so the stylesheet doesn't carry dead weight.

---

## [2026-04-08] - BUG FIXES

### Bug Fixes
- Updated link to Bluesky from x_TapTap_x profile, to appropriate nobodyswatching.live profile

- The bug: With 3+ live streamers, cards get duplicated and wrapped in a .live-carousel-inner div for the seamless auto-scroll loop. But with 2 or fewer, the code skipped that wrapper entirely - no inner div, no scroll mechanism, cards just sat static and cramped. Worse, our drag/swipe script specifically looks for .live-carousel-inner to attach to, so with no wrapper present, it silently did nothing. You were stuck.
- The fix:
The inner wrapper is now always created, regardless of streamer count
With 3+ live: same as before - duplicated cards, seamless auto-scroll loop
With 1-2 live: no duplication, no auto-scroll animation (nothing to loop), but the drag/swipe script now works properly - you can swipe to see the second card if it's cut off at the edge
The drag logic itself needed updating too - it previously assumed content was always duplicated (used for calculating wrap-around math). Now it detects whether duplication happened and switches between two modes: infinite wrap for 3+ cards, and clamped drag (can't overscroll past the first/last card) for 1-2 cards

- The bug: Spotlight platform pills - these never had colour classes defined (.plat-twitch, .plat-youtube etc. existed for the carousel cards but not for the spotlight card), so they were falling back to default browser link styling - plain blue, underlined. 
- The Fix: They now match the carousel's pill styling exactly: purple for Twitch, red for YouTube, green for Kick, and so on.

- The bug: Viewer count badge contrast 
- The fix: Bumped the background opacity from 0.75 to 0.85, added a subtle border and drop shadow, and gave it z-index: 2 so it always sits clearly above the thumbnail image regardless of how busy or dark the game footage is behind it.

---

## [2026-04-08] - Additional Functionality added from feedback

### Added
- Here's what's new - a proper "Your Identity" section at the top of the profile form, above the bio:
Editable Display Name - text input, max 30 characters, pre-filled with whatever their provider gave us. Hint text specifically calls out the Google/YouTube mismatch issue so people understand why it might be wrong. Live-updates the preview name above as they type.

Editable Avatar URL - paste any direct image link (their YouTube channel photo, Twitch avatar, whatever). Live-updates the preview image too.

Smart subtext - the "Pulled from Twitch. Looking good." line now only shows for Twitch users. Google users get "Pulled from your Google account - edit below if it doesn't match your channel," which directly explains the mismatch rather than leaving them confused.

Validation on save - can't save with an empty display name, and it's capped at 30 characters to prevent layout-breaking usernames.

- #11 - Rerun fallback spotlight. The polling function no longer discards reruns entirely - it tags them with is_rerun: true instead. The carousel still excludes reruns completely (never shown there). But the spotlight now has smart fallback logic: if anyone's genuinely live, spotlight picks the lowest-viewer genuine streamer as before. If nobody is genuinely live, it falls back to the rerun with the fewest viewers, with a clearly different label (↻ Nothing live - here's a rerun), a muted grey border instead of teal, and honest copy explaining it's replaying old content. Nobody gets misled into thinking a rerun is a live stream.

- #12 - Watch Now button colour. Now dynamically matches whichever platform they're actually live on - purple for Twitch, red for YouTube, kick-green for Kick. If they're offline, it colours based on their primary linked platform instead.

- #13 - Genres and platforms. Added Story Games and Rhythm Games to both the profile checkboxes and homepage filters. Added Velora as new platform link fields, following the same pattern as Rumble/TikTok.

- #14 - Viewer count on directory cards. Live streamers now show 👁 X viewers in their card meta line on the main directory grid, regardless of whether they're under the 75-viewer carousel cap. So a streamer with 200 viewers still shows their live status and count on their card, they just won't appear in the carousel itself.

- Added search bar so that the user can search for a game rather than a Genre i.e. Minecraft

- Added Language options for the Streamer profile. You can write your BIO in any language you wish and now find streamers in any language simply by selecting it on the front page.

- Expanded genres (profile.html + index.html) - 12 new categories added: Roguelike, Simulation, MMORPG, Fighting, Puzzle, Retro, Art, Music, Just Chatting, Makers & Crafting, Cooking, and IRL. Both the profile checkboxes and the homepage filter buttons are updated. Existing profiles keep their current genres - the new options just appear alongside them.

- Random re-roll button (streamer.html) - A "🎲 Discover Another Streamer" button sits below the share section on every streamer profile page. Clicking it loads a random different streamer (it excludes the one you're currently viewing). Gold hover effect matching the Random button on the homepage. No more navigating back to the directory to re-roll.

- Bio line breaks (index.html + streamer.html) - Newlines in bios now render as <br> tags on both the directory cards and the streamer profile page. The text is still escaped first via esc() so there's no HTML injection risk - we escape everything, then convert \n to <br>. The profile form already uses a textarea, so people can just hit Enter to add line breaks.

- Spotlight section (index.html) - When anyone's live, the streamer with the fewest viewers gets a prominent "⭐ Spotlight" card above the carousel. It's got a teal-bordered card with a subtle glow, their thumbnail, username, badges, game, viewer count, and platform pills. The tagline underneath says "👁 X viewers - be the one who changes that". On mobile it stacks vertically. This directly addresses feedback #9 - it grabs attention better than the carousel alone and gives the smallest streamers the biggest visibility.

- Viewer cap on carousel (index.html) - Streamers with more than 75 viewers are hidden from the live carousel. They're still on the site, still in the directory, still have their profile page - they just don't take up carousel space that could go to someone smaller. 75 felt right as a starting point - high enough that growing streamers don't feel punished, low enough to keep the carousel true to its mission. Easy to adjust the VIEWER_CAP constant if you want to change it later.

- Rerun filter (check-live-status.mjs) - The polling function now skips Twitch streams where type is anything other than "live" (catches reruns at the API level), and also checks tags for "rerun" or "rebroadcast" as a belt-and-braces measure. So rerun channels won't appear in the live carousel anymore.
  
---

## [2026-04-08] - TikTok Platform Support

### Added
- TikTok as a platform link option on streamer profiles
- TikTok pink pill on directory cards and live carousel
- TikTok link card on individual streamer profile pages

---

## [2026-04-07] - Google Sign-In, Rumble, Auto-Scroll Carousel

### Added
- Google OAuth as alternative sign-in method (for YouTube-primary streamers)
- Sign-in modal with Twitch and Google options
- Rumble as a platform link option
- Live carousel auto-scrolls with mouse drag / touch swipe support
- Carousel pauses on hover, resumes after 3 seconds
- Streamer Pack section on About page (panel image, copy-paste text, chat command, social bio)
- Twitch panel image (320x100) available for download

### Changed
- Privacy policy updated for YouTube API Services compliance
- "How It Works" section updated to mention both sign-in providers
- Identity linking enabled in Supabase (same email = same account across providers)

---

## [2026-04-04] - Platform Pills, Bio Overflow Fix

### Added
- Clickable platform pills on live carousel cards (Twitch, YouTube, Kick)
- Viewers can jump directly to their preferred platform from live cards

### Fixed
- Bio text overflow on streamer cards and profile pages (long unbroken strings)
- Streamer page container overflow on desktop

---

## [2026-04-03] - Badges, Random Streamer, Multi-Platform Live Detection

### Added
- Badge system: Founder, Tester, OG, Supporter - displayed as coloured pills next to usernames
- Random Streamer button in directory filters
- Kick live detection via unofficial API (no auth required)
- YouTube live detection via YouTube Data API v3 (optional, requires API key)
- Multi-platform priority system: Twitch > Kick > YouTube for live status
- "+ Add" button for game tags on profile (fixes mobile keyboard issue)

### Changed
- Live polling function now checks Twitch, Kick, and YouTube in parallel
- Game tag input improved for mobile compatibility

---

## [2026-04-02] - Mobile Fixes, Nav Dropdown, Discord Link

### Fixed
- Mobile layout broken by hero/CTA glow effects (overflow:hidden on sections)
- Nav sign-in button disappearing on mobile (glow causing invisible overflow)
- Nav dropdown menu clipped on desktop (removed overflow:hidden from nav)
- Discord invite link updated to non-expiring link

---

## [2026-03-30] - Launch

### Added
- Homepage with hero, live carousel, directory, "How It Works", CTA, stats bar
- Twitch OAuth sign-in
- Profile creation and editing (bio, timezone, genres, top games, platform links)
- Live directory with genre and timezone filters
- Twitch live status polling every 3 minutes via Netlify Scheduled Functions
- Public streamer profile pages with shareable URLs
- About page and Privacy policy
- Favicon (circle + dot + status bar motif)
- OG meta tags for social sharing
- Dark theme with teal/cyan accents, JetBrains Mono section markers
- Custom domain: nobodyswatching.live
