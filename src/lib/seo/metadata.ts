export function siteOrigin(value = 'https://clumsykeys.vercel.app') {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL must be an HTTPS origin without credentials, path, query or fragment');
  }
  return url.origin;
}
const title = 'Free Online Typing Test – Prose, Code & Races | Clumsy Keys';
const description = 'Test your typing speed and accuracy with words, quotes and real code. Practise as a guest or race friends in Clumsy Keys.';
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

/** Add document metadata only. The application body and scripts are untouched. */
export function addMetadata(html: string, origin: string) {
  const canonical = origin + '/';
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Clumsy Keys', url: canonical, description }).replaceAll('<', '\\u003c');
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${escape(canonical)}" />
    <meta property="og:type" content="website" /><meta property="og:site_name" content="Clumsy Keys" />
    <meta property="og:title" content="${escape(title)}" /><meta property="og:description" content="${escape(description)}" /><meta property="og:url" content="${escape(canonical)}" />
    <meta name="twitter:card" content="summary" /><meta name="twitter:title" content="${escape(title)}" /><meta name="twitter:description" content="${escape(description)}" />
    <script type="application/ld+json">${schema}</script>`);
}
export function sitemap(origin: string) {
  // Hash views share one HTTP document; do not invent independently indexed pages.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(origin)}/</loc></url></urlset>\n`;
}
export function robots(origin: string) {
  return `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`;
}
