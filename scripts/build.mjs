/**
 * Monta index.html, en/index.html e 404.html a partir de src/.
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
 *   node scripts/build.mjs --check   verifica se os artefatos estão atualizados
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { FLUENT, renderizarCases, spriteFluent, ErroDeCase } from './cases.mjs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

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

const [cases, casesEn] = await Promise.all([
  ler('src/data/cases.json').then(JSON.parse),
  ler('src/data/cases.en.json').then(JSON.parse)
]);

const [template, templateEn, template404, jsInicializacao, jsPrincipal] = await Promise.all([
  ler('src/index.template.html'),
  ler('src/index.en.template.html'),
  ler('src/404.template.html'),
  ler('src/js/inicializacao.js'),
  ler('src/js/principal.js')
]);

/**
 * Todo ícone que um template cita (ícone de fornecedor ou neutro) precisa
 * estar registrado em assets/icons/manifest.json, com fonte, termos e
 * SHA-256. Os cases já passam por essa conferência em cases.mjs; as tags da
 * seção Especialidades são marcação escrita à mão, então a conferência fica
 * aqui, e o build para antes de publicar um ícone sem proveniência.
 */
{
  const manifesto = JSON.parse(await ler('assets/icons/manifest.json'));
  const registrados = new Set(
    (manifesto.assets || []).flatMap((a) => [a.path, ...(a.files || []).map((f) => f.path)])
  );
  const problemas = [];
  for (const [arquivo, texto] of [
    ['src/index.template.html', template],
    ['src/index.en.template.html', templateEn]
  ]) {
    for (const [, caminho] of texto.matchAll(/\/(assets\/icons\/(?:vendor|neutral)\/[^"')\s]+)/g)) {
      if (!registrados.has(caminho))
        problemas.push(`sem registro no manifesto: ${caminho} (${arquivo})`);
      else if (!existsSync(join(RAIZ, caminho)))
        problemas.push(`registrado, mas o arquivo não existe: ${caminho} (${arquivo})`);
    }
    for (const [, nome] of texto.matchAll(/<use href="#i-([\w-]+)">/g)) {
      if (!FLUENT.includes(nome))
        problemas.push(`ícone neutro "${nome}" não está em FLUENT, scripts/cases.mjs (${arquivo})`);
    }
  }
  if (problemas.length) {
    console.error(`Ícones dos templates com problema:\n  ${[...new Set(problemas)].join('\n  ')}`);
    process.exit(1);
  }
}

/**
 * As duas línguas são dois templates, não um template com dicionário: o
 * texto corrido do site (hero, sobre, trajetória) não se traduz bem por
 * chave, e um template que só tivesse marcadores ficaria ilegível.
 *
 * O preço da duplicação é a deriva silenciosa — alguém acrescenta uma seção
 * em português e esquece a inglesa. Esta verificação cobra esse preço no
 * build: os dois templates precisam ter o mesmo esqueleto de marcação. Só o
 * texto e os atributos que carregam texto podem diferir.
 */
function esqueleto(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      '<script type="application/ld+json"></script>'
    )
    .replace(
      /\s+(lang|hreflang|href|content|aria-label|alt|title|datetime|data-[\w-]+)="[^"]*"/g,
      ''
    )
    .replace(/>[^<]*</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

function conferirEsqueletos() {
  const pt = esqueleto(template);
  const en = esqueleto(templateEn);
  if (pt === en) return true;
  // Aponta o primeiro ponto de divergência para a correção ser direta.
  let i = 0;
  while (i < pt.length && pt[i] === en[i]) i++;
  console.error('Os templates pt-BR e en divergem na estrutura de marcação.');
  console.error(`  pt: …${pt.slice(Math.max(0, i - 80), i + 120)}`);
  console.error(`  en: …${en.slice(Math.max(0, i - 80), i + 120)}`);
  return false;
}

if (!conferirEsqueletos()) process.exit(1);

if (cases.length !== casesEn.length || cases.some((c, i) => c.id !== casesEn[i].id)) {
  console.error('cases.json e cases.en.json precisam ter os mesmos cases, na mesma ordem.');
  process.exit(1);
}

/**
 * A 404 é servida sozinha, então precisa carregar o próprio CSS. Mas recebe a
 * fonte e os tokens dos MESMOS arquivos que o index usa — sem isso ela
 * derivou para outra marca (azul-marinho, teal, fonte de sistema) sem ninguém
 * notar, porque nada liga uma página à outra.
 */
/**
 * Dado de case inválido (ícone ou marca desconhecida, campo ausente, formato
 * de diagrama que o renderizador não reconhece) para o build com a mensagem
 * do gerador, sem pilha: ela já diz case, bloco e valor.
 */
function renderizar(lista, idioma, arquivo, textoDoTemplate) {
  try {
    // O sprite vai junto dos cases: só os ícones Fluent que esta página usa,
    // inclusive os das tags do próprio template (seção Especialidades).
    const html = renderizarCases(lista, idioma);
    return `${spriteFluent(`${html}\n${textoDoTemplate}`)}\n${html}`;
  } catch (erro) {
    if (!(erro instanceof ErroDeCase)) throw erro;
    console.error(`Dado de case inválido em ${arquivo}: ${erro.message}`);
    process.exit(1);
  }
}

const css404 = [
  (await ler('src/css/base/fonte.css')).trimEnd(),
  (await ler('src/css/base/tokens.css')).trimEnd()
].join('\n\n');

/**
 * Os fontes escrevem caminhos de asset absolutos (`/assets/…`), que é o que
 * se lê melhor e não depende de onde o trecho vai parar. A saída troca esses
 * caminhos por relativos à página: `assets/…` na raiz e `../assets/…` em
 * `/en/`. Assim o site funciona servido (GitHub Pages, `npm run serve`) E
 * aberto direto do disco (file://), onde `/assets/` apontaria para a raiz do
 * drive e todas as imagens e a fonte sumiriam. (Os ícones Fluent não
 * dependem disso: vêm do sprite inline, ver spriteFluent em cases.mjs.)
 *
 * Só caminhos que começam logo depois de aspa ou parêntese são trocados:
 * `https://…/assets/…` (og:image, JSON-LD) fica intacto, e os links de
 * navegação (`/`, `/en/`) não casam o padrão.
 *
 * A 404 NÃO passa por aqui: o GitHub Pages a serve em qualquer profundidade
 * de URL (/a/b/c), e um caminho relativo resolveria errado.
 */
const RAIZ_DE_ARQUIVOS = ['favicon.ico', 'apple-touch-icon.png'];

function relativizar(html, prefixo, arquivo) {
  const saida = html
    .replace(/(["'(])\/assets\//g, (_, abre) => `${abre}${prefixo}assets/`)
    .replace(
      new RegExp(
        `(["'(])/(${RAIZ_DE_ARQUIVOS.map((a) => a.replaceAll('.', '\\.')).join('|')})`,
        'g'
      ),
      (_, abre, nome) => `${abre}${prefixo}${nome}`
    );
  const sobra = saida.match(/.{0,40}(?<![\w.])\/assets\/.{0,20}/);
  if (sobra) {
    console.error(`Caminho /assets/ absoluto não convertido em ${arquivo}: ${sobra[0]}`);
    process.exit(1);
  }
  return saida;
}

const PAGINAS = [
  {
    arquivo: 'index.html',
    prefixo: '',
    template,
    marcadores: {
      '<!--{{ CSS }}-->': css,
      '<!--{{ CASES }}-->': renderizar(cases, 'pt', 'src/data/cases.json', template),
      '<!--{{ JS_INICIALIZACAO }}-->': jsInicializacao.trimEnd(),
      '<!--{{ JS_PRINCIPAL }}-->': jsPrincipal.trimEnd()
    }
  },
  {
    arquivo: 'en/index.html',
    prefixo: '../',
    template: templateEn,
    marcadores: {
      '<!--{{ CSS }}-->': css,
      '<!--{{ CASES }}-->': renderizar(casesEn, 'en', 'src/data/cases.en.json', templateEn),
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

  // A 404 não declara prefixo e mantém os caminhos absolutos (ver relativizar).
  if (pagina.prefixo !== undefined) saida = relativizar(saida, pagina.prefixo, pagina.arquivo);

  if (conferir) {
    const atual = await ler(pagina.arquivo).catch(() => null);
    if (atual !== saida) {
      console.error(`${pagina.arquivo} está desatualizado em relação a src/. Rode: npm run build`);
      desatualizado = true;
    }
  } else {
    await mkdir(dirname(join(RAIZ, pagina.arquivo)), { recursive: true });
    await writeFile(join(RAIZ, pagina.arquivo), saida, 'utf8');
  }
}

if (conferir) {
  if (desatualizado) process.exit(1);
  console.warn('index.html, en/index.html e 404.html estão atualizados.');
} else {
  console.warn(
    `Montados: index.html e en/index.html (${ordem.length} arquivos de CSS, ${cases.length} cases) e 404.html.`
  );
}
