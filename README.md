# v38.3.15 — Align About text with the top of the photo

**Fix**
The first paragraph in the About text had a default top margin, so it sat lower than the photo.  
This CSS-only patch:
- Forces grid items to align to the **top** (`align-items: start`).
- Sets the photo to `align-self: start`.
- Removes any top padding on the text column.
- Removes the default top margin on the **first child** inside `.about-body`.

**Apply**
```powershell
git add style.css
git commit -m "v38.3.15: Align About text top with photo top (CSS-only)"
git push origin main
```