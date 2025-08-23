# Index Patch — v38.2 (About Photo only)

This pack **updates your existing `index.html` in place** to switch the *About Me* image to a new file, leaving the **Hero** headshot untouched.

## What’s included
- `assets/images/about-photo.webp`
- `assets/images/about-photo@2x.webp`
- `assets/images/about-photo.png`
- `scripts/apply-v38.2-about-photo.ps1` — PowerShell patcher

## Steps
1. Copy the `assets/` folder into your repo root (so the images live at `assets/images/`).
2. From the repo root, run:
   ```powershell
   .\scriptspply-v38.2-about-photo.ps1 -IndexPath .\index.html -Backup
   ```
   This will replace only the `<picture class="about-photo">...</picture>` block.

3. Verify locally, then push to main:
   ```powershell
   git add assets/images/about-photo.webp assets/images/about-photo@2x.webp assets/images/about-photo.png index.html
   git commit -m "v38.2: About photo updated (Hero unchanged)"
   git tag -a v38.2 -m "About photo decoupled from Hero"
   git push origin main --follow-tags
   ```

If you prefer a pre‑patched `index.html`, upload your current `index.html` and I’ll return a fully updated version.