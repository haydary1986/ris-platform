// OAI-PMH 2.0 endpoint — public protocol so academic aggregators (BASE,
// CORE, OpenAIRE, OAI Registry, OpenDOAR) can harvest the university's
// publication metadata automatically.
//
// Spec: https://www.openarchives.org/OAI/openarchivesprotocol.html
//
// Both GET and POST are required by the spec; argument handling is
// identical so we hand each off to the same dispatcher.

import { NextResponse } from 'next/server';
import {
  PAGE_SIZE,
  SUPPORTED_FORMATS,
  SUPPORTED_VERBS,
  type MetadataPrefix,
  type Verb,
  buildRecord,
  buildHeader,
  decodeResumptionToken,
  encodeResumptionToken,
  errorResponse,
  parseOaiIdentifier,
  toOaiDatestamp,
  wrap,
  xmlEscape,
} from '@/lib/oai/oai-pmh';
import {
  getEarliestDatestamp,
  getPublication,
  listColleges,
  listPublications,
} from '@/lib/oai/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ris.uoturath.edu.iq';
const REPOSITORY_NAME =
  process.env.OAI_REPOSITORY_NAME || 'Al-Turath University Research Repository';
const ADMIN_EMAIL = process.env.OAI_ADMIN_EMAIL || 'research@uoturath.edu.iq';

function hostFromSite(): string {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return 'ris.uoturath.edu.iq';
  }
}

function xml(body: string): Response {
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      // OAI harvesters re-poll often; let the CDN cache for a few minutes
      // while still honouring conditional GETs.
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

async function handleIdentify(args: Record<string, string>): Promise<string> {
  const earliest = (await getEarliestDatestamp()) ?? new Date().toISOString();
  const inner = `<Identify>
    <repositoryName>${xmlEscape(REPOSITORY_NAME)}</repositoryName>
    <baseURL>${xmlEscape(`${SITE_URL}/oai`)}</baseURL>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>${xmlEscape(ADMIN_EMAIL)}</adminEmail>
    <earliestDatestamp>${toOaiDatestamp(earliest)}</earliestDatestamp>
    <deletedRecord>no</deletedRecord>
    <granularity>YYYY-MM-DDThh:mm:ssZ</granularity>
    <description>
      <oai-identifier xmlns="http://www.openarchives.org/OAI/2.0/oai-identifier"
                      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                      xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai-identifier http://www.openarchives.org/OAI/2.0/oai-identifier.xsd">
        <scheme>oai</scheme>
        <repositoryIdentifier>${xmlEscape(hostFromSite())}</repositoryIdentifier>
        <delimiter>:</delimiter>
        <sampleIdentifier>${xmlEscape(`oai:${hostFromSite()}:pub:00000000-0000-0000-0000-000000000000`)}</sampleIdentifier>
      </oai-identifier>
    </description>
  </Identify>`;
  return wrap({ verb: args.verb }, `${SITE_URL}/oai`, inner);
}

async function handleListSets(args: Record<string, string>): Promise<string> {
  const colleges = await listColleges();
  if (colleges.length === 0) {
    return errorResponse(
      { verb: args.verb },
      `${SITE_URL}/oai`,
      'noSetHierarchy',
      'No sets defined.',
    );
  }
  const sets = colleges
    .map(
      (c) => `<set>
    <setSpec>college:${xmlEscape(c.slug)}</setSpec>
    <setName>${xmlEscape(c.name_en)} | ${xmlEscape(c.name_ar)}</setName>
  </set>`,
    )
    .join('\n  ');
  return wrap({ verb: args.verb }, `${SITE_URL}/oai`, `<ListSets>\n  ${sets}\n</ListSets>`);
}

function handleListMetadataFormats(args: Record<string, string>): string {
  // Currently only oai_dc is implemented — declaring more without
  // implementing them would cause aggregators to error out.
  const inner = `<ListMetadataFormats>
    <metadataFormat>
      <metadataPrefix>oai_dc</metadataPrefix>
      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
      <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
    </metadataFormat>
  </ListMetadataFormats>`;
  return wrap({ verb: args.verb }, `${SITE_URL}/oai`, inner);
}

interface ListArgs {
  verb: 'ListIdentifiers' | 'ListRecords';
  metadataPrefix: MetadataPrefix;
  set?: string;
  from?: string;
  until?: string;
  resumptionToken?: string;
}

async function handleList(args: ListArgs): Promise<string> {
  let prefix = args.metadataPrefix;
  let set = args.set;
  let from = args.from;
  let until = args.until;
  let offset = 0;

  if (args.resumptionToken) {
    const decoded = decodeResumptionToken(args.resumptionToken);
    if (!decoded || decoded.verb !== args.verb) {
      return errorResponse(
        { verb: args.verb },
        `${SITE_URL}/oai`,
        'badResumptionToken',
        'Invalid or expired resumption token.',
      );
    }
    prefix = decoded.prefix;
    set = decoded.set ?? undefined;
    from = decoded.from ?? undefined;
    until = decoded.until ?? undefined;
    offset = decoded.offset;
  }

  if (!SUPPORTED_FORMATS.includes(prefix)) {
    return errorResponse(
      { verb: args.verb },
      `${SITE_URL}/oai`,
      'cannotDisseminateFormat',
      `Only ${SUPPORTED_FORMATS.join(', ')} is supported.`,
    );
  }

  const { rows, total } = await listPublications({
    set: set ?? null,
    from: from ?? null,
    until: until ?? null,
    offset,
    limit: PAGE_SIZE,
  });

  if (rows.length === 0 && offset === 0) {
    return errorResponse(
      {
        verb: args.verb,
        ...(set ? { set } : {}),
        ...(from ? { from } : {}),
        ...(until ? { until } : {}),
        metadataPrefix: prefix,
      },
      `${SITE_URL}/oai`,
      'noRecordsMatch',
      'No records match the supplied criteria.',
    );
  }

  const host = hostFromSite();
  const items = rows
    .map((p) =>
      args.verb === 'ListRecords' ? buildRecord(host, SITE_URL, p) : buildHeader(host, p),
    )
    .join('\n  ');

  // Emit a resumption token only when there are more pages. The spec says
  // the final page should still include an *empty* resumptionToken
  // element to signal end-of-stream when at least one was issued earlier,
  // so we always emit one but leave it empty on the final page.
  const nextOffset = offset + rows.length;
  const hasMore = nextOffset < total;
  let resumption = '';
  if (hasMore) {
    const token = encodeResumptionToken({
      verb: args.verb,
      prefix,
      set: set ?? null,
      from: from ?? null,
      until: until ?? null,
      offset: nextOffset,
    });
    resumption = `<resumptionToken completeListSize="${total}" cursor="${offset}">${xmlEscape(token)}</resumptionToken>`;
  } else if (args.resumptionToken) {
    // Spec: terminating empty token after at least one issued.
    resumption = `<resumptionToken completeListSize="${total}" cursor="${offset}"/>`;
  }

  const inner = `<${args.verb}>
  ${items}
  ${resumption}
</${args.verb}>`;
  return wrap(
    {
      verb: args.verb,
      ...(set ? { set } : {}),
      ...(from ? { from } : {}),
      ...(until ? { until } : {}),
      metadataPrefix: prefix,
    },
    `${SITE_URL}/oai`,
    inner,
  );
}

async function handleGetRecord(args: Record<string, string>): Promise<string> {
  if (!args.identifier) {
    return errorResponse(
      { verb: args.verb },
      `${SITE_URL}/oai`,
      'badArgument',
      'identifier is required.',
    );
  }
  if (!args.metadataPrefix) {
    return errorResponse(
      { verb: args.verb, identifier: args.identifier },
      `${SITE_URL}/oai`,
      'badArgument',
      'metadataPrefix is required.',
    );
  }
  if (!SUPPORTED_FORMATS.includes(args.metadataPrefix as MetadataPrefix)) {
    return errorResponse(
      { verb: args.verb, identifier: args.identifier, metadataPrefix: args.metadataPrefix },
      `${SITE_URL}/oai`,
      'cannotDisseminateFormat',
      `Only ${SUPPORTED_FORMATS.join(', ')} is supported.`,
    );
  }

  const host = hostFromSite();
  const id = parseOaiIdentifier(host, args.identifier);
  if (!id) {
    return errorResponse(
      { verb: args.verb, identifier: args.identifier, metadataPrefix: args.metadataPrefix },
      `${SITE_URL}/oai`,
      'idDoesNotExist',
      `Unknown identifier ${args.identifier}.`,
    );
  }

  const pub = await getPublication(id);
  if (!pub) {
    return errorResponse(
      { verb: args.verb, identifier: args.identifier, metadataPrefix: args.metadataPrefix },
      `${SITE_URL}/oai`,
      'idDoesNotExist',
      `No record for ${args.identifier}.`,
    );
  }

  const inner = `<GetRecord>
  ${buildRecord(host, SITE_URL, pub)}
</GetRecord>`;
  return wrap(
    { verb: args.verb, identifier: args.identifier, metadataPrefix: args.metadataPrefix },
    `${SITE_URL}/oai`,
    inner,
  );
}

async function dispatch(args: Record<string, string>): Promise<string> {
  const verb = args.verb as Verb | undefined;

  if (!verb) {
    return errorResponse({}, `${SITE_URL}/oai`, 'badVerb', 'verb argument is required.');
  }
  if (!SUPPORTED_VERBS.includes(verb)) {
    return errorResponse(
      { verb: args.verb },
      `${SITE_URL}/oai`,
      'badVerb',
      `Unknown verb ${verb}.`,
    );
  }

  // Cross-verb argument validation — each verb has a fixed accepted set;
  // unknown arguments are badArgument errors.
  switch (verb) {
    case 'Identify':
      return handleIdentify(args);
    case 'ListSets':
      return handleListSets(args);
    case 'ListMetadataFormats':
      return handleListMetadataFormats(args);
    case 'ListIdentifiers':
    case 'ListRecords':
      if (!args.metadataPrefix && !args.resumptionToken) {
        return errorResponse(
          { verb: args.verb },
          `${SITE_URL}/oai`,
          'badArgument',
          'metadataPrefix is required when no resumptionToken is supplied.',
        );
      }
      return handleList({
        verb,
        metadataPrefix: (args.metadataPrefix as MetadataPrefix) || 'oai_dc',
        set: args.set,
        from: args.from,
        until: args.until,
        resumptionToken: args.resumptionToken,
      });
    case 'GetRecord':
      return handleGetRecord(args);
  }
}

function argsFromSearchParams(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return xml(await dispatch(argsFromSearchParams(url.searchParams)));
}

export async function POST(request: Request): Promise<Response> {
  // POST args arrive form-encoded per the spec.
  const body = await request.text();
  return xml(await dispatch(argsFromSearchParams(new URLSearchParams(body))));
}
