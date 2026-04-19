// Task 101 — Console script that scrapes a Scholar profile page from the
// DevTools console and downloads a .mrhenc file with the same envelope
// shape the browser extension uses.
//
// IMPORTANT: This script is intended to be pasted into the DevTools
// Console on scholar.google.com. It is NOT a bookmarklet because:
//   1. Google Scholar's CSP silently drops javascript: URL bookmarklets.
//   2. React (on the RIS import page) blocks javascript: URLs as XSS.
// Running from Console bypasses both restrictions.
//
// The script is exposed as a single string so the import page can render
// it inside a <pre> + "Copy script" button.

export const SCHOLAR_CONSOLE_SCRIPT = `(function(){
  if (!location.host.includes('scholar.google.com')) {
    alert('افتح صفحة ملفك في Google Scholar أولاً، ثم أعد تشغيل السكربت.\\n\\nOpen your Google Scholar profile first, then re-run the script.');
    return;
  }
  if (!location.pathname.includes('/citations') || !new URL(location.href).searchParams.get('user')) {
    alert('هذه ليست صفحة ملف شخصي على Scholar.\\nThe URL must look like: scholar.google.com/citations?user=XXXX');
    return;
  }
  var rows = document.querySelectorAll('#gsc_a_b .gsc_a_tr');
  if (rows.length === 0) {
    alert('لم يُعثر على أي منشور. تأكد أن الصفحة محمّلة بالكامل.\\nNo publications found. Make sure the page fully loaded.');
    return;
  }
  var showMore = document.getElementById('gsc_bpf_more');
  if (showMore && !showMore.disabled) {
    var proceed = confirm('وُجد ' + rows.length + ' منشور. زر "SHOW MORE" لا يزال فعّالاً — قد تكون هناك منشورات إضافية.\\n\\nاضغط OK للمتابعة بهذا العدد، أو Cancel للرجوع وضغط SHOW MORE أولاً.\\n\\nFound ' + rows.length + ' publications. "SHOW MORE" is still enabled — there may be more. OK to continue, Cancel to go back.');
    if (!proceed) return;
  }
  var pubs = [];
  rows.forEach(function(row){
    var t = row.querySelector('.gsc_a_at');
    var grays = row.querySelectorAll('.gs_gray');
    var y = row.querySelector('.gsc_a_h');
    var c = row.querySelector('.gsc_a_ac');
    if (!t) return;
    pubs.push({
      title: (t.textContent||'').trim(),
      authors: ((grays[0]&&grays[0].textContent)||'').split(',').map(function(s){return s.trim();}).filter(Boolean),
      journal_name: (grays[1]&&grays[1].textContent||'').trim() || null,
      publication_year: y && /^\\d{4}$/.test((y.textContent||'').trim()) ? Number((y.textContent||'').trim()) : null,
      scholar_citations: c && /^\\d+$/.test((c.textContent||'').trim()) ? Number((c.textContent||'').trim()) : 0,
      url: t.href || null
    });
  });
  var payload = {
    version: 1,
    provider: 'scholar',
    scraped_at: new Date().toISOString(),
    scholar_id: new URL(location.href).searchParams.get('user'),
    author: {
      name: ((document.getElementById('gsc_prf_in')||{}).textContent) || null,
      affiliation: ((document.querySelector('.gsc_prf_il')||{}).textContent) || null
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
  console.log('%c[RIS] exported ' + pubs.length + ' publications', 'color:#16a34a;font-weight:bold');
  console.log('[RIS] author:', payload.author.name, '— scholar_id:', payload.scholar_id);
})();`;
