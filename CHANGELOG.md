# Changelog

All notable changes to NobodysWatching.live are documented here.

---

## [2026-04-08] — Additional Functionality added from feedback

### Added
- Expanded genres (profile.html + index.html) — 12 new categories added: Roguelike, Simulation, MMORPG, Fighting, Puzzle, Retro, Art, Music, Just Chatting, Makers & Crafting, Cooking, and IRL. Both the profile checkboxes and the homepage filter buttons are updated. Existing profiles keep their current genres — the new options just appear alongside them.

- Random re-roll button (streamer.html) — A "🎲 Discover Another Streamer" button sits below the share section on every streamer profile page. Clicking it loads a random different streamer (it excludes the one you're currently viewing). Gold hover effect matching the Random button on the homepage. No more navigating back to the directory to re-roll.

- Bio line breaks (index.html + streamer.html) — Newlines in bios now render as <br> tags on both the directory cards and the streamer profile page. The text is still escaped first via esc() so there's no HTML injection risk — we escape everything, then convert \n to <br>. The profile form already uses a textarea, so people can just hit Enter to add line breaks.

- Spotlight section (index.html) — When anyone's live, the streamer with the fewest viewers gets a prominent "⭐ Spotlight" card above the carousel. It's got a teal-bordered card with a subtle glow, their thumbnail, username, badges, game, viewer count, and platform pills. The tagline underneath says "👁 X viewers — be the one who changes that". On mobile it stacks vertically. This directly addresses feedback #9 — it grabs attention better than the carousel alone and gives the smallest streamers the biggest visibility.

- Viewer cap on carousel (index.html) — Streamers with more than 75 viewers are hidden from the live carousel. They're still on the site, still in the directory, still have their profile page — they just don't take up carousel space that could go to someone smaller. 75 felt right as a starting point — high enough that growing streamers don't feel punished, low enough to keep the carousel true to its mission. Easy to adjust the VIEWER_CAP constant if you want to change it later.

- Rerun filter (check-live-status.mjs) — The polling function now skips Twitch streams where type is anything other than "live" (catches reruns at the API level), and also checks tags for "rerun" or "rebroadcast" as a belt-and-braces measure. So rerun channels won't appear in the live carousel anymore.
  
---

## [2026-04-08] — TikTok Platform Support

### Added
- TikTok as a platform link option on streamer profiles
- TikTok pink pill on directory cards and live carousel
- TikTok link card on individual streamer profile pages

---

## [2026-04-07] — Google Sign-In, Rumble, Auto-Scroll Carousel

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

## [2026-04-04] — Platform Pills, Bio Overflow Fix

### Added
- Clickable platform pills on live carousel cards (Twitch, YouTube, Kick)
- Viewers can jump directly to their preferred platform from live cards

### Fixed
- Bio text overflow on streamer cards and profile pages (long unbroken strings)
- Streamer page container overflow on desktop

---

## [2026-04-03] — Badges, Random Streamer, Multi-Platform Live Detection

### Added
- Badge system: Founder, Tester, OG, Supporter — displayed as coloured pills next to usernames
- Random Streamer button in directory filters
- Kick live detection via unofficial API (no auth required)
- YouTube live detection via YouTube Data API v3 (optional, requires API key)
- Multi-platform priority system: Twitch > Kick > YouTube for live status
- "+ Add" button for game tags on profile (fixes mobile keyboard issue)

### Changed
- Live polling function now checks Twitch, Kick, and YouTube in parallel
- Game tag input improved for mobile compatibility

---

## [2026-04-02] — Mobile Fixes, Nav Dropdown, Discord Link

### Fixed
- Mobile layout broken by hero/CTA glow effects (overflow:hidden on sections)
- Nav sign-in button disappearing on mobile (glow causing invisible overflow)
- Nav dropdown menu clipped on desktop (removed overflow:hidden from nav)
- Discord invite link updated to non-expiring link

---

## [2026-03-30] — Launch

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
