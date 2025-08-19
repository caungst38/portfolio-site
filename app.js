
// Utility: map tag -> color
const tagPalette = [
  "#00ffc8","#6cf1ff","#ffd166","#a78bfa","#f472b6","#34d399","#60a5fa","#f59e0b","#fb7185"
];
const tagColorMap = new Map();
function colorFor(tag){
  const key = tag.toLowerCase();
  if (!tagColorMap.has(key)) {
    tagColorMap.set(key, tagPalette[tagColorMap.size % tagPalette.length]);
  }
  return tagColorMap.get(key);
}

// Flags from country code (alpha-2) -> emoji
function flagEmoji(cc) {
  if (!cc || cc.length !== 2) return "🏳️";
  const A = 0x1F1E6;
  const a = cc.toUpperCase();
  return String.fromCodePoint(A + (a.charCodeAt(0)-65)) + String.fromCodePoint(A + (a.charCodeAt(1)-65));
}

async function loadJSON(url){
  const r = await fetch(url, {cache:"no-store"});
  return r.json();
}

function byId(id){ return document.getElementById(id); }

// Build dropdowns and project grids
async function hydrateProjects(){
  const data = await loadJSON("projects.json");
  const sections = [
    { key: "general", gridId: "general-grid", menuId: "menu-general" },
    { key: "security", gridId: "security-grid", menuId: "menu-security" },
  ];
  for (const sec of sections) {
    const arr = data[sec.key] || [];
    const grid = byId(sec.gridId);
    const menu = byId(sec.menuId);
    grid.innerHTML = "";
    menu.innerHTML = "";

    arr.forEach(p => {
      // Card
      const card = document.createElement("article");
      card.className = "project-card";
      card.id = p.id;
      const img = document.createElement("img");
      img.src = p.image || "assets/images/projects/placeholder-project.webp";
      img.alt = p.title;
      const title = document.createElement("div");
      title.className = "proj-title";
      title.textContent = p.title;
      const summary = document.createElement("div");
      summary.className = "proj-summary";
      summary.textContent = p.summary || "";
      const tags = document.createElement("div");
      tags.className = "tags";
      (p.tags || []).forEach(t => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        span.style.background = colorFor(t) + "22";
        span.style.borderColor = colorFor(t);
        span.style.color = colorFor(t);
        tags.appendChild(span);
      });

      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(summary);
      card.appendChild(tags);
      grid.appendChild(card);

      // Menu item (anchors to card)
      const a = document.createElement("a");
      a.href = `#${p.id}`;
      a.textContent = p.title;
      a.onclick = () => {
        // close dropdown quickly
        setTimeout(()=>menu.style.display="none", 50);
      };
      menu.appendChild(a);

      // External links open new tab if provided (optional "Learn more" pattern)
      if (p.links && p.links.github) {
        const ext = document.createElement("a");
        ext.href = p.links.github;
        ext.textContent = "GitHub";
        ext.target = "_blank";
        menu.appendChild(ext);
      }
    });
  }
}

// Client stats
function detectBrowser(){
  const ua = navigator.userAgent;
  let name = "Unknown", ver = "";
  const match = ua.match(/(Edg|Chrome|Firefox|Safari)\/(\d+)/);
  if (match){ name = match[1].replace("Edg","Edge"); ver = match[2]; }
  return `${name} ${ver}`;
}
function detectDevice(){
  const w = Math.max(window.screen.width, window.innerWidth);
  const h = Math.max(window.screen.height, window.innerHeight);
  const ua = navigator.userAgent.toLowerCase();
  if (/mobi|android|iphone|ipad/.test(ua)) return "Mobile";
  if (w >= 1366 && h >= 768) return "Desktop/Laptop";
  return "Desktop/Laptop";
}
function isSecure(){ return location.protocol === "https:"; }

async function checkHeaders(){
  try {
    const r = await fetch(location.href, { method:"HEAD", cache:"no-store" });
    const headers = ["content-security-policy","strict-transport-security","x-content-type-options","x-frame-options","x-xss-protection","referrer-policy"];
    const present = [];
    headers.forEach(h => {
      const v = r.headers.get(h);
      if (v) present.push(`${h}: ${v}`);
    });
    return present.length ? present : ["No common security headers detected (HEAD)."];
  } catch(e){
    return ["Unable to read headers in this context."];
  }
}

async function hydrateStats(){
  // Client cards
  byId("stat-browser").textContent = detectBrowser();
  byId("stat-device").textContent = detectDevice();
  const lock = byId("stat-https-lock");
  lock.textContent = isSecure() ? "Encrypted" : "Not Encrypted";
  lock.style.color = isSecure() ? "var(--ok)" : "var(--error)";
  lock.previousElementSibling.textContent = isSecure() ? "🔒" : "🔓";
  const headers = await checkHeaders();
  byId("stat-headers").innerHTML = headers.map(h=>`<div>${h}</div>`).join("");

  // Server cards
  try {
    const res = await loadJSON("/.netlify/functions/cf-stats?days=30");
    if (res && res.ok) {
      byId("stat-requests").textContent = (res.requests_7d ?? 0).toLocaleString();
      const waf = res.waf_blocked_7d ?? 0;
      byId("stat-waf").textContent = waf ? waf.toLocaleString() : "No blocked events in 7d";
      const top = res.top_countries_30d || [];
      const list = byId("stat-countries");
      list.innerHTML = "";
      top.forEach((row, idx) => {
        const cc = row.country || "UN";
        const li = document.createElement("div");
        li.textContent = `${idx+1}. ${flagEmoji(cc)} ${cc} — ${row.requests.toLocaleString()}`;
        list.appendChild(li);
      });
      if (!top.length) {
        list.textContent = "No country breakdown available.";
      }
    } else {
      byId("stat-requests").textContent = "Unavailable";
      byId("stat-waf").textContent = "Unavailable";
      byId("stat-countries").textContent = "Unavailable";
    }
  } catch(e){
    byId("stat-requests").textContent = "Error";
    byId("stat-waf").textContent = "Error";
    byId("stat-countries").textContent = "Error";
  }

  // Lighthouse (optional)
  try {
    const r = await loadJSON("/.netlify/functions/netlify-lighthouse");
    const lh = r && r.enabled ? r.scores : null;
    const elem = byId("stat-lighthouse");
    if (!lh) {
      elem.textContent = "Connect Netlify API for Lighthouse scores.";
    } else {
      elem.innerHTML = ["performance","accessibility","best_practices","seo","pwa"].map(k=>{
        const score = lh[k] ?? 0;
        return `<div>${k.replace("_"," ").toUpperCase()}: <strong>${score}</strong></div>`;
      }).join("");
    }
  } catch(e){
    byId("stat-lighthouse").textContent = "Unavailable";
  }
}

function hydrateContactMenus(){
  const contactMenu = document.getElementById("menu-contact");
  contactMenu.innerHTML = "";
  const links = [
    {text:"LinkedIn", href:"https://www.linkedin.com/in/connyr-aungst"},
    {text:"GitHub", href:"https://github.com/caungst38"},
    {text:"Email", href:"mailto:you@connyraungst.com"}
  ];
  links.forEach(l=>{
    const a = document.createElement("a");
    a.href = l.href; a.textContent = l.text; a.target="_blank"; a.rel="noopener noreferrer";
    contactMenu.appendChild(a);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await hydrateProjects();
  hydrateContactMenus();
  hydrateStats();

  // Ensure hero headshot fallback matches About path
  const hero = document.querySelector("#hero-headshot");
  if (hero) {
    hero.addEventListener("error", () => {
      hero.src = "assets/images/headshot.jpg";
    });
  }
});
