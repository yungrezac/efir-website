'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
const expected = 'https://github.com/yungrezac/efirlauncher/releases/latest/download/EFIR-Launcher-Setup.exe';
assert.equal(release.url, expected);
assert.equal(release.fileName, 'EFIR-Launcher-Setup.exe');
assert.match(release.version, /^\d+\.\d+\.\d+$/);
assert.ok(release.bytes > 0, 'Run prepare:download after building the launcher');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const links = [...html.matchAll(/<a\b[^>]*class="[^"]*download-link[^"]*"[^>]*href="([^"]+)"/g)];
assert.equal(links.length, 3);
for (const link of links) assert.equal(link[1], expected);
assert.ok(html.includes('"downloadUrl": "' + expected + '"'));
console.log('GitHub download configuration passed. Uploaded release availability is not verified.');
