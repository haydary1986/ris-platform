// Popup UI: asks the active tab's content script for the parsed profile,
// wraps it in the .mrhenc envelope (base64 of JSON — pure obfuscation,
// real validation lives on the server), and downloads it.

const exportBtn = document.getElementById('export');
const out = document.getElementById('out');

exportBtn.addEventListener('click', async () => {
  exportBtn.disabled = true;
  out.className = '';
  out.textContent = 'Scraping…';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.startsWith('https://scholar.google.com/citations')) {
      throw new Error('Open your Google Scholar profile first.');
    }

    const data = await chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: () =>
          new Promise((resolve) => {
            const handler = (e) => {
              if (e.source !== window || e.data?.type !== 'RIS_SCRAPE_RESULT') return;
              window.removeEventListener('message', handler);
              resolve(e.data.data);
            };
            window.addEventListener('message', handler);
            window.postMessage({ type: 'RIS_SCRAPE_REQUEST' }, window.location.origin);
            setTimeout(() => {
              window.removeEventListener('message', handler);
              resolve(null);
            }, 5000);
          }),
      })
      .then((results) => results[0]?.result);

    if (!data) throw new Error('No data — is the publications table loaded?');

    const json = JSON.stringify(data);
    // .mrhenc is base64-encoded JSON — obfuscation only. Server re-parses + zod-validates.
    const encoded = btoa(unescape(encodeURIComponent(json)));
    const blob = new Blob([encoded], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const filename = `ris-scholar-${data.scholar_id ?? 'export'}-${Date.now()}.mrhenc`;
    await chrome.downloads.download({ url, filename, saveAs: true });

    out.className = 'out';
    out.textContent = `Done — ${data.publications.length} publications exported.`;
  } catch (e) {
    out.className = 'err';
    out.textContent = e instanceof Error ? e.message : String(e);
  } finally {
    exportBtn.disabled = false;
  }
});
