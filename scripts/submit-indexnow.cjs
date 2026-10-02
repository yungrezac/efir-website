'use strict';

// Deliberate publication step, never run automatically on server startup/build.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const origin = 'https://efirlive.pro';
async function main() {
  const { key } = JSON.parse(fs.readFileSync(path.join(root, 'indexnow-key.json'), 'utf8'));
  assert.match(key, /^[a-f0-9]{32}$/);
  const urlList = JSON.parse(fs.readFileSync(path.join(root, 'seo-manifest.json'), 'utf8')).pages.map(page => origin + page.path);
  const keyLocation = origin + '/' + key + '.txt';
  const verification = await fetch(keyLocation, { signal: AbortSignal.timeout(20000) });
  assert.equal(verification.status, 200, 'Deploy the verification file first');
  assert.equal((await verification.text()).trim(), key);
  for (const url of urlList) {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `Not published: ${url}`);
    const html = await response.text();
    assert(html.includes(`rel="canonical" href="${url}"`), `Wrong canonical: ${url}`);
    assert(!/noindex/i.test(response.headers.get('x-robots-tag') || ''), `Not indexable: ${url}`);
  }
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'efirlive.pro', key, keyLocation, urlList }),
    signal: AbortSignal.timeout(30000)
  });
  const text = await response.text();
  assert([200, 202].includes(response.status), `IndexNow HTTP ${response.status}: ${text.slice(0, 300)}`);
  console.log(JSON.stringify({ submittedAt: new Date().toISOString(), status: response.status, urlList,
    message: 'URLs submitted for discovery. Indexing and rankings are not guaranteed.' }, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
