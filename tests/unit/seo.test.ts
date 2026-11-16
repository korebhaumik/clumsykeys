import test from 'node:test';
import assert from 'node:assert/strict';
import { addMetadata, siteOrigin, sitemap, robots } from '../../src/lib/seo/metadata';

test('SEO changes only the head and preserves the exact application body', () => {
  const body = '<body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>';
  const template = `<html><head><title>clumsykeys</title></head>${body}</html>`;
  const html = addMetadata(template, siteOrigin());
  assert.equal(html.slice(html.indexOf('<body>')), template.slice(template.indexOf('<body>')));
  assert.match(html, /name="description"/);
  assert.match(html, /rel="canonical" href="https:\/\/clumsykeys.vercel.app\/"/);
  assert.match(html, /content="index, follow"/);
  assert.doesNotMatch(html, /public-content|<h1|<nav|<section/);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
  assert.equal(schema.name, 'Clumsy Keys');
  assert.equal(schema.url, 'https://clumsykeys.vercel.app/');
});
test('sitemap lists only the existing canonical HTTP document, not hash/private/landing routes', () => {
  const origin = siteOrigin('https://typing.example/');
  const xml = sitemap(origin);
  assert.equal((xml.match(/<loc>/g) ?? []).length, 1);
  assert.match(xml, /<loc>https:\/\/typing.example\/<\/loc>/);
  assert.doesNotMatch(xml, /#|\/app|\/account|\/history|typing-test/);
  assert.match(robots(origin), /Sitemap: https:\/\/typing.example\/sitemap.xml/);
});
test('canonical origin validation rejects credentials, paths and unsafe protocols', () => {
  for (const bad of ['http://typing.example','https://user:password@typing.example','https://typing.example/path','https://typing.example/?x=1','https://typing.example/#x']) assert.throws(() => siteOrigin(bad));
});
