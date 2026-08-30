/**
 * Servidor estático mínimo para auditoria local (axe, Lighthouse).
 *
 * Node puro, sem dependência: o site é servido pelo GitHub Pages como arquivo
 * estático, e qualquer servidor com mais recursos do que isso testaria algo
 * diferente do que roda em produção.
 *
 *   node scripts/serve.mjs [porta]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.argv[2]) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

async function resolve(urlPath) {
  // normalize() impede que "../" escape da raiz do projeto.
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, clean);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    return file;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const file = await resolve(req.url || '/');
  if (!file) {
    const notFound = join(ROOT, '404.html');
    try {
      const body = await readFile(notFound);
      res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(500).end('Server error');
  }
}).listen(PORT, () => {
  console.warn(`Servindo ${ROOT} em http://localhost:${PORT}`);
});
