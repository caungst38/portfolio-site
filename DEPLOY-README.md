
# Deploy (push to main)

1. Ensure you are on `main` and up-to-date:
   ```bash
   git checkout main
   git pull
   ```

2. Copy these files into your repo root (overwrite):
   - `index.html`
   - `style.css`
   - `app.js`
   - `projects.json` (keeps existing General & Security items)
   - `netlify.toml`
   - `netlify/functions/cf-stats.js`
   - `assets/**` (only if new/changed)

3. Commit & push:
   ```bash
   git add -A
   git commit -m "chore: v31 — fix layout, images, and Cloudflare GraphQL function"
   git push origin main
   ```

4. Netlify will build & deploy automatically.
5. Verify the function:
   - `/.netlify/functions/cf-stats?days=7`
