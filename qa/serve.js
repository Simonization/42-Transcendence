// Serves the built SPA like the production reverse proxy (nginx/Caddy) does:
//   /api/*       -> backend, prefix stripped
//   /socket.io/* -> backend, including the websocket upgrade
//   everything else -> frontend/dist, falling back to index.html (SPA history mode)
// usage: node serve.js [port] [backendPort]   (defaults from config.js; DIST env overrides the SPA dir)
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const port = Number(process.argv[2] || cfg.UI_PORT);
const bport = Number(process.argv[3] || cfg.API_PORT);
const DIST = cfg.DIST;
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error(`${DIST}/index.html is missing: build the frontend first (cd frontend && npm run build)`); process.exit(1); }
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

function proxy(req, res, target) {
  const p = http.request({ host: '127.0.0.1', port: bport, path: target, method: req.method, headers: { ...req.headers, 'x-forwarded-proto': 'http', 'x-forwarded-host': req.headers.host } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return proxy(req, res, req.url.slice(4));
  if (req.url.startsWith('/socket.io/')) return proxy(req, res, req.url);
  let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
server.on('upgrade', (req, sock, head) => {
  const up = net.connect(bport, '127.0.0.1', () => {
    up.write(`${req.method} ${req.url} HTTP/1.1\r\n` + Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n');
    up.write(head); sock.pipe(up); up.pipe(sock);
  });
  up.on('error', () => sock.destroy()); sock.on('error', () => up.destroy());
});
server.listen(port, '127.0.0.1', () => console.log('serving', DIST, 'on', port, '->', bport));
