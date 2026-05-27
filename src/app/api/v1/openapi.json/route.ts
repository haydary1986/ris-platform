// Static OpenAPI 3.0 spec for the public REST API.
// Kept hand-written rather than auto-generated — the surface is small
// enough and we want full control over descriptions and examples.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ris.uoturath.edu.iq';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'AL-Turath RIS — Public API',
    version: '1.0.0',
    description:
      'Read-only API exposing researchers, publications, colleges and statistics for the Al-Turath University Research Information System. Free for any caller; rate-limited to 100 requests per minute per IP.\n\nهذا API للقراءة فقط يعرض بيانات الباحثين والمنشورات والكليات والإحصاءات الخاصة بمنظومة المعلومات البحثية في جامعة التراث. الاستخدام مجاني للجميع مع حد ١٠٠ طلب/دقيقة لكل IP.',
    contact: { name: 'Research Office', email: 'research@uoturath.edu.iq' },
    license: { name: 'Proprietary — Al-Turath University' },
  },
  servers: [{ url: `${SITE_URL}/api/v1`, description: 'Production' }],
  tags: [
    { name: 'Researchers', description: 'Researcher profiles' },
    { name: 'Publications', description: 'Research publications' },
    { name: 'Colleges', description: 'University colleges' },
    { name: 'Statistics', description: 'Aggregate metrics' },
  ],
  paths: {
    '/researchers': {
      get: {
        tags: ['Researchers'],
        summary: 'List researchers',
        parameters: [
          {
            name: 'q',
            in: 'query',
            schema: { type: 'string' },
            description: 'Full-text name search (EN or AR)',
          },
          {
            name: 'college',
            in: 'query',
            schema: { type: 'string' },
            description: 'College slug filter',
          },
          {
            name: 'department',
            in: 'query',
            schema: { type: 'string' },
            description: 'Department slug filter',
          },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['name_asc', 'h_index_desc', 'citations_desc', 'publications_desc', 'recent'],
              default: 'name_asc',
            },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated researcher list',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ResearcherList' } },
            },
          },
        },
      },
    },
    '/researchers/{slug}': {
      get: {
        tags: ['Researchers'],
        summary: 'Get a researcher',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
    '/researchers/{slug}/publications': {
      get: {
        tags: ['Researchers'],
        summary: "List a researcher's publications",
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          },
        ],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
    '/publications': {
      get: {
        tags: ['Publications'],
        summary: 'List publications',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search in title' },
          { name: 'year', in: 'query', schema: { type: 'integer' } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['recent', 'citations_desc', 'influential_desc'],
              default: 'recent',
            },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
          },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/publications/{id}': {
      get: {
        tags: ['Publications'],
        summary: 'Get one publication',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
    '/colleges': {
      get: {
        tags: ['Colleges'],
        summary: 'List all colleges with researcher counts',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/stats/overview': {
      get: {
        tags: ['Statistics'],
        summary: 'Top-line counts for the whole university',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/stats/by-year': {
      get: {
        tags: ['Statistics'],
        summary: 'Publication counts grouped by year',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/stats/by-college': {
      get: {
        tags: ['Statistics'],
        summary: 'Publication, citation and researcher counts per college',
        responses: { '200': { description: 'OK' } },
      },
    },
  },
  components: {
    schemas: {
      ResearcherList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Researcher' } },
          meta: { $ref: '#/components/schemas/Meta' },
        },
      },
      Researcher: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          full_name_en: { type: 'string' },
          full_name_ar: { type: 'string' },
          college_id: { type: 'string', format: 'uuid', nullable: true },
          scopus_h_index: { type: 'integer', nullable: true },
          scopus_publications_count: { type: 'integer', nullable: true },
        },
      },
      Meta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          page_size: { type: 'integer' },
          total: { type: 'integer' },
          has_more: { type: 'boolean' },
        },
      },
    },
  },
};

export function GET(): Response {
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
