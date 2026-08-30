/**
 * Extração única da etapa 2.
 *
 * Recorta o CSS e o JavaScript embutidos em index.html para `src/`, e escreve
 * `src/index.template.html` com marcadores no lugar deles. Roda uma vez; depois
 * disso a fonte é `src/` e quem monta o `index.html` é `scripts/build.mjs`.
 *
 * Fica versionado como registro de como a separação foi feita — refazê-la à mão
 * a partir de um `index.html` mais novo daria um resultado diferente e silencioso.
 *
 *   node scripts/extrair.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

// Fatias do CSS, por linha de início (1-based, inclusive). O fim de cada uma é
// o início da seguinte; a última vai até o fechamento do <style>.
const FATIAS_CSS = [
  [44, 'base/fonte.css'],
  [69, 'base/tokens.css'],
  [147, 'base/elementos.css'],
  [195, 'componentes/cabecalho.css'],
  [235, 'componentes/botoes.css'],
  [251, 'componentes/hero.css'],
  [304, 'componentes/cartoes.css'],
  [359, 'componentes/fluxo.css'],
  [373, 'componentes/diagrama.css'],
  [421, 'componentes/case-visual.css'],
  [446, 'componentes/linha-do-tempo.css'],
  [465, 'componentes/formacao.css'],
  [478, 'componentes/rodape.css'],
  [495, 'base/utilitarios.css']
];

const LIMITES = {
  cssInicio: 43, // linha do <style>
  cssFim: 508, // linha do </style>
  headInicio: 509, // <script> do topo
  headFim: 540,
  mainInicio: 1173, // <script> do rodapé
  mainFim: 1342
};

const linhas = (await readFile(join(RAIZ, 'index.html'), 'utf8')).split('\n');
const fatiar = (de, ate) => linhas.slice(de - 1, ate).join('\n');

await mkdir(join(RAIZ, 'src/css/base'), { recursive: true });
await mkdir(join(RAIZ, 'src/css/componentes'), { recursive: true });
await mkdir(join(RAIZ, 'src/js'), { recursive: true });

// --- CSS -------------------------------------------------------------------
const ordem = [];
for (let i = 0; i < FATIAS_CSS.length; i++) {
  const [inicio, arquivo] = FATIAS_CSS[i];
  const fim = i + 1 < FATIAS_CSS.length ? FATIAS_CSS[i + 1][0] - 1 : LIMITES.cssFim - 1;
  await writeFile(join(RAIZ, 'src/css', arquivo), fatiar(inicio, fim).trim() + '\n', 'utf8');
  ordem.push(arquivo);
}
await writeFile(join(RAIZ, 'src/css/ordem.json'), JSON.stringify(ordem, null, 2) + '\n', 'utf8');

// --- JavaScript ------------------------------------------------------------
await writeFile(
  join(RAIZ, 'src/js/inicializacao.js'),
  fatiar(LIMITES.headInicio + 1, LIMITES.headFim - 1).trim() + '\n',
  'utf8'
);
await writeFile(
  join(RAIZ, 'src/js/principal.js'),
  fatiar(LIMITES.mainInicio + 1, LIMITES.mainFim - 1).trim() + '\n',
  'utf8'
);

// --- Template --------------------------------------------------------------
const template = [
  fatiar(1, LIMITES.cssInicio - 1),
  '<style>',
  '<!--{{ CSS }}-->',
  '</style>',
  '<script>',
  '<!--{{ JS_INICIALIZACAO }}-->',
  '</script>',
  fatiar(LIMITES.headFim + 1, LIMITES.mainInicio - 1),
  '<script>',
  '<!--{{ JS_PRINCIPAL }}-->',
  '</script>',
  fatiar(LIMITES.mainFim + 1, linhas.length)
].join('\n');

await writeFile(join(RAIZ, 'src/index.template.html'), template, 'utf8');

console.warn(`CSS  : ${ordem.length} arquivos`);
console.warn('JS   : inicializacao.js, principal.js');
console.warn('HTML : src/index.template.html');
