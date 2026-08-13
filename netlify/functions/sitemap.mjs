// =============================================
// NOBODYSWATCHING.LIVE — Dynamic sitemap.xml
// Served at /sitemap.xml via a netlify.toml redirect (not scheduled -
// runs on request, same as award-achievement.mjs).
//
// The static pages (home, about, privacy) barely matter for SEO - the
// actual point of a sitemap here is getting every streamer's profile
// page indexed by search engines, since that's a second, free discovery
// path on top of the site's own directory. Profile pages are database-
// driven, so this has to be generated dynamically rather than a static
// file - there's no build step to bake it in at deploy time.
// =============================================

import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://nobodyswatching.live';

// Same anon key already shipped in every page's client-side JS - not a
// secret, and RLS (public read on visible profiles only) is what
// actually enforces what this can see, not the key itself.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuamZ6ZmRyYW9xcHZ5b3BnbGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTkzNzAsImV4cCI6MjA5MDI5NTM3MH0.EchviZ7rgkmO7ixtFuwE8aEPMxu590beO_ww-u0wxxc';

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function urlEntry(loc, changefreq, priority) {
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export default async function handler() {
    const { SUPABASE_URL } = process.env;

    if (!SUPABASE_URL) {
        console.error('Missing SUPABASE_URL');
        return new Response('Missing config', { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const entries = [
        urlEntry(`${SITE_URL}/`, 'daily', '1.0'),
        urlEntry(`${SITE_URL}/about.html`, 'monthly', '0.5'),
        urlEntry(`${SITE_URL}/privacy.html`, 'yearly', '0.3')
        // profile.html deliberately excluded - it's the signed-in owner's
        // own edit form, not public content worth indexing.
    ];

    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('is_visible', true);

        if (error) {
            console.error('Supabase fetch error:', error);
            // Still return the static pages rather than failing outright -
            // a partial sitemap beats a broken one for crawlers.
        } else if (profiles) {
            for (const p of profiles) {
                if (!p.username) continue;
                const loc = `${SITE_URL}/streamer.html?user=${encodeURIComponent(p.username)}`;
                entries.push(urlEntry(loc, 'daily', '0.7'));
            }
        }
    } catch (err) {
        console.error('Unexpected error building sitemap:', err);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

    return new Response(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            // Cached for an hour - crawlers hit this repeatedly, and
            // profile churn is slow enough that this doesn't need to be
            // regenerated on every single request.
            'Cache-Control': 'public, max-age=3600'
        }
    });
}
