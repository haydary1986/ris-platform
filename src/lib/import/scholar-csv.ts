// Parse a Google Scholar profile CSV export (produced via the "Export → CSV"
// button on scholar.google.com/citations?user=…).
//
// The Scholar CSV has columns: Authors, Title, Publication, Volume, Number,
// Pages, Year, Publisher — always in this order, but we match by header name
// to stay resilient. Authors are semicolon-separated within the cell.
//
// Two quirks we guard against:
//   1. UTF-8 BOM at the start of the file.
//   2. Mojibake — UTF-8 bytes rendered as Windows-1252 and re-saved. Common
//      in Scholar exports for non-Latin titles (Arabic, Persian, Chinese).

export interface ScholarCsvRow {
  title: string;
  authors: string[];
  journal_name: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publication_year: number | null;
  publisher: string | null;
}

export interface ScholarCsvParseResult {
  rows: ScholarCsvRow[];
  warnings: string[];
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Detect "UTF-8 read as Windows-1252" mojibake and round-trip to recover.
// Safe no-op if the input is already clean UTF-8.
function fixMojibake(s: string): string {
  if (!s) return s;
  // Heuristic: tell-tale sequences like "Ã¼", "Ø", "Ù", "Ã©" — all start with
  // a high-bit byte that shouldn't appear adjacent in clean text.
  if (!/[\u00C0-\u00FF][\u0080-\u00BF]/.test(s)) return s;
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(s, 'latin1').toString('utf8');
    }
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return s;
  }
}

// RFC 4180 line parser — handles quoted fields, escaped quotes (""), CRLF/LF.
function parseCsvLine(text: string, start: number): { fields: string[]; nextIndex: number } {
  const fields: string[] = [];
  let current = '';
  let i = start;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      current += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      fields.push(current);
      current = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      fields.push(current);
      return { fields, nextIndex: i + 1 };
    }
    if (ch === '\r') {
      fields.push(current);
      return { fields, nextIndex: text[i + 1] === '\n' ? i + 2 : i + 1 };
    }
    current += ch;
    i++;
  }
  fields.push(current);
  return { fields, nextIndex: i };
}

export function parseScholarCsv(input: string): ScholarCsvParseResult {
  const warnings: string[] = [];
  const text = stripBom(input);
  if (!text.trim()) {
    return { rows: [], warnings: ['empty file'] };
  }

  const headerLine = parseCsvLine(text, 0);
  const headers = headerLine.fields.map((h) => h.trim().toLowerCase());

  const expected = [
    'authors',
    'title',
    'publication',
    'volume',
    'number',
    'pages',
    'year',
    'publisher',
  ] as const;
  const missing = expected.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    warnings.push(`missing columns: ${missing.join(', ')}`);
  }

  const idxOf = (name: string): number => headers.indexOf(name);

  const rows: ScholarCsvRow[] = [];
  let pos = headerLine.nextIndex;
  let lineNum = 2;

  while (pos < text.length) {
    const line = parseCsvLine(text, pos);
    pos = line.nextIndex;
    // skip blank lines
    if (line.fields.length === 1 && (line.fields[0] ?? '').trim() === '') {
      lineNum++;
      continue;
    }

    const cell = (name: string): string => {
      const i = idxOf(name);
      if (i < 0 || i >= line.fields.length) return '';
      return fixMojibake((line.fields[i] ?? '').trim());
    };

    const title = cell('title');
    if (!title) {
      warnings.push(`line ${lineNum}: skipped (no title)`);
      lineNum++;
      continue;
    }

    const authorsRaw = cell('authors');
    const authors = authorsRaw
      .split(';')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const yearRaw = cell('year');
    const year = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;

    rows.push({
      title,
      authors,
      journal_name: cell('publication') || null,
      volume: cell('volume') || null,
      issue: cell('number') || null,
      pages: cell('pages') || null,
      publication_year: year,
      publisher: cell('publisher') || null,
    });
    lineNum++;
  }

  return { rows, warnings };
}
