# Changelog

All notable changes to NobodysWatching.live are documented here.

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
