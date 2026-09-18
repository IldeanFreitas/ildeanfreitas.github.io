/**
 * Gera sitemap.xml com a data da última mudança que o visitante recebe.
 *
 * O `lastmod` era preenchido à mão e por isso divergia: marcava 2026-08-28
 * enquanto o site havia mudado em 30/08, com nove commits no intervalo. Um
 * campo que precisa de disciplina humana para ficar correto vai ficar errado.
 *
 * A segunda versão usava a data do último commit — e atrasava um commit:
 * o build roda ANTES do commit que o contém, então `git log -1` ainda via o
 * commit anterior. Agora, se houver mudança não commitada nos arquivos que o
 * visitante recebe, a data é a de hoje; senão, a do último commit.
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
const RASTREADOS = ['index.html', 'en/index.html', 'assets'];

const hoje = () => new Date().toISOString().slice(0, 10);

async function ultimaData() {
  try {
    const { stdout: pendente } = await executar(
      'git',
      ['status', '--porcelain', '--', ...RASTREADOS],
      {
        cwd: RAIZ
      }
    );
    if (pendente.trim()) return hoje();

    const { stdout } = await executar('git', ['log', '-1', '--format=%cs', '--', ...RASTREADOS], {
      cwd: RAIZ
    });
    const data = stdout.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  } catch {
    /* Sem git disponível (tarball, por exemplo): cai para hoje. */
  }
  return hoje();
}

const lastmod = await ultimaData();

const alternativas = `    <xhtml:link rel="alternate" hreflang="pt-BR" href="${BASE}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${BASE}en/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}"/>`;

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${BASE}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
${alternativas}
  </url>
  <url>
    <loc>${BASE}en/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
${alternativas}
  </url>
</urlset>
`;

await writeFile(join(RAIZ, 'sitemap.xml'), xml, 'utf8');
console.warn(`sitemap.xml gerado — lastmod ${lastmod}`);
