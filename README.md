# NobodysWatching.live

**Where small streamers get seen.**

A free discovery directory for small streamers. No algorithm. No follower requirements. No data harvesting. Just a place where every streamer gets listed equally.

🔗 **[nobodyswatching.live](https://nobodyswatching.live)**

*The name's ironic. We hope.*

---

## What is this?

NobodysWatching.live is a streamer directory built for the people Twitch's algorithm forgot. Sign in, build a profile, link your channels, and you're listed alongside everyone else - regardless of follower count or viewer numbers.

When you go live on Twitch, Kick, or YouTube, the site detects it automatically and puts you in the Live Now carousel. Viewers can browse by genre, timezone, or hit the Random Streamer button and discover someone by chance.

## Features

- **Equal listing** — every streamer appears the same, no sorting by popularity
- **Multi-platform live detection** — Twitch, Kick, and YouTube checked every 3 minutes
- **Sign in with Twitch or Google** — one click, no forms, no email collection
- **Streamer profiles** — bio, genres, top games, timezone, shareable profile pages
- **Five platform links** — Twitch, YouTube, Kick, Rumble, TikTok
- **Genre & timezone filtering** — find streamers who play what you like, when you're awake
- **Random Streamer button** — discover someone new by pure chance
- **Badge system** — Founder, Tester, OG, Supporter badges for early adopters
- **Streamer Pack** — downloadable Twitch panel image and copy-paste promo text
- **Auto-scrolling live carousel** — with mouse drag and touch swipe support
- **Mobile responsive** — works on everything from phones to ultrawide monitors

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML / CSS / JS |
| Hosting | Netlify (free tier) |
| Database | Supabase (free tier, Europe region) |
| Auth | Twitch OAuth + Google OAuth via Supabase |
| Live Detection | Netlify Scheduled Function (every 3 min) |
| APIs | Twitch Helix, YouTube Data API v3, Kick public API |
| Domain | IONOS (~£4.50/year) |

No frameworks. No build step. No bloat. Push to GitHub, Netlify deploys automatically.

## Project Structure

```
nobodyswatching-site/
├── netlify.toml                        # Netlify config (publish=public)
├── package.json                        # @supabase/supabase-js dependency
├── CHANGELOG.md                        # Release history
├── public/
│   ├── index.html                      # Homepage, directory, live carousel
│   ├── profile.html                    # Profile editor
│   ├── streamer.html                   # Public streamer profile page
│   ├── about.html                      # About + Streamer Pack
│   ├── privacy.html                    # Privacy policy
│   ├── favicon.svg                     # Site favicon
│   └── twitch-panel.png               # Downloadable Twitch panel image
└── netlify/functions/
    └── check-live-status.mjs           # Multi-platform live polling
```

## How It Works

1. User signs in via Twitch or Google OAuth (handled by Supabase)
2. A profile row is auto-created in Supabase with their username and avatar
3. User fills out their profile: bio, timezone, genres, top games, platform links
4. A scheduled Netlify function runs every 3 minutes:
   - Fetches all profiles with linked streaming platforms
   - Checks Twitch API, Kick API, and YouTube API for live status
   - Updates `is_live`, `live_game`, `live_viewer_count`, `live_thumbnail_url`, and `live_platform`
5. The homepage queries Supabase and renders the live carousel and directory grid
6. Everything is client-side — no server rendering, no build step

## Privacy

We take a minimal approach to data:

- **Stored:** username, avatar URL, bio, timezone, genres, games, platform links, live status
- **Not stored:** email, real name, location, IP address, browsing activity
- **No tracking:** no Google Analytics, no Facebook Pixel, no cookies beyond auth
- **Full policy:** [nobodyswatching.live/privacy.html](https://nobodyswatching.live/privacy.html)

## Local Development

If you want to run this locally:

1. Clone the repo
2. `npm install`
3. Set up a Supabase project and create the `profiles` table (see schema below)
4. Add your Supabase URL and anon key to the frontend JS
5. Set environment variables for the scheduled function:
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `YOUTUBE_API_KEY` (optional)
6. `npx netlify dev` to run locally

## Database Schema

The `profiles` table in Supabase:

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | FK to auth.users |
| username | TEXT | Display name |
| avatar_url | TEXT | Profile picture URL |
| bio | TEXT | Max 250 chars |
| timezone | TEXT | e.g. "UTC+00:00" |
| genres | TEXT[] | Array of genre tags |
| top_games | TEXT[] | Up to 5 games |
| twitch_username | TEXT | Extracted from Twitch OAuth |
| twitch_url | TEXT | Twitch channel URL |
| youtube_url | TEXT | YouTube channel URL |
| kick_url | TEXT | Kick channel URL |
| rumble_url | TEXT | Rumble channel URL |
| tiktok_url | TEXT | TikTok profile URL |
| is_live | BOOLEAN | Updated by scheduled function |
| live_game | TEXT | Current game/title when live |
| live_viewer_count | INTEGER | Current viewer count |
| live_thumbnail_url | TEXT | Stream thumbnail |
| live_platform | TEXT | Which platform they're live on |
| last_live_at | TIMESTAMP | Last time they were detected live |
| badges | TEXT[] | e.g. {"Founder", "OG"} |
| created_at | TIMESTAMP | Auto-set on insert |
| updated_at | TIMESTAMP | Auto-updated |

RLS is enabled: public read, owner-only write. A database trigger auto-creates a profile row on first sign-in.

## Contributing

This is a solo project but feedback is welcome. If you find a bug or have a feature idea:

- Open an issue on this repo
- Drop into the [Discord](https://discord.gg/MxD634NBsn)
- Message me on [Twitch](https://twitch.tv/x_taptap_x) or [Bluesky](https://bsky.app/profile/xtaptapx.bsky.social)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

## Licence

This project is open source. Built by a small streamer, for small streamers.

---

*Built by [x_TapTap_x](https://twitch.tv/x_taptap_x) — 56 years old, still rushing B, still getting bodied.*
