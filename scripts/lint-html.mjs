/**
 * Valida o HTML gerado: a página de cada idioma de src/idiomas.json, as
 * páginas de demonstração de cada idioma (app, painel, player em tela cheia
 * e redirecionamento, geradas por scripts/mockups.mjs) e a 404.
 *
 * A lista de arquivos vem da configuração, para um idioma novo entrar no
 * lint sem ninguém editar o package.json. Um glob de "index.html" em
 * qualquer pasta faria o mesmo por acaso e pegaria também o relatório do
 * Playwright (playwright-report/index.html) e o que mais aparecesse. Das
 * demonstrações entra só o index.html de cada pasta (o glob é resolvido pelo
 * html-validate): os app.html são mockups versionados à mão, fora do lint.
 * Roda o mesmo html-validate de antes, com a mesma configuração e a mesma
 * saída.
 *
 *   node scripts/lint-html.mjs
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerIdiomasOuSair } from './idiomas.mjs';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const executavel = join(
  dirname(require.resolve('html-validate/package.json')),
  'bin',
  'html-validate.js'
);

const idiomas = lerIdiomasOuSair();
const arquivos = [
  ...idiomas.map((idioma) => idioma.arquivo),
  '404.html',
  ...idiomas.map((idioma) => `${idioma.pasta}demos/**/index.html`)
];
const { status, error } = spawnSync(process.execPath, [executavel, ...arquivos], {
  cwd: RAIZ,
  stdio: 'inherit'
});
if (error) throw error;
process.exit(status ?? 1);
