'use strict';

// Fixed first-party upstream: clients cannot select a host or forward arbitrary headers.
const upstream = 'https://license-server-production-8e69.up.railway.app';
function createLauncherLicense({fetchImpl = fetch, timeout = 15000} = {}) {
  return async function launcherLicense(request, response) {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/launcher/')) return false;
    const route = url.pathname.slice('/api/launcher'.length);
    const allowed = request.method === 'GET'
      ? /^\/(health|v1\/subscription(?:\/quote)?)$/.test(route)
      : request.method === 'POST' && /^\/v1\/(check-license|issue-launch-ticket|promos\/redeem|subscription\/orders(?:\/[a-zA-Z0-9-]+\/(verify|cancel))?)$/.test(route);
    const send = (status, body) => {
      response.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      response.end(body);
    };
    if (!allowed) { send(404, '{"error":"Not found"}'); return true; }
    if (route !== '/health' && !/^Bearer \S+$/i.test(request.headers.authorization || '')) {
      send(401, '{"error":"Authentication required"}'); return true;
    }
    try {
      const chunks = []; let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 16384) { send(413, '{"error":"Request too large"}'); return true; }
        chunks.push(chunk);
      }
      const headers = {'Content-Type':'application/json', Accept:'application/json'};
      if (request.headers.authorization) headers.Authorization = request.headers.authorization;
      if (request.headers.apikey) headers.apikey = request.headers.apikey;
      const result = await fetchImpl(upstream + route + url.search, {
        method:request.method, headers, redirect:'error', signal:AbortSignal.timeout(timeout),
        ...(request.method === 'POST' ? {body:Buffer.concat(chunks)} : {})
      });
      send(result.status, await result.text());
    } catch {
      send(502, '{"error":"License service temporarily unavailable"}');
    }
    return true;
  };
}
module.exports = {createLauncherLicense};
