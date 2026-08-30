/**
 * Monta index.html a partir de src/.
 *
 * Node puro, sem dependência e sem bundler: o resultado precisa ser
 * inspecionável a olho, porque é ele que vai para produção.
 *
 * A separação é só na origem. A entrega continua sendo um arquivo único com
 * CSS e JavaScript embutidos — um portfólio é visto uma vez, por alguém
 * avaliando, e CSS externo custaria um round trip bloqueante na primeira
 * visita, que é a única que importa aqui.
 *
 *   node scripts/build.mjs           monta
 *   node scripts/build.mjs --check   verifica se o index.html está atualizado
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const conferir = process.argv.includes('--check');

const ler = (caminho) => readFile(join(RAIZ, caminho), 'utf8');

const ordem = JSON.parse(await ler('src/css/ordem.json'));

const css = (
  await Promise.all(ordem.map(async (arquivo) => (await ler(join('src/css', arquivo))).trimEnd()))
).join('\n\n');

const [template, jsInicializacao, jsPrincipal] = await Promise.all([
  ler('src/index.template.html'),
  ler('src/js/inicializacao.js'),
  ler('src/js/principal.js')
]);

const MARCADORES = {
  '<!--{{ CSS }}-->': css,
  '<!--{{ JS_INICIALIZACAO }}-->': jsInicializacao.trimEnd(),
  '<!--{{ JS_PRINCIPAL }}-->': jsPrincipal.trimEnd()
};

let saida = template;
for (const [marcador, conteudo] of Object.entries(MARCADORES)) {
  if (!saida.includes(marcador)) {
    console.error(`Marcador ausente no template: ${marcador}`);
    process.exit(1);
  }
  // Função em vez de string: $& e $1 num CSS seriam interpretados como
  // referência de captura e corromperiam a saída silenciosamente.
  saida = saida.replace(marcador, () => conteudo);
}

const restante = saida.match(/<!--\{\{[^}]*\}\}-->/);
if (restante) {
  console.error(`Marcador não resolvido na saída: ${restante[0]}`);
  process.exit(1);
}

if (conferir) {
  const atual = await ler('index.html');
  if (atual !== saida) {
    console.error('index.html está desatualizado em relação a src/. Rode: npm run build');
    process.exit(1);
  }
  console.warn('index.html está atualizado.');
} else {
  await writeFile(join(RAIZ, 'index.html'), saida, 'utf8');
  console.warn(`index.html montado — ${ordem.length} arquivos de CSS, 2 de JavaScript.`);
}
