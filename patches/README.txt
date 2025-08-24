v38.3.3-v69 PATCH (header & nav)
--------------------------------
Files included:
- patches/style.v69.patch.css  -> Append to the end of your existing style.css
- patches/app.v69.patch.js     -> Append to the end of your existing app.js

Steps:
1) Open your repo.
2) Append 'style.v69.patch.css' to the end of 'style.css'.
3) Append 'app.v69.patch.js' to the end of 'app.js'.
4) Purge Cloudflare cache or bump cache-bust versions in index.html (e.g., style.css?v=6.9, app.js?v=6.9).
5) Commit and push to main.

This patch adds:
- Teal bottom border and soft shadow beneath the header.
- Active nav underline + glow for the section in view.
- Smoother dropdown appearance.
