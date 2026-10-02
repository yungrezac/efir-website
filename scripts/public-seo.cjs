'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const origin = 'https://efirlive.pro';
const manifestFile = path.join(root, 'search-pages.json');
const pages = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')).pages : [];
const pageFiles = new Map(pages.map(page => [page.path, '/' + page.file]));
const aliases = new Map([['/index.html', '/']]);
for (const page of pages) {
  aliases.set(page.path + '/', page.path);
  aliases.set('/' + page.file, page.path);
}
const keyFile = path.join(root, 'indexnow-key.json');
const key = fs.existsSync(keyFile) ? JSON.parse(fs.readFileSync(keyFile, 'utf8')).key : '';
if (key && !/^[a-f0-9]{32}$/.test(key)) throw new Error('Invalid IndexNow key');

function redirect(request, response, pathname) {
  const host = String(request.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  const legacyHost = host === 'efir-website-production.up.railway.app' || host === 'www.efirlive.pro';
  const insecurePublic = host === 'efirlive.pro' && request.headers['x-forwarded-proto'] === 'http';
  const target = aliases.get(pathname);
  if (!legacyHost && !insecurePublic && !target) return false;
  const query = new URL(request.url, 'http://localhost').search;
  // Preserve referral/analytics parameters while consolidating duplicate URLs.
  response.writeHead(308, {
    Location: (legacyHost || insecurePublic ? origin : '') + (target || pathname) + query,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end();
  return true;
}

module.exports = { origin, pages, pageFiles, redirect,
  keyPath: key ? '/' + key + '.txt' : null };
