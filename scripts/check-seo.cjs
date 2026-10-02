'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), origin = 'https://efirlive.pro';
const failures = []; let checks = 0;
const check = (condition, message) => { checks++; if (!condition) failures.push(message); };
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const attrs = tag => Object.fromEntries([...tag.matchAll(/\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(m => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '']));
const text = html => html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
try {
  const pages = [{ path: '/', file: 'index.html', type: 'home' }, ...JSON.parse(read('search-pages.json')).pages];
  const manifest = JSON.parse(read('seo-manifest.json')).pages;
  const byPath = new Map(pages.map(p => [p.path, p]));
  check(byPath.size === pages.length, 'Duplicate public route');
  const titles = new Set(), descriptions = new Set(), allLinks = new Map();
  const definitions = new Set(), references = [];
  for (const page of pages) {
    const html = read(page.file), prefix = page.path + ': ', canonical = origin + page.path;
    const head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1] || '';
    const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] || '';
    const meta = [...head.matchAll(/<meta\b[^>]*>/gi)].map(m => attrs(m[0]));
    const links = [...head.matchAll(/<link\b[^>]*>/gi)].map(m => attrs(m[0]));
    const title = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
    const description = meta.filter(m => m.name === 'description');
    check(title.length === 1 && title[0][1].length >= 15 && title[0][1].length <= 110, prefix + 'one useful title');
    check(!titles.has(title[0]?.[1]), prefix + 'title must be unique'); titles.add(title[0]?.[1]);
    check(description.length === 1 && description[0].content?.length >= 65 && description[0].content.length <= 350, prefix + 'one useful description');
    check(!descriptions.has(description[0]?.content), prefix + 'description must be unique'); descriptions.add(description[0]?.content);
    check(links.filter(l => l.rel === 'canonical').length === 1 && links.find(l => l.rel === 'canonical')?.href === canonical, prefix + 'canonical URL');
    check(!/efir-website-production\.up\.railway\.app/.test(html), prefix + 'legacy domain in public HTML');
    check(!meta.some(m => m.name === 'keywords'), prefix + 'no keyword stuffing meta');
    check(!meta.some(m => /^(robots|googlebot|yandex)$/i.test(m.name || '') && /noindex|nosnippet|none/i.test(m.content || '')), prefix + 'index and snippets permitted');
    check(/<html\s[^>]*lang="ru"/.test(html), prefix + 'Russian language');
    check((body.match(/<h1\b/gi) || []).length === 1, prefix + 'one H1');
    check(text(body).length >= 700, prefix + 'useful server-rendered text');
    const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    check(ids.length === new Set(ids).size, prefix + 'unique DOM IDs');
    for (const property of ['og:title', 'og:description', 'og:url', 'og:image']) check(meta.filter(m => m.property === property && m.content).length === 1, prefix + property);
    check(meta.find(m => m.property === 'og:url')?.content === canonical, prefix + 'Open Graph canonical');
    check(meta.find(m => m.property === 'og:image')?.content === origin + '/assets/efir-social.png', prefix + 'public social image');
    check(meta.find(m => m.name === 'twitter:card')?.content === 'summary_large_image', prefix + 'social card');
    const discovered = new Set();
    for (const tag of html.matchAll(/<(a|link|script|img)\b[^>]*>/gi)) {
      const a = attrs(tag[0]), resource = tag[1] !== 'a', href = a.src || a.href;
      if (!href || /^(data:|mailto:|tg:|efir:)/i.test(href)) continue;
      const target = new URL(href, canonical);
      if (target.origin !== origin) continue;
      if (byPath.has(target.pathname)) {
        if (!resource) discovered.add(target.pathname);
        if (target.hash) check(read(byPath.get(target.pathname).file).includes('id="' + target.hash.slice(1) + '"'), prefix + 'missing anchor ' + href);
      } else if (resource) check(fs.existsSync(path.join(root, target.pathname)), prefix + 'missing local asset ' + href);
      else check(['/protect', '/downloads/EFIR-Launcher-Setup.exe'].includes(target.pathname), prefix + 'unpublished internal link ' + href);
    }
    allLinks.set(page.path, discovered);
    const schemas = [...head.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m => attrs('<script ' + m[1] + '>').type === 'application/ld+json').map(m => JSON.parse(m[2]));
    check(schemas.length > 0, prefix + 'structured data');
    const types = new Set();
    function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      for (const type of [].concat(node['@type'] || [])) types.add(type);
      if (node['@id']) {
        check(node['@id'].startsWith(origin + '/'), prefix + 'canonical entity IDs');
        if (Object.keys(node).length > 1) definitions.add(node['@id']); else references.push(node['@id']);
      }
      check(!node.aggregateRating && !node.review, prefix + 'no invented ratings');
      Object.values(node).forEach(walk);
    }
    schemas.forEach(schema => { check(schema['@context'] === 'https://schema.org', prefix + 'schema context'); walk(schema); });
    check(types.has(page.type === 'app' || page.type === 'home' ? 'SoftwareApplication' : page.type === 'guide' ? 'Article' : 'CollectionPage'), prefix + 'appropriate schema');
    if (page.path !== '/') check(types.has('BreadcrumbList'), prefix + 'breadcrumbs');
    const saved = manifest.find(item => item.path === page.path);
    check(saved?.sha256 === crypto.createHash('sha256').update(html.replace(/\r\n/g, '\n')).digest('hex'), prefix + 'sitemap metadata stale; run build:seo');
  }
  references.forEach(id => check(definitions.has(id), 'Unresolved schema entity ' + id));
  const reachable = new Set(['/']), queue = ['/'];
  while (queue.length) for (const route of allLinks.get(queue.shift()) || []) if (!reachable.has(route)) { reachable.add(route); queue.push(route); }
  for (const page of pages) check(reachable.has(page.path), 'No crawlable path from home to ' + page.path);
  const robots = read('robots.txt');
  check(/^User-agent:\s*\*\s*$/m.test(robots), 'General robots policy');
  check(!/^Disallow:\s*\/\s*$/m.test(robots), 'Public content must be crawlable');
  check(robots.includes('Sitemap: ' + origin + '/sitemap.xml'), 'Canonical sitemap in robots');
  check(!/^Disallow:\s*\/(apps|guides|assets|home\.css|search-pages\.css)/m.test(robots), 'Rendering and content must be crawlable');
  const sitemap = read('sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  check(urls.length === pages.length && new Set(urls).size === urls.length && urls.every(url => byPath.has(url.replace(origin, '')) && url.startsWith(origin + '/')), 'Sitemap includes every canonical page exactly once');
  for (const entry of manifest) check(/^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod) && entry.lastmod <= new Date().toISOString().slice(0, 10), 'Real modification dates');
  const png = fs.readFileSync(path.join(root, 'assets/efir-social.png'));
  check(png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, '1200x630 PNG social card');
} catch (error) { failures.push(error.stack); }
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`SEO checks passed: ${checks} assertions. Public indexing/rankings require search-engine processing.`);
