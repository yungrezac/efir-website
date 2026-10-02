'use strict';

// Run after editing public content. Dates change only when page content changes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const origin = 'https://efirlive.pro';
const pages = [{ path: '/', file: 'index.html' }, ...JSON.parse(fs.readFileSync(path.join(root, 'search-pages.json'), 'utf8')).pages];
const oldFile = path.join(root, 'seo-manifest.json');
const previous = fs.existsSync(oldFile) ? JSON.parse(fs.readFileSync(oldFile, 'utf8')).pages : [];
const today = new Date().toISOString().slice(0, 10);
const manifest = pages.map(page => {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, page.file))).digest('hex');
  const old = previous.find(item => item.path === page.path && item.sha256 === hash);
  return { path: page.path, file: page.file, sha256: hash, lastmod: old?.lastmod || today };
});
fs.writeFileSync(oldFile, JSON.stringify({ pages: manifest }, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + manifest.map(page => `  <url><loc>${origin}${page.path}</loc><lastmod>${page.lastmod}</lastmod></url>`).join('\n') + '\n</urlset>\n');
console.log(`Sitemap: ${manifest.length} canonical pages on ${origin}`);
