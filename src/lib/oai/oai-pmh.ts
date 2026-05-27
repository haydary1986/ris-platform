// OAI-PMH 2.0 protocol helpers — XML building, escaping, resumption
// tokens, and Dublin Core record formatting. Kept framework-agnostic so
// the route handler stays a thin HTTP shell.
//
// Spec: https://www.openarchives.org/OAI/openarchivesprotocol.html
//
// We expose two metadataPrefix values:
//   - oai_dc  — Dublin Core (mandatory by the spec)
//   - mods    — MODS subset, popular with academic harvesters
//
// Identifier scheme:
//   oai:<host>:pub:<publication_id>
//
// Sets:
//   college:<slug>  — each college becomes a harvestable set

import { createHash } from 'node:crypto';

export const SUPPORTED_VERBS = [
  'Identify',
  'ListSets',
  'ListMetadataFormats',
  'ListIdentifiers',
  'ListRecords',
  'GetRecord',
] as const;

export type Verb = (typeof SUPPORTED_VERBS)[number];

export const SUPPORTED_FORMATS = ['oai_dc'] as const;
export type MetadataPrefix = (typeof SUPPORTED_FORMATS)[number];

// Per-verb result page size. The spec lets the server pick; 100 is a
// common compromise that keeps response bodies small enough for
// resumption to feel responsive.
export const PAGE_SIZE = 100;

// XML-1.0 disallows raw control chars besides \t \n \r. Strip the rest
// before serialising so a stray byte in a paper title doesn't poison the
// entire response.
function stripInvalidXmlChars(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

export function xmlEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = stripInvalidXmlChars(String(value));
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface PublicationForOai {
  id: string;
  title: string;
  abstract: string | null;
  publication_year: number | null;
  publication_date: string | null;
  doi: string | null;
  url: string | null;
  journal_name: string | null;
  publisher: string | null;
  publication_type: string | null;
  is_open_access: boolean;
  created_at: string;
  updated_at: string;
  college_slug: string | null;
  authors: string[];
  keywords: string[];
}

// OAI requires UTC instants formatted as YYYY-MM-DDThh:mm:ssZ.
export function toOaiDatestamp(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function oaiIdentifierFor(host: string, publicationId: string): string {
  return `oai:${host}:pub:${publicationId}`;
}

// Parse our identifier back to the publication UUID. Returns null if the
// identifier is malformed or points at the wrong repository.
export function parseOaiIdentifier(host: string, identifier: string): string | null {
  const expectedPrefix = `oai:${host}:pub:`;
  if (!identifier.startsWith(expectedPrefix)) return null;
  const id = identifier.slice(expectedPrefix.length);
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

// Resumption tokens carry just enough state to replay the next page of
// results. We base64url them so they survive query-string transport, and
// sign with a short HMAC so callers can't forge an offset that triggers
// expensive scans of the table.
interface TokenPayload {
  verb: Verb;
  prefix: MetadataPrefix;
  set?: string | null;
  from?: string | null;
  until?: string | null;
  offset: number;
}

const TOKEN_SECRET = process.env.OAI_TOKEN_SECRET || 'oai-token-default-secret';

function sign(payload: string): string {
  return createHash('sha256').update(`${payload}.${TOKEN_SECRET}`).digest('base64url').slice(0, 12);
}

export function encodeResumptionToken(payload: TokenPayload): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json, 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

export function decodeResumptionToken(token: string): TokenPayload | null {
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sign(body) !== sig) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
  } catch {
    return null;
  }
}

// Envelope used by every successful and most error responses.
export function wrap(
  request: {
    verb?: string;
    identifier?: string;
    metadataPrefix?: string;
    set?: string;
    from?: string;
    until?: string;
    resumptionToken?: string;
  },
  baseUrl: string,
  inner: string,
): string {
  const attrs = Object.entries(request)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}="${xmlEscape(v)}"`)
    .join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${toOaiDatestamp(new Date())}</responseDate>
  <request${attrs ? ' ' + attrs : ''}>${xmlEscape(baseUrl)}</request>
  ${inner}
</OAI-PMH>`;
}

export function errorResponse(
  request: Parameters<typeof wrap>[0],
  baseUrl: string,
  code:
    | 'badArgument'
    | 'badVerb'
    | 'badResumptionToken'
    | 'cannotDisseminateFormat'
    | 'idDoesNotExist'
    | 'noRecordsMatch'
    | 'noSetHierarchy',
  message: string,
): string {
  return wrap(request, baseUrl, `<error code="${code}">${xmlEscape(message)}</error>`);
}

// <header> block — shared between ListIdentifiers, ListRecords and
// GetRecord. Drives both visibility and the datestamp used by
// incremental harvesters.
export function buildHeader(host: string, pub: PublicationForOai): string {
  const setSpec = pub.college_slug
    ? `<setSpec>college:${xmlEscape(pub.college_slug)}</setSpec>`
    : '';
  return `<header>
    <identifier>${xmlEscape(oaiIdentifierFor(host, pub.id))}</identifier>
    <datestamp>${toOaiDatestamp(pub.updated_at)}</datestamp>
    ${setSpec}
  </header>`;
}

// Build a Dublin Core metadata block.
//
// dc elements we populate:
//   dc:title       — publication title
//   dc:creator     — each author name
//   dc:subject     — each keyword
//   dc:description — abstract
//   dc:publisher   — publisher (or journal name as fallback)
//   dc:date        — ISO publication date (or YYYY-01-01 from year)
//   dc:type        — text by default (publication_type if known)
//   dc:identifier  — landing URL on RIS + DOI URL when present
//   dc:source      — journal name
//   dc:language    — heuristic en/ar based on title script
//   dc:rights      — "Open Access" / "Closed Access" tag
function buildOaiDc(siteUrl: string, pub: PublicationForOai): string {
  const lines: string[] = [];
  lines.push(`<dc:title>${xmlEscape(pub.title)}</dc:title>`);
  for (const author of pub.authors) lines.push(`<dc:creator>${xmlEscape(author)}</dc:creator>`);
  for (const kw of pub.keywords) lines.push(`<dc:subject>${xmlEscape(kw)}</dc:subject>`);
  if (pub.abstract) lines.push(`<dc:description>${xmlEscape(pub.abstract)}</dc:description>`);
  if (pub.publisher) {
    lines.push(`<dc:publisher>${xmlEscape(pub.publisher)}</dc:publisher>`);
  } else if (pub.journal_name) {
    lines.push(`<dc:publisher>${xmlEscape(pub.journal_name)}</dc:publisher>`);
  }
  if (pub.publication_date) {
    lines.push(`<dc:date>${xmlEscape(pub.publication_date)}</dc:date>`);
  } else if (pub.publication_year) {
    lines.push(`<dc:date>${xmlEscape(`${pub.publication_year}-01-01`)}</dc:date>`);
  }
  lines.push(`<dc:type>${xmlEscape(pub.publication_type ?? 'text')}</dc:type>`);
  lines.push(`<dc:identifier>${xmlEscape(`${siteUrl}/publication/${pub.id}`)}</dc:identifier>`);
  if (pub.doi) {
    lines.push(`<dc:identifier>${xmlEscape(`https://doi.org/${pub.doi}`)}</dc:identifier>`);
  }
  if (pub.journal_name) {
    lines.push(`<dc:source>${xmlEscape(pub.journal_name)}</dc:source>`);
  }
  // Title script heuristic — Arabic block U+0600–U+06FF.
  const isArabic = /[؀-ۿ]/.test(pub.title);
  lines.push(`<dc:language>${isArabic ? 'ar' : 'en'}</dc:language>`);
  lines.push(`<dc:rights>${pub.is_open_access ? 'Open Access' : 'Closed Access'}</dc:rights>`);

  return `<metadata>
    <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
               xmlns:dc="http://purl.org/dc/elements/1.1/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
      ${lines.join('\n      ')}
    </oai_dc:dc>
  </metadata>`;
}

export function buildRecord(host: string, siteUrl: string, pub: PublicationForOai): string {
  return `<record>
    ${buildHeader(host, pub)}
    ${buildOaiDc(siteUrl, pub)}
  </record>`;
}
