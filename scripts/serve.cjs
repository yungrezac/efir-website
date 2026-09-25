'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '..');
const protectService = require('./protect-service.cjs').createProtectService();
const homepageEnabled = require('./homepage-status.cjs').createHomepageStatus();
const maintenancePage = fs.readFileSync(path.join(siteRoot,'maintenance.html'));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const publicFiles = new Set([
  '/', '/index.html', '/styles.css', '/search-content.css', '/app.js',
  '/timer-preview.css', '/timer-preview.js', '/release.json', '/robots.txt', '/sitemap.xml',
  '/vladosikpypsik', '/vladosikpypsik/', '/admin.css', '/admin.js', '/analytics.js', '/analytics.css', '/site-settings.js',
  '/protect', '/protect/', '/protect.html', '/protect.css', '/protect.js',
  '/sinabon', '/sinabon/', '/sinabon.html', '/creator.css', '/creator.js',
  '/astral', '/astral/', '/astral.html', '/darisha', '/darisha/', '/darisha.html'
  ,'/widget.html','/widget-render.js','/widget-public.js'
]);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.exe': 'application/octet-stream'
};

const server = http.createServer(async (request, response) => {
  const fail = (status, message, headers = {}) => {
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
    response.end(request.method === 'HEAD' ? undefined : message);
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    return fail(405, 'Method not allowed', { Allow: 'GET, HEAD' });
  }

  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replaceAll('\\', '/');
    if (/^\/widget\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(pathname)) pathname='/widget.html';
    if ((pathname==='/'||pathname==='/index.html') && !(await homepageEnabled())) {
      response.writeHead(503,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Retry-After':'60','X-Robots-Tag':'noindex','Content-Length':maintenancePage.length});
      response.end(request.method==='HEAD'?undefined:maintenancePage);return;
    }
    if (pathname === '/api/protect') {
      try {
        const data = await protectService.lookup(new URL(request.url, 'http://localhost').searchParams.get('username'));
        response.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        response.end(request.method === 'HEAD' ? undefined : JSON.stringify(data));
      } catch (error) { fail(error.status || 503, error.status === 400 ? 'Invalid username' : 'Verification temporarily unavailable'); }
      return;
    }
    if (pathname === '/downloads/EFIR-Launcher-Setup.exe') {
      response.writeHead(302, { Location: 'https://github.com/yungrezac/efirlauncher/releases/latest/download/EFIR-Launcher-Setup.exe', 'Cache-Control': 'no-cache' });
      response.end();
      return;
    }
    if (pathname.includes('\0') || pathname.split('/').some(segment => segment.startsWith('.'))) {
      return fail(403, 'Forbidden');
    }
    if (!publicFiles.has(pathname) && !pathname.startsWith('/assets/') && !pathname.startsWith('/downloads/')) {
      return fail(404, 'Not found');
    }
    const pageRoutes = { '/sinabon': '/sinabon.html', '/astral': '/astral.html', '/darisha': '/darisha.html', '/vladosikpypsik': '/admin.html', '/protect': '/protect.html' };
    const resolvedPathname = pageRoutes[pathname.replace(/\/$/, '')] || pathname;
    let file = path.resolve(siteRoot, `.${resolvedPathname}`);
    const relative = path.relative(siteRoot, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return fail(403, 'Forbidden');
    let stat = await fsp.stat(file);
    if (stat.isDirectory()) {
      file = path.join(file, 'index.html');
      stat = await fsp.stat(file);
    }
    if (!stat.isFile()) return fail(404, 'Not found');
    const realFile = await fsp.realpath(file);
    const realRelative = path.relative(siteRoot, realFile);
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) return fail(403, 'Forbidden');

    const headers = {
      'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    };
    const publicPath = realRelative.split(path.sep).join('/');
    if (/^(?:artifacts|scripts|downloads)\//i.test(publicPath)
      || /^(?:README\.md|SEO\.md|package(?:-lock)?\.json|release\.json)$/i.test(publicPath)
      || /\.(?:exe|zip)$/i.test(publicPath)) {
      headers['X-Robots-Tag'] = 'noindex';
    }
    if (path.extname(file).toLowerCase() === '.exe') {
      headers['Content-Disposition'] = `attachment; filename="${path.basename(file).replaceAll('"', '')}"`;
    }

    let status = 200;
    let start = 0;
    let end = stat.size - 1;
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!range || (!range[1] && !range[2]) || !stat.size) {
        return fail(416, 'Range not satisfiable', { 'Content-Range': `bytes */${stat.size}` });
      }
      if (range[1]) {
        start = Number(range[1]);
        if (range[2]) end = Math.min(Number(range[2]), end);
      } else {
        start = Math.max(0, stat.size - Number(range[2]));
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
        return fail(416, 'Range not satisfiable', { 'Content-Range': `bytes */${stat.size}` });
      }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      headers['Content-Length'] = end - start + 1;
    }

    response.writeHead(status, headers);
    if (request.method === 'HEAD' || stat.size === 0) return response.end();
    const stream = fs.createReadStream(realFile, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch (error) {
    if (response.headersSent) return response.destroy();
    if (error instanceof URIError || error.code === 'ERR_INVALID_URL') return fail(400, 'Bad request');
    return fail(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500, 'File unavailable');
  }
});

server.on('error', error => {
  console.error(`Не удалось запустить сайт: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log(`EFIR: http://${host}:${port}\nОстановить: Ctrl+C`));

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
});
