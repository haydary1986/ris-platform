// Swagger UI for the public REST API.
//
// Loaded from CDN rather than bundled — saves ~500 KB from every other
// route. The page itself is a thin shell that boots Swagger UI Bundle
// against /api/v1/openapi.json.

import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'API Documentation — RIS',
  description:
    'OpenAPI 3.0 documentation for the AL-Turath University Research Information System public API.',
  robots: { index: true, follow: true },
};

export default function ApiDocsPage(): React.ReactElement {
  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
      <div id="swagger-ui" />
      <Script
        src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
      />
      <Script id="swagger-init" strategy="afterInteractive">
        {`window.addEventListener('load', () => {
          if (window.SwaggerUIBundle) {
            window.SwaggerUIBundle({
              url: '/api/v1/openapi.json',
              dom_id: '#swagger-ui',
              deepLinking: true,
              tryItOutEnabled: true,
            });
          }
        });`}
      </Script>
    </>
  );
}
