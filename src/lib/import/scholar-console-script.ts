// Task 101 — Bookmarklet-friendly script that scrapes a Scholar profile
// page from the DevTools console and downloads a .mrhenc file with the
// same envelope shape the browser extension uses.
//
// Exposed as a single string so the import page can render it inside a
// <pre> + "Copy script" button.

export const SCHOLAR_CONSOLE_SCRIPT = `(function(){
  if (!location.host.includes('scholar.google.com')) {
    alert('Open your Google Scholar profile first.');
    return;
  }
  var pubs = [];
  document.querySelectorAll('#gsc_a_b .gsc_a_tr').forEach(function(row){
    var t = row.querySelector('.gsc_a_at');
    var grays = row.querySelectorAll('.gs_gray');
    var y = row.querySelector('.gsc_a_h');
    var c = row.querySelector('.gsc_a_ac');
    if (!t) return;
    pubs.push({
      title: (t.textContent||'').trim(),
      authors: ((grays[0]&&grays[0].textContent)||'').split(',').map(function(s){return s.trim();}).filter(Boolean),
      journal_name: (grays[1]&&grays[1].textContent||'').trim() || null,
      publication_year: y && /^\\d{4}$/.test(y.textContent) ? Number(y.textContent) : null,
      scholar_citations: c && /^\\d+$/.test((c.textContent||'').trim()) ? Number(c.textContent) : 0,
      url: t.href || null
    });
  });
  var payload = {
    version: 1,
    provider: 'scholar',
    scraped_at: new Date().toISOString(),
    scholar_id: new URL(location.href).searchParams.get('user'),
    author: {
      name: (document.getElementById('gsc_prf_in')||{}).textContent || null,
      affiliation: (document.querySelector('.gsc_prf_il')||{}).textContent || null
    },
    publications: pubs
  };
  var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  var blob = new Blob([encoded], { type: 'application/octet-stream' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'ris-scholar-' + (payload.scholar_id||'export') + '-' + Date.now() + '.mrhenc';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  console.log('[RIS] exported', pubs.length, 'publications');
})();`;
