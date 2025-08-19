# v38.1 — Headshot Hotfix Pack

This pack promotes your site from **v38** to **v38.1** with a *single, surgical change* that guarantees the headshot renders in **production**.

## What changed
- Adds **/public/images/headshot.webp** (+ PNG fallback) so the asset is always present in the publish directory.
- Provides a **<picture>** snippet that references **/images/headshot.webp** (works in static/Vite/Next.js).
- Includes a minimal **_headers** file to ensure CSP allows images: `img-src 'self' data: https:`.
- Adds a verifier page at **/tools/verify-headshot.html** to test on the live domain.

## How to apply
1. **Merge** the contents of this zip into your **v38 project root** (do not remove other files).
2. **Ensure your hero section** uses the `/images/headshot.webp` path.
   - If you already reference a different path, replace with the snippet in `snippets/hero-picture-snippet.html` (for HTML) or `snippets/hero-picture-snippet.jsx` (for React).
3. If you already have a Netlify headers setup, **merge** the `img-src` directive from the provided `_headers` file instead of replacing your own.
4. **Deploy** to Netlify.
5. Visit **/tools/verify-headshot.html** on your live domain. If you see "Image loaded successfully," you're good.

## Notes
- Replace the placeholder image at `public/images/headshot.webp` with your real headshot when ready (keep the same filename/case).
- This pack does not modify styles, layout, or any other content. It is designed to be **safe** and **minimal**.
- If your framework uses a different *public* folder, move `public/images/` into the correct static assets directory for your build.