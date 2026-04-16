# RIS Scholar Importer (Chrome MV3)

Exports your Google Scholar publications as a `.mrhenc` file you can upload
on the Manage Profile → Import page.

## Install (developer mode)

1. Visit `chrome://extensions`.
2. Toggle **Developer mode** on.
3. Click **Load unpacked** and select this folder.
4. Pin the extension to your toolbar.

## Use

1. Open your Google Scholar profile (`https://scholar.google.com/citations?user=…`).
2. Scroll the publications table until everything you want to export is visible
   (Scholar lazy-loads — click "Show more" until exhausted).
3. Click the RIS extension icon → **Export publications**.
4. Save the `.mrhenc` file.
5. On the RIS site, go to Manage Profile → Import → Upload `.mrhenc`.

## File format

`.mrhenc` is base64-encoded JSON. The envelope:

```json
{
  "version": 1,
  "provider": "scholar",
  "scraped_at": "ISO 8601",
  "scholar_id": "abc123",
  "author": { "name": "...", "affiliation": "..." },
  "publications": [
    {
      "title": "...",
      "authors": ["..."],
      "journal_name": "...",
      "publication_year": 2024,
      "scholar_citations": 42,
      "url": "https://..."
    }
  ]
}
```

The encoding is obfuscation, not encryption. Real validation happens
server-side: the upload route runs the JSON through Zod and the merge RPC
respects RLS, so a tampered file can only affect the uploader's own row.

## Packaging

```bash
zip -r ris-scholar-importer.zip . -x "*.DS_Store" "README.md"
```

Drop the resulting `ris-scholar-importer.zip` in `public/extension/` of the
Next.js app and the import page's "Download extension (.zip)" button will
serve it.

## Icons

Add `icon-16.png`, `icon-48.png`, and `icon-128.png` here. Without them
Chrome falls back to a default puzzle-piece icon (still functional).
