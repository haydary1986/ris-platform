// Content script — injected on https://scholar.google.com/citations*
// Scrapes the visible publications table on a Scholar profile and exposes
// the result via window.postMessage for the popup to consume.

(function () {
  'use strict';

  function parseScholarProfile() {
    const profile = {
      version: 1,
      provider: 'scholar',
      scraped_at: new Date().toISOString(),
      scholar_id: new URL(window.location.href).searchParams.get('user'),
      author: {
        name: document.getElementById('gsc_prf_in')?.textContent?.trim() ?? null,
        affiliation: document.querySelector('.gsc_prf_il')?.textContent?.trim() ?? null,
      },
      publications: [],
    };

    const rows = document.querySelectorAll('#gsc_a_b .gsc_a_tr');
    rows.forEach((row) => {
      const titleEl = row.querySelector('.gsc_a_at');
      const authorsEl = row.querySelectorAll('.gs_gray');
      const yearEl = row.querySelector('.gsc_a_h');
      const citesEl = row.querySelector('.gsc_a_ac');

      if (!titleEl) return;

      const title = titleEl.textContent?.trim();
      const url = titleEl.getAttribute('href');
      const authors = authorsEl[0]?.textContent?.trim() ?? '';
      const venue = authorsEl[1]?.textContent?.trim() ?? '';
      const year = yearEl?.textContent?.trim();
      const cites = citesEl?.textContent?.trim();

      profile.publications.push({
        title,
        authors: authors
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        journal_name: venue || null,
        publication_year: year && /^\d{4}$/.test(year) ? Number(year) : null,
        scholar_citations: cites && /^\d+$/.test(cites) ? Number(cites) : 0,
        url: url ? `https://scholar.google.com${url}` : null,
      });
    });

    return profile;
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.type !== 'RIS_SCRAPE_REQUEST') return;
    const data = parseScholarProfile();
    window.postMessage({ type: 'RIS_SCRAPE_RESULT', data }, window.location.origin);
  });
})();
