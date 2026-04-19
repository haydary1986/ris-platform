import { describe, it, expect } from 'vitest';
import { parseScholarCsv, type ScholarCsvRow } from '@/lib/import/scholar-csv';

function firstRow(csv: string): ScholarCsvRow {
  const result = parseScholarCsv(csv);
  const row = result.rows[0];
  if (!row) throw new Error('expected at least one row');
  return row;
}

describe('parseScholarCsv', () => {
  it('strips UTF-8 BOM and parses a single row', () => {
    const csv =
      '\uFEFFAuthors,Title,Publication,Volume,Number,Pages,Year,Publisher\n' +
      '"Doe, Jane",Sample Paper,Nature,10,2,1-5,2024,Springer\n';
    const result = parseScholarCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      title: 'Sample Paper',
      authors: ['Doe, Jane'],
      journal_name: 'Nature',
      volume: '10',
      issue: '2',
      pages: '1-5',
      publication_year: 2024,
      publisher: 'Springer',
    });
  });

  it('splits multiple authors by semicolon and drops empties', () => {
    const csv =
      'Authors,Title,Publication,Volume,Number,Pages,Year,Publisher\n' +
      '"Smith, A; Jones, B; Doe, C; ",Paper,,,,,,\n';
    const row = firstRow(csv);
    expect(row.authors).toEqual(['Smith, A', 'Jones, B', 'Doe, C']);
  });

  it('returns null for missing optional fields, not empty string', () => {
    const csv =
      'Authors,Title,Publication,Volume,Number,Pages,Year,Publisher\n' + '"X",Just a title,,,,,,\n';
    const row = firstRow(csv);
    expect(row.journal_name).toBeNull();
    expect(row.publisher).toBeNull();
    expect(row.publication_year).toBeNull();
  });

  it('rejects non-4-digit years as null', () => {
    const csv =
      'Authors,Title,Publication,Volume,Number,Pages,Year,Publisher\n' +
      '"X",Y,,,,,abc,\n' +
      '"X",Y,,,,,12,\n';
    const result = parseScholarCsv(csv);
    expect(result.rows[0]?.publication_year).toBeNull();
    expect(result.rows[1]?.publication_year).toBeNull();
  });

  it('skips rows without a title and records a warning', () => {
    const csv =
      'Authors,Title,Publication,Volume,Number,Pages,Year,Publisher\n' +
      '"X",,Journal,,,,,\n' +
      '"X",Real title,Journal,,,,,\n';
    const result = parseScholarCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes('line 2'))).toBe(true);
  });

  it('recovers mojibake from the real Scholar sample', () => {
    // Sample row from the user's citations.csv export where a Persian
    // journal name was served as UTF-8 bytes labelled Latin-1.
    const mojibakeJournal = 'Ù¾ÚÙÙØ´ÙØ§ÙÙ Ù¾Ø±Ø¯Ø§Ø²Ø´';
    const csv =
      'Authors,Title,Publication,Volume,Number,Pages,Year,Publisher\n' +
      `"Doe, J",Paper,${mojibakeJournal},40,4,1-28,2025,\n`;
    const row = firstRow(csv);
    const journal = row.journal_name ?? '';
    expect(journal).not.toContain('Ù');
    expect(journal).not.toContain('Ø');
    expect(/[\u0600-\u06FF]/.test(journal)).toBe(true);
  });

  it('handles CRLF line endings', () => {
    const csv =
      'Authors,Title,Publication,Volume,Number,Pages,Year,Publisher\r\n' +
      '"X",A,,,,,,\r\n' +
      '"Y",B,,,,,,\r\n';
    const result = parseScholarCsv(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.title)).toEqual(['A', 'B']);
  });

  it('warns when required columns are missing', () => {
    const csv = 'Authors,Title\n"X",Y\n';
    const result = parseScholarCsv(csv);
    expect(result.warnings.some((w) => w.includes('missing columns'))).toBe(true);
    expect(result.rows).toHaveLength(1);
  });

  it('handles empty input gracefully', () => {
    expect(parseScholarCsv('').rows).toHaveLength(0);
    expect(parseScholarCsv('   \n').rows).toHaveLength(0);
  });

  it('parses the full sample provided by the user', () => {
    const sample =
      '\uFEFFAuthors,Title,Publication,Volume,Number,Pages,Year,Publisher\n' +
      '"AL-IESSA, HAYDER ABDULAMEER YOUSIF; AVCI, Assist Prof Dr Ä°sa; ",ATTACK DETECTION AND ANALYSIS WITH DEEP LEARNING IN CLOUD COMPUTING,,,,,2023,\n' +
      '"Naseer, MK; Farahani, MRD; Cancan, M; ",Investigation of some new results of entropy for titanium difluoride,Physica Scripta,,,3,2025,\n';
    const result = parseScholarCsv(sample);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.authors).toHaveLength(2);
    expect(result.rows[0]?.publication_year).toBe(2023);
    expect(result.rows[1]?.journal_name).toBe('Physica Scripta');
    expect(result.rows[1]?.pages).toBe('3');
  });
});
