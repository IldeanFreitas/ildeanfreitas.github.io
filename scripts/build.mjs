/**
 * Monta uma página por idioma de src/idiomas.json (index.html, en/index.html…)
 * e a 404.html a partir de src/.
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
import {
  FLUENT,
  renderizarCases,
  spriteFluent,
  conferirDicionario,
  ErroDeCase,
  iconesDasAreas
} from './cases.mjs';
import { conferirDemos } from './demos.mjs';
import { BASE, lerIdiomasOuSair } from './idiomas.mjs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const conferir = process.argv.includes('--check');

const ler = (caminho) => readFile(join(RAIZ, caminho), 'utf8');

/** "a", "a e b", "a, b e c": mensagens que nomeiam uma lista de arquivos. */
const juntar = (itens) =>
  itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`;

/** Para o build com uma lista de problemas, um por linha. */
function falhar(titulo, problemas) {
  console.error(`${titulo}\n  ${[...new Set(problemas)].join('\n  ')}`);
  process.exit(1);
}

/**
 * Os idiomas do site, na ordem do menu, com os caminhos já derivados pela
 * convenção de nome (ver scripts/idiomas.mjs). Configuração inválida ou
 * arquivo de idioma ausente para o build aqui, antes de qualquer leitura.
 */
const IDIOMAS = lerIdiomasOuSair();
const PADRAO = IDIOMAS.find((idioma) => idioma.padrao);
const OUTROS = IDIOMAS.filter((idioma) => !idioma.padrao);

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

/** Template e cases de cada idioma, lidos uma vez. */
const FONTES = new Map(
  await Promise.all(
    IDIOMAS.map(async (idioma) => {
      const [template, casesTexto] = await Promise.all([ler(idioma.template), ler(idioma.cases)]);
      let cases;
      try {
        cases = JSON.parse(casesTexto);
      } catch (erro) {
        falhar(`${idioma.cases} não é JSON válido:`, [erro.message]);
      }
      if (!Array.isArray(cases))
        falhar(`${idioma.cases} inválido:`, ['esperada uma lista de cases']);
      return [idioma.codigo, { template, cases }];
    })
  )
);
const fonteDe = (idioma) => FONTES.get(idioma.codigo);

const [template404, jsInicializacao, jsPrincipal] = await Promise.all([
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
  for (const idioma of IDIOMAS) {
    const arquivo = idioma.template;
    const texto = fonteDe(idioma).template;
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
  if (problemas.length) falhar('Ícones dos templates com problema:', problemas);
}

/**
 * Cada idioma é um template, não um template com dicionário: o texto corrido
 * do site (hero, sobre, trajetória) não se traduz bem por chave, e um
 * template que só tivesse marcadores ficaria ilegível.
 *
 * O preço da duplicação é a deriva silenciosa — alguém acrescenta uma seção
 * em português e esquece a dos outros idiomas. Esta verificação cobra esse
 * preço no build: todo template precisa ter o mesmo esqueleto de marcação do
 * template do idioma padrão (PT-BR, a fonte da verdade). Só o texto e os
 * atributos que carregam texto podem diferir.
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

function conferirEsqueleto(idioma) {
  const referencia = esqueleto(fonteDe(PADRAO).template);
  const outro = esqueleto(fonteDe(idioma).template);
  if (referencia === outro) return true;
  // Aponta o primeiro ponto de divergência para a correção ser direta.
  let i = 0;
  while (i < referencia.length && referencia[i] === outro[i]) i++;
  console.error(
    `Os templates ${PADRAO.lang} (${PADRAO.template}) e ${idioma.lang} (${idioma.template}) divergem na estrutura de marcação.`
  );
  console.error(`  ${PADRAO.codigo}: …${referencia.slice(Math.max(0, i - 80), i + 120)}`);
  console.error(`  ${idioma.codigo}: …${outro.slice(Math.max(0, i - 80), i + 120)}`);
  return false;
}

if (!OUTROS.map(conferirEsqueleto).every(Boolean)) process.exit(1);

{
  const ids = (idioma) => fonteDe(idioma).cases.map((c) => c?.id);
  const referencia = ids(PADRAO).join('\n');
  const divergentes = OUTROS.filter((idioma) => ids(idioma).join('\n') !== referencia);
  if (divergentes.length)
    falhar(
      'Os cases precisam ser os mesmos, na mesma ordem, em todos os idiomas:',
      divergentes.map(
        (idioma) =>
          `${idioma.cases} diverge de ${PADRAO.cases} (${ids(idioma).join(', ')} × ${ids(PADRAO).join(', ')})`
      )
    );
}

/**
 * Frases fixas dos diagramas e rótulos da seção Cases (abas, busca, filtros,
 * blocos, áreas): uma entrada por idioma no DICIONARIO de cases.mjs, com as
 * mesmas chaves do padrão, em todos os níveis. Chave faltando imprimiria
 * "undefined" só na página daquele idioma.
 */
{
  const problemas = conferirDicionario(
    IDIOMAS.map((idioma) => idioma.codigo),
    PADRAO.codigo
  );
  if (problemas.length)
    falhar('Dicionário dos diagramas e das abas (scripts/cases.mjs) incompleto:', problemas);
}

/**
 * Demonstrações (apps de Power Apps e painéis de Power BI): os textos fixos,
 * os rótulos traduzidos das tecnologias e os campos de src/data/mockups-*.json
 * precisam existir em todo idioma. Sem isso o cartão sairia com "undefined"
 * na aba daquele idioma.
 */
{
  const problemas = conferirDemos(
    IDIOMAS.map((idioma) => idioma.codigo),
    PADRAO.codigo
  );
  if (problemas.length) falhar('Textos das demonstrações incompletos:', problemas);
}

/**
 * O que a configuração decide não pode estar escrito à mão no template:
 *
 * - `<html lang>` precisa ser o `lang` do idioma (a 404, o do padrão);
 * - canonical, hreflang, og:locale, og:url e og:image saem dos marcadores
 *   <!--{{ IDIOMAS_* }}-->, para que nenhum template liste os outros idiomas;
 * - a `url` do JSON-LD é o endereço da própria página.
 */
{
  const problemas = [];
  const MANUAIS = [
    [
      'hreflang=',
      'links de idioma saem de IDIOMAS_LINKS, IDIOMAS_MENU, IDIOMAS_RODAPE e IDIOMAS_404'
    ],
    ['rel="canonical"', 'sai do marcador IDIOMAS_LINKS'],
    ['property="og:locale', 'sai do marcador IDIOMAS_OG_LOCALE'],
    ['property="og:url"', 'sai do marcador IDIOMAS_OG_URL'],
    ['property="og:image"', 'sai do marcador IDIOMAS_OG_URL']
  ];
  const paginas = [
    ...IDIOMAS.map((idioma) => [idioma.template, fonteDe(idioma).template, idioma]),
    ['src/404.template.html', template404, PADRAO]
  ];
  for (const [arquivo, texto, idioma] of paginas) {
    const lang = texto.match(/<html\b[^>]*\blang="([^"]*)"/)?.[1];
    if (lang !== idioma.lang)
      problemas.push(`${arquivo}: <html lang="${lang ?? ''}">, esperado "${idioma.lang}"`);
    for (const [trecho, marcador] of MANUAIS) {
      const linha = texto.split('\n').findIndex((l) => l.includes(trecho));
      if (linha >= 0)
        problemas.push(`${arquivo}:${linha + 1}: ${trecho} escrito à mão (${marcador})`);
    }
  }
  for (const idioma of IDIOMAS) {
    const bloco = fonteDe(idioma).template.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    )?.[1];
    if (!bloco) continue;
    let url;
    try {
      url = JSON.parse(bloco).url;
    } catch (erro) {
      problemas.push(`${idioma.template}: JSON-LD inválido (${erro.message})`);
      continue;
    }
    if (url !== idioma.url)
      problemas.push(`${idioma.template}: JSON-LD com "url" ${url}, esperado ${idioma.url}`);
  }
  if (problemas.length) falhar('Templates em desacordo com src/idiomas.json:', problemas);
}

// A área decide a sessão (aba) do case; idiomas com áreas diferentes
// publicariam páginas com abas diferentes, e a comparação de esqueleto não
// veria (ela olha só os templates). A validade do valor fica em cases.mjs.
{
  const areas = fonteDe(PADRAO).cases;
  const problemas = OUTROS.flatMap((idioma) =>
    fonteDe(idioma)
      .cases.filter((c, i) => c?.area !== areas[i]?.area)
      .map((c) => `${idioma.cases}: case "${c.id}" com "area" diferente de ${PADRAO.cases}`)
  );
  if (problemas.length)
    falhar('A "area" de cada case precisa ser a mesma em todos os idiomas:', problemas);
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
    // inclusive os das tags do próprio template (seção Especialidades). Cada
    // aba da seção Cases leva o ícone do cartão de Especialidades da sua área.
    const html = renderizarCases(lista, idioma, { iconesArea: iconesDasAreas(textoDoTemplate) });
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
 * caminhos por relativos à página: `assets/…` na raiz e um `../` por nível
 * de pasta nos outros idiomas (`../assets/…` em `/en/`). Assim o site
 * funciona servido (GitHub Pages, `npm run serve`) E aberto direto do disco
 * (file://), onde `/assets/` apontaria para a raiz do drive e todas as
 * imagens e a fonte sumiriam. (Os ícones Fluent não dependem disso: vêm do
 * sprite inline, ver spriteFluent em cases.mjs.)
 *
 * Só caminhos que começam logo depois de aspa ou parêntese são trocados:
 * `https://…/assets/…` (og:image, JSON-LD) fica intacto, e os links de
 * navegação entre idiomas (`/`, `/en/`) não casam o padrão.
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

/* ---------------------------------------------------------------------------
 * Marcação de idioma gerada
 *
 * Tudo o que cita mais de um idioma sai daqui, da configuração: os links do
 * <head>, o menu do cabeçalho, os links do rodapé e os botões da 404. Assim
 * nenhum template lista os outros idiomas, e um idioma novo aparece em todas
 * as páginas sem que nenhuma delas seja editada. Todo link de idioma leva
 * `hreflang` (para onde vai) e `lang` (em que língua está o nome dele).
 * ------------------------------------------------------------------------- */

const attr = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const linkDeIdioma = (idioma, extra = '') =>
  `<a${extra} href="${attr(idioma.caminho)}" hreflang="${attr(idioma.lang)}" lang="${attr(idioma.lang)}">${attr(idioma.rotulo)}</a>`;

/** Canonical e hreflang de todos os idiomas, mais x-default no padrão. */
const linksDoHead = (atual) =>
  [
    `<link rel="canonical" href="${attr(atual.url)}">`,
    ...IDIOMAS.map(
      (idioma) =>
        `<link rel="alternate" hreflang="${attr(idioma.lang)}" href="${attr(idioma.url)}">`
    ),
    `<link rel="alternate" hreflang="x-default" href="${attr(PADRAO.url)}">`
  ].join('\n');

const ogLocale = (atual) =>
  [
    `<meta property="og:locale" content="${attr(atual.ogLocale)}">`,
    ...IDIOMAS.filter((idioma) => idioma !== atual).map(
      (idioma) => `<meta property="og:locale:alternate" content="${attr(idioma.ogLocale)}">`
    )
  ].join('\n');

const ogUrl = (atual) =>
  [
    `<meta property="og:url" content="${attr(atual.url)}">`,
    `<meta property="og:image" content="${attr(BASE + atual.ogImagem)}">`
  ].join('\n');

/** Globo no mesmo traço (2) dos ícones de menu e de tema do cabeçalho. */
const GLOBO =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z"/></svg>';

/**
 * Menu de idiomas: <details> nativo. Abre e fecha por clique, Enter e Espaço
 * sem JavaScript, e o navegador expõe o estado expandido sozinho. O script
 * (iniciar('idiomas') em principal.js) só acrescenta Esc, clique fora e
 * fechar quando o foco sai do menu.
 *
 * O nome acessível começa pela sigla visível ("PT, escolher idioma"), para
 * quem comanda por voz dizer o que vê (WCAG 2.5.3). Cada idioma é um link
 * para outra página, gerada aqui, com o nome no próprio idioma; o atual leva
 * aria-current="page".
 */
const menuDeIdiomas = (atual) =>
  [
    '<details class="idiomas" id="idiomas">',
    `  <summary class="icon-btn idiomas__botao">${GLOBO}${attr(atual.sigla)}<span class="sr-only">, ${attr(atual.interface.escolherIdioma)}</span></summary>`,
    '  <ul class="idiomas__lista">',
    ...IDIOMAS.map(
      (idioma) =>
        `    <li>${linkDeIdioma(idioma, ` class="idiomas__link"${idioma === atual ? ' aria-current="page"' : ''}`)}</li>`
    ),
    '  </ul>',
    '</details>'
  ].join('\n');

const rodapeDeIdiomas = (atual) =>
  IDIOMAS.filter((idioma) => idioma !== atual)
    .map((idioma) => `<li>${linkDeIdioma(idioma)}</li>`)
    .join('\n');

/** A 404 é do idioma padrão; os botões levam aos outros. */
const botoesDa404 = () => OUTROS.map((idioma) => linkDeIdioma(idioma)).join('\n');

const PAGINAS = [
  ...IDIOMAS.map((idioma) => {
    const { template, cases } = fonteDe(idioma);
    return {
      arquivo: idioma.arquivo,
      prefixo: idioma.prefixo,
      template,
      marcadores: {
        '<!--{{ IDIOMAS_LINKS }}-->': linksDoHead(idioma),
        '<!--{{ IDIOMAS_OG_LOCALE }}-->': ogLocale(idioma),
        '<!--{{ IDIOMAS_OG_URL }}-->': ogUrl(idioma),
        '<!--{{ CSS }}-->': css,
        '<!--{{ IDIOMAS_MENU }}-->': menuDeIdiomas(idioma),
        '<!--{{ CASES }}-->': renderizar(cases, idioma.codigo, idioma.cases, template),
        '<!--{{ IDIOMAS_RODAPE }}-->': rodapeDeIdiomas(idioma),
        '<!--{{ JS_INICIALIZACAO }}-->': jsInicializacao.trimEnd(),
        '<!--{{ JS_PRINCIPAL }}-->': jsPrincipal.trimEnd()
      }
    };
  }),
  {
    arquivo: '404.html',
    template: template404,
    marcadores: {
      '<!--{{ CSS_404 }}-->': css404,
      '<!--{{ IDIOMAS_404 }}-->': botoesDa404()
    }
  }
];

/**
 * Troca um marcador pelo conteúdo. Conteúdo de várias linhas herda o recuo
 * da linha do marcador (o menu entra no cabeçalho alinhado com os botões), e
 * conteúdo vazio num marcador sozinho na linha leva a linha junto, sem deixar
 * espaço sobrando (rodapé de um site com um idioma só).
 */
function substituir(saida, marcador, conteudo) {
  const i = saida.indexOf(marcador);
  const inicio = saida.lastIndexOf('\n', i) + 1;
  const antes = saida.slice(inicio, i);
  const recuo = /^[ \t]*$/.test(antes) ? antes : '';
  const fim = i + marcador.length;
  if (conteudo === '' && recuo === antes && saida[fim] === '\n')
    return saida.slice(0, inicio) + saida.slice(fim + 1);
  const recuado = recuo ? conteudo.replace(/\n(?=.)/g, `\n${recuo}`) : conteudo;
  return saida.slice(0, i) + recuado + saida.slice(fim);
}

let desatualizado = false;

for (const pagina of PAGINAS) {
  let saida = pagina.template;

  for (const [marcador, conteudo] of Object.entries(pagina.marcadores)) {
    if (!saida.includes(marcador)) {
      console.error(`Marcador ausente em ${pagina.arquivo}: ${marcador}`);
      process.exit(1);
    }
    // Fatia em vez de String.replace com texto: $& e $1 num CSS seriam
    // interpretados como referência de captura e corromperiam a saída.
    saida = substituir(saida, marcador, conteudo);
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

const gerados = PAGINAS.map((pagina) => pagina.arquivo);

if (conferir) {
  if (desatualizado) process.exit(1);
  console.warn(`${juntar(gerados)} estão atualizados.`);
} else {
  console.warn(
    `Montados: ${juntar(gerados)} (${IDIOMAS.length} idiomas, ${ordem.length} arquivos de CSS, ${fonteDe(PADRAO).cases.length} cases).`
  );
}
