import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { addMetadata, robots, siteOrigin, sitemap } from '../src/lib/seo/metadata';

/** Nonvisual SEO only: preserve the original application and routing. */
export function seoPlugin(url?: string): Plugin {
  const origin = siteOrigin(url);
  let output = '';
  return {
    name: 'clumsy-seo-metadata',
    configResolved(config) { output = resolve(config.root, config.build.outDir); },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (path !== '/robots.txt' && path !== '/sitemap.xml') return next();
        res.setHeader('Content-Type', path === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8');
        res.end(path === '/robots.txt' ? robots(origin) : sitemap(origin));
      });
    },
    transformIndexHtml: { order: 'pre', handler(html) { return addMetadata(html, origin); } },
    async writeBundle() {
      await writeFile(resolve(output, 'robots.txt'), robots(origin));
      await writeFile(resolve(output, 'sitemap.xml'), sitemap(origin));
    },
  };
}
