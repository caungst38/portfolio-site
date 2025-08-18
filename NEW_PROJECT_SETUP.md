# New Project (Netlify) from this Bundle

## Option A — New Netlify Site (separate project)
1) Create a new GitHub repo (empty), e.g., `portfolio-site-v27`.
2) Extract this entire zip into the repo root and push.
3) In Netlify: **Add new site → Import from Git**, choose the repo.
   - Build command: *(leave blank)*
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
4) In Netlify → Site settings → Environment, add:
   - `CF_API_TOKEN`
   - `CF_ZONE_ID`
   - (optional) `CF_ACCOUNT_ID`
5) Deploy. Health check: `https://<new-domain>/.netlify/functions/cf-stats` should show `"enabled": true`.

## Option B — New subproject folder inside your existing repo
1) Create a folder in your existing repo, e.g., `projects/site-bundle-v27/`.
2) Extract this zip **into that folder**.
3) (Optional) Connect that subfolder as a separate site in Netlify using "Monorepo" setting
   and set Publish directory to `projects/site-bundle-v27` and Functions to `projects/site-bundle-v27/netlify/functions`.

## Notes
- This bundle contains the GraphQL-only Cloudflare function and a minimal netlify.toml.
- Use Git to track and Netlify to deploy. Keep secrets in Netlify Environment variables.
