/**
 * Single helper component that emits a JSON-LD <script> with the data
 * already escaped. Always render server-side.
 */
export function JsonLd({ data }: { data: object }) {
  // Escape </script> just in case any string property contains it.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
