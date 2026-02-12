import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);

function getArgValue(names, fallback) {
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (names.includes(a)) return args[i + 1] ?? fallback;
    for (const n of names) {
      if (a.startsWith(`${n}=`)) return a.slice(n.length + 1);
    }
  }
  return fallback;
}

function hasFlag(names) {
  return args.some((a) => names.includes(a));
}

const port = Number(getArgValue(['--port', '-p'], '8000'));
const host = String(getArgValue(['--host', '-h'], 'localhost'));
const noCache = hasFlag(['--no-cache']);

if (!Number.isFinite(port) || port <= 0 || port >= 65536) {
  // eslint-disable-next-line no-console
  console.error(`Invalid port: ${port}`);
  process.exit(1);
}

const rootDir = process.cwd();

const mimeByExt = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...(noCache ? { 'Cache-Control': 'no-store' } : {}),
    ...headers,
  });
  res.end(body);
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function toSafePath(urlPathname) {
  // Remove query/hash (already stripped by URL), decode percent-encoding
  const decoded = decodeURIComponent(urlPathname);

  // Strip leading slash so path.join does not ignore rootDir
  const rel = decoded.replace(/^\/+/, '');
  const normalized = path.normalize(rel);
  const full = path.resolve(rootDir, normalized);

  // Prevent path traversal
  const rootResolved = path.resolve(rootDir);
  if (!full.startsWith(rootResolved)) return null;

  return full;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    let pathname = url.pathname || '/';
    if (pathname === '/') pathname = '/index.html';

    let fullPath = toSafePath(pathname);
    if (!fullPath) return send(res, 403, 'Forbidden');

    // If directory, serve index.html
    try {
      const st = await fs.stat(fullPath);
      if (st.isDirectory()) {
        const indexPath = path.join(fullPath, 'index.html');
        fullPath = indexPath;
      }
    } catch {
      // ignore; handled below
    }

    if (!(await fileExists(fullPath))) return send(res, 404, 'Not Found');

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = mimeByExt.get(ext) ?? 'application/octet-stream';
    const data = await fs.readFile(fullPath);

    res.writeHead(200, {
      'Content-Type': contentType,
      ...(noCache ? { 'Cache-Control': 'no-store' } : {}),
    });
    res.end(data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    send(res, 500, 'Internal Server Error');
  }
});

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`server http://${host}:${port}`);
  // eslint-disable-next-line no-console
  console.log('tip: Ctrl+C to stop');
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
