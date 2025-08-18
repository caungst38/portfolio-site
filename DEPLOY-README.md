# Deploy guide (Git connected)

1) Extract this bundle into your repo root, overwrite files.
2) Commit & push:
   git add -A
   git commit -m "v26: Cloudflare GraphQL stats + UI + config"
   git push
3) Netlify auto-deploys. Verify function:
   https://<your-domain>/.netlify/functions/cf-stats
