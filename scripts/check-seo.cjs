'use strict';

// Static consistency checks for this single-page site; no network or dependencies.
const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '..');
const canonical = 'https://efir-website-production.up.railway.app/';
const failures = [];
let checks = 0;
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};
const read = file => fs.readFileSync(path.join(siteRoot, file), 'utf8');
const attrs = tag => {
  const values = {};
  for (const match of tag.matchAll(/\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    values[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return values;
};
const decode = value => value.replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g, entity => ({
  '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' '
})[entity]);

function contentText(html) {
  // Exclude non-content and explicitly hidden trees. CSS visibility needs browser review.
  const source = html.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const stack = [];
  const fragments = [];
  const voids = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const token of source.match(/<[^>]*>|[^<]+/g) || []) {
    const end = /^<\/([\w:-]+)/.exec(token);
    const start = /^<([\w:-]+)/.exec(token);
    if (end) {
      const index = stack.map(item => item.name).lastIndexOf(end[1].toLowerCase());
      if (index !== -1) stack.length = index;
    } else if (start) {
      const name = start[1].toLowerCase();
      const attributes = attrs(token);
      const hidden = stack.some(item => item.hidden) || 'hidden' in attributes
        || attributes['aria-hidden'] === 'true'
        || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attributes.style || '');
      if (!voids.has(name) && !token.endsWith('/>')) stack.push({ name, hidden });
    } else if (!token.startsWith('<') && !stack.some(item => item.hidden)) {
      fragments.push(token);
    }
  }
  return decode(fragments.join(' ').replace(/\s+/g, ' '));
}

try {
  const html = read('index.html');
  const head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1] || '';
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] || '';
  const meta = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => attrs(match[0]));
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map(match => attrs(match[0]));
  const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  const descriptions = meta.filter(item => item.name?.toLowerCase() === 'description');
  const canonicals = links.filter(item => item.rel?.toLowerCase().split(/\s+/).includes('canonical'));
  check(titles.length === 1 && titles[0][1].trim().length > 10, 'Expected one descriptive title in <head>.');
  check(descriptions.length === 1 && descriptions[0].content?.trim().length > 60, 'Expected one useful meta description.');
  check(canonicals.length === 1 && canonicals[0].href === canonical, `Canonical must be exactly ${canonical}`);
  check(!meta.some(item => item.name?.toLowerCase() === 'keywords'), 'Do not add a meta keywords list.');
  check(!meta.some(item => /^(robots|googlebot|yandex)$/i.test(item.name || '') && /noindex|none/i.test(item.content || '')), 'The landing page must allow indexing.');
  check(!links.some(item => 'hreflang' in item), 'No hreflang until real translated pages are published.');
  for (const tag of [...head.matchAll(/<(?:link|script)\b[^>]*>/gi)]) {
    const attributes = attrs(tag[0]);
    const source = attributes.src || (attributes.rel === 'stylesheet' ? attributes.href : null);
    if (source?.startsWith('./')) {
      check(fs.existsSync(path.join(siteRoot, source)), `Missing local rendering asset: ${source}`);
    }
  }
  for (const key of ['og:url', 'og:image', 'og:title', 'og:description']) {
    const entries = meta.filter(item => item.property === key);
    check(entries.length === 1 && Boolean(entries[0].content), `Expected one ${key} property.`);
  }
  const socialImage = meta.find(item => item.property === 'og:image')?.content;
  if (socialImage?.startsWith(canonical)) {
    const imagePath = path.join(siteRoot, new URL(socialImage).pathname);
    check(fs.existsSync(imagePath), 'The Open Graph image must exist locally.');
    if (fs.existsSync(imagePath)) {
      const png = fs.readFileSync(imagePath);
      check(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Social image must be a real PNG.');
      check(png.length >= 24 && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, 'Social image must be 1200×630.');
    }
  } else check(false, 'The social image must use the canonical domain.');
  check(attrs(/<html\b[^>]*>/i.exec(html)?.[0] || '').lang === 'ru', 'The current page language must be ru.');
  check((body.match(/<h1\b/gi) || []).length === 1, 'Expected one main heading.');

  const ids = [...body.matchAll(/<[a-z][^>]*>/gi)].map(match => attrs(match[0]).id).filter(Boolean);
  check(new Set(ids).size === ids.length, 'HTML IDs must be unique.');
  for (const match of body.matchAll(/<a\b[^>]*>/gi)) {
    const href = attrs(match[0]).href;
    if (href?.startsWith('#') && href.length > 1) check(ids.includes(href.slice(1)), `Missing anchor target: ${href}`);
  }

  const visible = contentText(body);
  for (const [name, pattern] of [
    ['TikTimer', /Tik\s?Timer/i], ['Flappy Gifts', /Flappy\s+Gifts/i],
    ['EFIR launcher', /EFIR/i], ['Echo Live', /Echo Live/i],
    ['TikTok context', /TikTok|Тик\s?Ток/i], ['timer', /таймер/i],
    ['gifts', /подар/i], ['time', /врем/i], ['roulette', /рулет/i],
    ['comment speech', /озвуч/i], ['comments or chat', /комментар|чат/i],
    ['Echo Live beta disclosure', /бета/i], ['voice quality disclosure', /качеств[а-яё\s,.—-]{0,40}голос|голос[а-яё\s,.—-]{0,40}качеств/i]
  ]) check(pattern.test(visible), `Missing visible topic: ${name}`);

  const scripts = [...head.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => attrs(`<script ${match[1]}>`).type === 'application/ld+json');
  check(scripts.length > 0, 'Expected JSON-LD structured data in <head>.');
  const documents = scripts.map(match => JSON.parse(match[2]));
  const definitions = new Map();
  const references = [];
  const types = new Set();
  const walk = node => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (node['@type']) for (const type of [].concat(node['@type'])) types.add(type);
    if (node['@id']) {
      const id = node['@id'];
      check(typeof id === 'string' && id.startsWith(canonical), `Structured-data @id must use the canonical domain: ${id}`);
      if (Object.keys(node).length > 1) {
        check(!definitions.has(id), `Duplicate JSON-LD definition: ${id}`);
        definitions.set(id, node);
      } else references.push(id);
    }
    if (typeof node.url === 'string' && node.url.startsWith(canonical)) {
      const target = new URL(node.url);
      check(target.pathname === '/', `Structured data points at an unpublished page: ${node.url}`);
      if (target.hash) check(ids.includes(decodeURIComponent(target.hash.slice(1))), `Structured-data URL anchor does not exist: ${node.url}`);
    }
    Object.values(node).forEach(walk);
  };
  for (const document of documents) {
    check(document['@context'] === 'https://schema.org', 'JSON-LD must use https://schema.org.');
    walk(document);
  }
  for (const id of references) check(definitions.has(id), `Unresolved JSON-LD reference: ${id}`);
  for (const type of ['WebSite', 'WebPage', 'SoftwareApplication']) check(types.has(type), `Missing schema type: ${type}`);
  const structured = JSON.stringify(documents);
  for (const product of [/EFIR/i, /TikTimer/i, /Flappy Gifts/i, /Echo Live/i]) {
    check(product.test(structured), `Missing product in structured data: ${product}`);
  }

  const robots = read('robots.txt');
  check(/^User-agent:\s*\*\s*$/mi.test(robots), 'Expected general crawler rules.');
  check(robots.split(/\r?\n/).some(line => line.trim() === `Sitemap: ${canonical}sitemap.xml`), 'robots.txt must reference the public sitemap.');
  check(!/^Disallow:\s*\/\s*$/mi.test(robots), 'Do not block the entire site.');
  check(!/^Disallow:\s*\/(?:assets\/?|styles\.css|timer-preview\.css|app\.js|timer-preview\.js)\s*$/mi.test(robots), 'Rendering assets must remain crawlable.');
  const sitemap = read('sitemap.xml');
  check(/<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"\s*>/.test(sitemap), 'Expected standard sitemap namespace.');
  const urls = [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(match => match[1].trim());
  check(urls.length === 1 && urls[0] === canonical, 'Sitemap must list only the real canonical home page.');
  check(!/<lastmod>/i.test(sitemap), 'Do not add an unverified sitemap last-modified date.');
} catch (error) {
  failures.push(error.message);
}

if (failures.length) {
  console.error(`SEO checks failed (${failures.length}):\n${failures.map(message => `- ${message}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`SEO checks passed (${checks} assertions). Domain: ${canonical}`);
  console.log('Static files only; public hosting, indexing and rankings are not verified.');
}
