// Renders a JSON-LD <script> tag. Content always comes from our own
// translation strings/schema builders (lib/seo.ts), never user input --
// `<` is still escaped as a defensive habit so a stray "</script>" inside
// a translated FAQ answer could never prematurely close the tag.
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
