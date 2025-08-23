{/* About Me image (decoupled from Hero). Keeps layout identical; only src changes. */}
<picture>
  <source srcSet="/images/about-photo.webp 1x, /images/about-photo@2x.webp 2x" type="image/webp" />
  <img src="/images/about-photo.png" alt="About photo" loading="lazy" className="rounded-2xl" />
</picture>