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

/**
 * Camadas da cascata.
 *
 * A ordem declarada aqui decide quem vence, independentemente de
 * especificidade: `utilitarios` ganha de `componentes`, que ganha de `base`.
 *
 * Não é enfeite arquitetural — resolve um conflito concreto. Ao trocar os
 * atributos `style` por classes, os utilitários passaram a perder para regras
 * de componente como `.card p:last-of-type` (0,2,1), e o texto voltava
 * silenciosamente ao tamanho do cartão. As saídas seriam duplicar seletores
 * até vencer, o que vira corrida armamentista, ou `!important`, que ninguém
 * consegue desfazer depois. A camada resolve na origem.
 *
 * `fonte` fica fora de camada: @font-face e :root não participam de conflito
 * de cascata, e mantê-los sem camada evita surpresa se um dia forem
 * sobrescritos por CSS de terceiro.
 */
const CAMADAS = { 'base/fonte.css': null, 'base/tokens.css': null };
const camadaDe = (arquivo) =>
  arquivo in CAMADAS ? CAMADAS[arquivo] : arquivo.startsWith('base/') ? 'base' : 'componentes';

const partes = await Promise.all(
  ordem.map(async (arquivo) => {
    const conteudo = (await ler(join('src/css', arquivo))).trimEnd();
    // utilitarios.css mora em base/ mas pertence à camada de cima.
    const camada = arquivo === 'base/utilitarios.css' ? 'utilitarios' : camadaDe(arquivo);
    if (!camada) return conteudo;
    return `@layer ${camada}{\n${conteudo}\n}`;
  })
);

const css = ['@layer base,componentes,utilitarios;', ...partes].join('\n\n');

const [template, template404, jsInicializacao, jsPrincipal] = await Promise.all([
  ler('src/index.template.html'),
  ler('src/404.template.html'),
  ler('src/js/inicializacao.js'),
  ler('src/js/principal.js')
]);

/**
 * A 404 é servida sozinha, então precisa carregar o próprio CSS. Mas recebe a
 * fonte e os tokens dos MESMOS arquivos que o index usa — sem isso ela
 * derivou para outra marca (azul-marinho, teal, fonte de sistema) sem ninguém
 * notar, porque nada liga uma página à outra.
 */
const css404 = [
  (await ler('src/css/base/fonte.css')).trimEnd(),
  (await ler('src/css/base/tokens.css')).trimEnd()
].join('\n\n');

const PAGINAS = [
  {
    arquivo: 'index.html',
    template,
    marcadores: {
      '<!--{{ CSS }}-->': css,
      '<!--{{ JS_INICIALIZACAO }}-->': jsInicializacao.trimEnd(),
      '<!--{{ JS_PRINCIPAL }}-->': jsPrincipal.trimEnd()
    }
  },
  {
    arquivo: '404.html',
    template: template404,
    marcadores: { '<!--{{ CSS_404 }}-->': css404 }
  }
];

let desatualizado = false;

for (const pagina of PAGINAS) {
  let saida = pagina.template;

  for (const [marcador, conteudo] of Object.entries(pagina.marcadores)) {
    if (!saida.includes(marcador)) {
      console.error(`Marcador ausente em ${pagina.arquivo}: ${marcador}`);
      process.exit(1);
    }
    // Função em vez de string: $& e $1 num CSS seriam interpretados como
    // referência de captura e corromperiam a saída silenciosamente.
    saida = saida.replace(marcador, () => conteudo);
  }

  const restante = saida.match(/<!--\{\{[^}]*\}\}-->/);
  if (restante) {
    console.error(`Marcador não resolvido em ${pagina.arquivo}: ${restante[0]}`);
    process.exit(1);
  }

  if (conferir) {
    const atual = await ler(pagina.arquivo).catch(() => null);
    if (atual !== saida) {
      console.error(`${pagina.arquivo} está desatualizado em relação a src/. Rode: npm run build`);
      desatualizado = true;
    }
  } else {
    await writeFile(join(RAIZ, pagina.arquivo), saida, 'utf8');
  }
}

if (conferir) {
  if (desatualizado) process.exit(1);
  console.warn('index.html e 404.html estão atualizados.');
} else {
  console.warn(`Montados: index.html (${ordem.length} arquivos de CSS) e 404.html.`);
}
