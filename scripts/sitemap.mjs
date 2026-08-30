/**
 * Gera sitemap.xml com a data do último commit que tocou o site.
 *
 * O `lastmod` era preenchido à mão e por isso divergia: marcava 2026-08-28
 * enquanto o site havia mudado em 30/08, com nove commits no intervalo. Um
 * campo que precisa de disciplina humana para ficar correto vai ficar errado.
 *
 *   node scripts/sitemap.mjs
 */
import { writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const executar = promisify(execFile);
const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const BASE = 'https://ildeanfreitas.github.io/';

// Só arquivos que o visitante recebe. Mudança em src/ que não altere a saída
// não deveria mexer no lastmod.
const RASTREADOS = ['index.html', 'assets'];

async function ultimaData() {
  try {
    const { stdout } = await executar('git', ['log', '-1', '--format=%cs', '--', ...RASTREADOS], {
      cwd: RAIZ
    });
    const data = stdout.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  } catch {
    /* Sem git disponível (tarball, por exemplo): cai para hoje. */
  }
  return new Date().toISOString().slice(0, 10);
}

const lastmod = await ultimaData();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

await writeFile(join(RAIZ, 'sitemap.xml'), xml, 'utf8');
console.warn(`sitemap.xml gerado — lastmod ${lastmod}`);
