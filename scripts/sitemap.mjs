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
 *   node scripts/sitemap.mjs           gera
 *   node scripts/sitemap.mjs --check   confere se está atualizado
 *
 * O `--check` compara tudo menos o `lastmod`: a data muda sozinha a cada dia
 * com alteração pendente, e uma conferência que acusasse isso falharia no CI
 * sem apontar defeito. O que ele pega é o que o `build:check` já pega nas
 * páginas: um idioma novo na configuração, ou um app ou painel novo, sem o
 * sitemap regenerado.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { COLECOES } from './demos.mjs';
import { lerIdiomasOuSair } from './idiomas.mjs';

const executar = promisify(execFile);
const RAIZ = fileURLToPath(new URL('..', import.meta.url));

const hoje = () => new Date().toISOString().slice(0, 10);

/**
 * As páginas de demonstração que entram no sitemap: a de cada app de Power
 * Apps e a de cada painel de Power BI (COLECOES em scripts/demos.mjs), como
 * caminho sem barra nas pontas ("demos/power-apps/inspecao-via"). Ficam de
 * fora, por serem noindex: as antigas galerias (/demos/power-apps/ e
 * /demos/power-bi/, hoje redirecionamento para a home), o player em tela
 * cheia e os app.html.
 */
export const demonstracoes = () =>
  Object.values(COLECOES).flatMap((col) => col.dados.map((c) => `${col.demos}/${c.slug}`));

/**
 * O texto do sitemap.xml: uma <url> por idioma, na ordem da configuração, e
 * depois uma por idioma para cada página de demonstração (`demos`, lista de
 * caminhos; ver demonstracoes). Toda página declara as mesmas alternativas:
 * ela mesma em todos os idiomas, mais x-default no padrão (o mesmo conjunto
 * do <head> de cada página).
 */
export function montarSitemap(idiomas, lastmod, demos = []) {
  const padrao = idiomas.find((idioma) => idioma.padrao);
  const grupo = (sufixo, prioridade) => {
    const alternativas = [
      ...idiomas.map(
        (idioma) =>
          `    <xhtml:link rel="alternate" hreflang="${idioma.lang}" href="${idioma.url}${sufixo}"/>`
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${padrao.url}${sufixo}"/>`
    ].join('\n');
    return idiomas.map(
      (idioma) => `  <url>
    <loc>${idioma.url}${sufixo}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${prioridade(idioma)}</priority>
${alternativas}
  </url>`
    );
  };

  const urls = [
    ...grupo('', (idioma) => (idioma.padrao ? '1.0' : '0.8')),
    ...demos.flatMap((caminho) => grupo(`${caminho}/`, () => '0.6'))
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

/** O sitemap sem as datas (e com fim de linha LF), para comparar o que não muda sozinho. */
export const semLastmod = (xml) =>
  xml.replace(/\r\n/g, '\n').replace(/<lastmod>[^<]*<\/lastmod>/g, '<lastmod/>');

async function ultimaData(rastreados) {
  try {
    const { stdout: pendente } = await executar(
      'git',
      ['status', '--porcelain', '--', ...rastreados],
      {
        cwd: RAIZ
      }
    );
    if (pendente.trim()) return hoje();

    const { stdout } = await executar('git', ['log', '-1', '--format=%cs', '--', ...rastreados], {
      cwd: RAIZ
    });
    const data = stdout.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  } catch {
    /* Sem git disponível (tarball, por exemplo): cai para hoje. */
  }
  return hoje();
}

async function principal() {
  const IDIOMAS = lerIdiomasOuSair();
  const caminho = join(RAIZ, 'sitemap.xml');

  if (process.argv.includes('--check')) {
    const atual = await readFile(caminho, 'utf8').catch(() => null);
    const esperado = montarSitemap(IDIOMAS, hoje(), demonstracoes());
    if (atual === null || semLastmod(atual) !== semLastmod(esperado)) {
      console.error(
        'sitemap.xml está desatualizado em relação a src/idiomas.json ou à lista de demonstrações (src/data/mockups-*.json). Rode: npm run build'
      );
      process.exit(1);
    }
    console.warn('sitemap.xml está atualizado (o lastmod não entra na comparação).');
    return;
  }

  // Só arquivos que o visitante recebe: a página de cada idioma, os assets e
  // as demonstrações. Mudança em src/ que não altere a saída não deveria mexer
  // no lastmod.
  const lastmod = await ultimaData([
    ...IDIOMAS.map((idioma) => idioma.arquivo),
    'assets',
    ...IDIOMAS.map((idioma) => `${idioma.pasta}demos`)
  ]);
  await writeFile(caminho, montarSitemap(IDIOMAS, lastmod, demonstracoes()), 'utf8');
  console.warn(`sitemap.xml gerado — lastmod ${lastmod}`);
}

// Importável pelos testes sem gerar nada: só roda quando é o arquivo executado.
// `.native` devolve a grafia canônica do caminho (no Windows, a letra do drive
// pode vir em caixa diferente em argv e em import.meta.url).
if (
  process.argv[1] &&
  realpathSync.native(process.argv[1]) === realpathSync.native(fileURLToPath(import.meta.url))
)
  await principal();
