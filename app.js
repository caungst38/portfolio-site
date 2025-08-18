async function loadStats(){
  try{
    const r = await fetch('/.netlify/functions/cf-stats');
    const j = await r.json();
    if(!j.enabled) throw new Error(j.reason||'disabled');
    const countries = document.getElementById('topCountries');
    if(countries){
      const arr = j.top_countries_24h||[];
      if(!arr.length){ (countries.closest('.card')||countries).style.display='none'; }
      else{
        countries.innerHTML = arr.slice(0,5).map(c=>`<span class="pill">${c.country} · ${Number(c.count||0).toLocaleString()}</span>`).join(' ');
      }
    }
    const rl = document.getElementById('rateLimited');
    if(rl){
      const data = j.rate_limited_24h;
      if(!data){ (rl.closest('.card')||rl).style.display='none'; }
      else{
        const list = (data.actions||[]).slice(0,4).map(a=>`<span class="pill">${a.action} · ${Number(a.count||0).toLocaleString()}</span>`).join(' ');
        rl.innerHTML = `Total: ${Number(data.total||0).toLocaleString()}${list?' · '+list:''}`;
      }
    }
  }catch(e){
    for(const id of ['topCountries','rateLimited']){
      const el=document.getElementById(id);
      if(el) (el.closest('.card')||el).style.display='none';
    }
  }
}
document.addEventListener('DOMContentLoaded', loadStats);


// v29: If a #cf-stats container exists, fetch analytics from the Netlify function and render minimal UI.
async function hydrateCfStats() {
  const root = document.querySelector('#cf-stats');
  if (!root) return;
  try {
    root.innerHTML = 'Loading analytics…';
    const resp = await fetch('/.netlify/functions/cf-stats?days=7');
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'Failed to load stats');
    const fmt = new Intl.NumberFormat();
    const kib = (n)=> (n/1024).toFixed(1)+' KiB';
    const mib = (n)=> (n/1024/1024).toFixed(1)+' MiB';
    const gib = (n)=> (n/1024/1024/1024).toFixed(2)+' GiB';
    const bytesFmt = (n)=> n>1e9 ? gib(n) : n>1e6 ? mib(n) : kib(n);

    const totalsHtml = `
      <div class="stats-cards">
        <div class="card"><div class="label">Requests (last ${data.rangeDays}d)</div><div class="value">${fmt.format(data.totals.requests)}</div></div>
        <div class="card"><div class="label">Bandwidth</div><div class="value">${bytesFmt(data.totals.bytes)}</div></div>
        <div class="card"><div class="label">Threats</div><div class="value">${fmt.format(data.totals.threats)}</div></div>
      </div>`;

    let countryRows = (data.topCountries || []).map(r => `<tr><td>${r.country||'—'}</td><td class="num">${fmt.format(r.requests||0)}</td></tr>`).join('');
    if (!countryRows) countryRows = '<tr><td colspan="2">No data</td></tr>';

    const tableHtml = `
      <div class="stats-tables">
        <div class="card">
          <div class="label">Top Countries</div>
          <table class="mini">
            <thead><tr><th>Country</th><th class="num">Req</th></tr></thead>
            <tbody>${countryRows}</tbody>
          </table>
        </div>
      </div>`;

    root.innerHTML = totalsHtml + tableHtml;
  } catch (err) {
    root.innerHTML = `<div class="error">Analytics unavailable: ${err.message}</div>`;
  }
}
document.addEventListener('DOMContentLoaded', hydrateCfStats);
