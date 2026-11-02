// Tiny static server that serves a folder under a URL prefix, like GitHub Pages serves a project site.
//   node scripts/serve-site.mjs dist-site 4175 /dairyfarm
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [dir = 'dist-site', port = '4175', prefix = '/dairyfarm'] = process.argv.slice(2);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.txt': 'text/plain'
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel === prefix) { res.writeHead(301, { Location: prefix + '/' + url.search }); return res.end(); }
  if (!rel.startsWith(prefix + '/')) { res.writeHead(404); return res.end('not found'); }
  rel = rel.slice(prefix.length);
  let file = path.join(dir, rel);
  if (!path.resolve(file).startsWith(path.resolve(dir))) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(Number(port), () => console.log(`serving ${dir} at http://localhost:${port}${prefix}/`));
