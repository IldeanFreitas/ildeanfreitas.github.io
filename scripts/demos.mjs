/**
 * Demonstrações do portfólio: os apps de Power Apps e os painéis de Power BI.
 * Dados, textos fixos, dicionário de tags (tecnologias e recursos) e o cartão
 * de cada demonstração.
 *
 * Fonte única. O cartão aparece na seção Cases da home (scripts/cases.mjs): os
 * apps na aba Power Platform, os painéis na aba Power BI. As tags e o aviso
 * aparecem também na página de cada app ou painel (scripts/mockups.mjs).
 * Módulo sem efeito colateral: importar não grava nada, ao contrário de
 * scripts/mockups.mjs, que gera páginas ao rodar.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = new URL('../', import.meta.url);
const lerJson = (caminho) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(caminho, RAIZ)), 'utf8'));

/** Caminho das páginas e dos apps, sem barra nas pontas (muda em um lugar só). */
export const DEMOS = 'demos/power-apps';

/** Os apps, na ordem de exibição. Texto PT e EN por campo. */
export const dados = lerJson('src/data/mockups-power-apps.json');

/** Os painéis de Power BI, na ordem de exibição. Mesmo formato dos apps. */
export const PAINEIS = lerJson('src/data/mockups-power-bi.json');

export const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Textos fixos das páginas dos apps e do cartão, por idioma. */
const T_PA = {
  pt: {
    base: '/',
    home: '/',
    lang: 'pt-BR',
    titulo: 'Apps de demonstração para Power Apps',
    selo: 'Arquitetura documentada',
    ver: 'Ver o app',
    voltar: '← Todos os apps de demonstração',
    dor: 'Cenário fictício',
    solucao: 'O que a demonstração mostra',
    roteiro: 'Teste em 3 passos',
    aviso: 'Empresas e dados mockados.',
    notaIdioma: '',
    escopoRot: 'Execução na Power Platform:',
    escopo: 'nenhuma. Protótipo em HTML com dados fictícios.',
    cheia: 'Abrir em tela cheia',
    /* Página antiga da galeria, hoje redirecionamento para a aba Power Platform. */
    redirecionamento: {
      texto: 'Os apps de demonstração agora ficam na página inicial.',
      link: 'Ver os apps de demonstração'
    },
    player: {
      voltar: '← Voltar à página do app',
      janela: 'Ajustar à janela',
      tablet: 'Tablet 16:9',
      celular: 'Celular',
      modos: 'Formato de exibição',
      tela: 'Tela cheia',
      nota: 'Simulação do app aberto no navegador. Dados fictícios.',
      dica: {
        janela: 'O app ocupa toda a janela, como um app responsivo (Scale to fit desativado).',
        tablet:
          'Proporção fixa 16:9, reduzida para caber, como um app de tablet com Scale to fit ativado.',
        celular: 'Proporção de celular em pé, com barras laterais, como no navegador.'
      }
    },
    mobile: 'Em telas pequenas o app abre em tela cheia.',
    moldura: 'Demonstração navegável de',
    desc: (t) => `${t} Demonstração navegável com dados fictícios.`
  },
  en: {
    base: '/en/',
    home: '/en/',
    lang: 'en',
    titulo: 'Demo apps for Power Apps',
    selo: 'Documented architecture',
    ver: 'View the app',
    voltar: '← All demo apps',
    dor: 'Fictitious scenario',
    solucao: 'What the demo shows',
    roteiro: 'Try it in 3 steps',
    aviso: 'Mock companies and data.',
    notaIdioma: 'The demo apps are in Portuguese.',
    escopoRot: 'Execution on Power Platform:',
    escopo: 'none. HTML prototype with fictional data.',
    cheia: 'Open full screen',
    redirecionamento: {
      texto: 'The demo apps now live on the home page.',
      link: 'See the demo apps'
    },
    player: {
      voltar: '← Back to the app page',
      janela: 'Fit to window',
      tablet: 'Tablet 16:9',
      celular: 'Phone',
      modos: 'Display format',
      tela: 'Full screen',
      nota: 'Simulation of the app opened in a browser. Fictitious data.',
      dica: {
        janela: 'The app fills the whole window, like a responsive app (Scale to fit off).',
        tablet: 'Fixed 16:9 ratio, scaled down to fit, like a tablet app with Scale to fit on.',
        celular: 'Portrait phone ratio with side bars, as in the browser.'
      }
    },
    mobile: 'On small screens the app opens full screen.',
    moldura: 'Clickable demo of',
    desc: (t) => `${t} Clickable demo with fictitious data.`
  }
};

/** Textos fixos das páginas dos painéis de Power BI e do cartão, por idioma. */
const T_BI = {
  pt: {
    base: '/',
    home: '/',
    lang: 'pt-BR',
    titulo: 'Painéis de demonstração para Power BI',
    selo: 'Arquitetura documentada',
    ver: 'Ver o painel',
    voltar: 'Voltar a todos os painéis de demonstração',
    dor: 'Cenário fictício',
    solucao: 'O que o painel mostra',
    roteiro: 'Teste em 3 passos',
    aviso: 'Empresas e dados mockados.',
    notaIdioma: '',
    escopoRot: 'Execução no Power BI:',
    escopo:
      'nenhuma. Protótipo em HTML com dados fictícios; o painel "Como seria no Power BI" de cada página traz visuais, medidas DAX e modelo, com fonte no Microsoft Learn ou marcado "a confirmar".',
    cheia: 'Abrir em tela cheia',
    /* Página antiga da galeria, hoje redirecionamento para a aba Power BI. */
    redirecionamento: {
      texto: 'Os painéis de demonstração agora ficam na página inicial.',
      link: 'Ver os painéis de demonstração'
    },
    player: {
      voltar: 'Voltar à página do painel',
      janela: 'Ajustar à janela',
      tablet: 'Notebook 1366 x 768',
      celular: 'Celular',
      modos: 'Formato de exibição',
      tela: 'Tela cheia',
      nota: 'Simulação do relatório aberto no navegador. Dados fictícios.',
      dica: {
        janela: 'O painel ocupa toda a janela e se ajusta à página, como no serviço do Power BI.',
        tablet: 'Tela de notebook de 1366 x 768, reduzida para caber.',
        celular: 'Celular em pé: o painel mostra o layout próprio para telas pequenas.'
      }
    },
    mobile: 'Em telas pequenas o painel abre em tela cheia.',
    moldura: 'Painel de demonstração de',
    desc: (t) => `${t} Painel navegável com dados fictícios.`
  },
  en: {
    base: '/en/',
    home: '/en/',
    lang: 'en',
    titulo: 'Demo dashboards for Power BI',
    selo: 'Documented architecture',
    ver: 'View the dashboard',
    voltar: 'Back to all demo dashboards',
    dor: 'Fictitious scenario',
    solucao: 'What the dashboard shows',
    roteiro: 'Try it in 3 steps',
    aviso: 'Mock companies and data.',
    notaIdioma: 'The demo dashboards are in Portuguese.',
    escopoRot: 'Execution in Power BI:',
    escopo:
      'none. HTML prototype with fictional data; each page has a "Como seria no Power BI" (how it would be in Power BI) panel with visuals, DAX measures and model, sourced from Microsoft Learn or marked "a confirmar" (to be confirmed).',
    cheia: 'Open full screen',
    redirecionamento: {
      texto: 'The demo dashboards now live on the home page.',
      link: 'See the demo dashboards'
    },
    player: {
      voltar: 'Back to the dashboard page',
      janela: 'Fit to window',
      tablet: 'Laptop 1366 x 768',
      celular: 'Phone',
      modos: 'Display format',
      tela: 'Full screen',
      nota: 'Simulation of the report opened in a browser. Fictitious data.',
      dica: {
        janela: 'The dashboard fills the window and fits the page, as in the Power BI service.',
        tablet: 'A 1366 x 768 laptop screen, scaled down to fit.',
        celular: 'Portrait phone: the dashboard shows its own small-screen layout.'
      }
    },
    mobile: 'On small screens the dashboard opens full screen.',
    moldura: 'Demo dashboard of',
    desc: (t) => `${t} Explorable dashboard with fictitious data.`
  }
};

/**
 * As duas coleções publicadas. `secao`: aba da home onde os cartões vivem (e
 * para onde a antiga galeria redireciona); `sep`: separador entre segmento e
 * empresa (a de Power Apps mantém o ponto médio com que foi publicada; a de
 * Power BI usa a barra, regra de texto da casa).
 */
export const COLECOES = {
  apps: {
    demos: DEMOS,
    json: 'mockups-power-apps.json',
    dados,
    T: T_PA,
    sep: '·',
    secao: '#cases-power-platform'
  },
  paineis: {
    demos: 'demos/power-bi',
    json: 'mockups-power-bi.json',
    dados: PAINEIS,
    T: T_BI,
    sep: '|',
    secao: '#cases-power-bi'
  }
};

/** Textos dos apps (quem importa `T` quer os de Power Apps). */
export const T = T_PA;

/* ---------------------------------------------------------------------------
 * Tecnologias: um dicionário só, usado pelas tags dos cartões e das páginas de
 * app e pelo filtro "Tecnologia" da aba Power Platform. A ordem daqui é a ordem
 * do filtro.
 *
 * Ícone pelo mesmo mecanismo das tags de Especialidades (.tag__icon): logotipo
 * registrado no manifesto (`marca`, caminho em assets/icons/vendor/) ou ícone
 * neutro Fluent do sprite (`fluent`), sempre com o nome escrito ao lado. Um
 * ícone por conceito: SQL Server e Oracle Database são o mesmo conceito
 * (banco de dados); SAP não usa o ativo vendor/sap (é um ícone Fiori, não a
 * marca). Ver docs/ICONOGRAFIA.md.
 *
 * `tambem`: outros rótulos de tag que contam como esta tecnologia no filtro
 * (as tags dos projetos documentados vêm dos cases, com nome próprio).
 *
 * As tags dos painéis de Power BI entram no mesmo dicionário, depois das
 * tecnologias: tipo de painel, recurso do relatório e visual. São conceitos,
 * não produtos: todas levam ícone neutro Fluent com o nome ao lado. `en`: o
 * rótulo em inglês, quando difere do português. Nenhuma aparece no filtro
 * Tecnologia da aba Power Platform, que só lista o que algum item dela usa.
 * ------------------------------------------------------------------------- */
const VENDOR = 'assets/icons/vendor';
export const TECNOLOGIAS = {
  'power-apps': {
    nome: 'Power Apps',
    marca: `${VENDOR}/power-apps/PowerApps_scalable.svg`,
    tambem: ['Power Apps Canvas']
  },
  'power-automate': {
    nome: 'Power Automate',
    marca: `${VENDOR}/power-automate/PowerAutomate_scalable.svg`,
    /* Power Automate para desktop é parte do Power Automate: o RPA entra no filtro. */
    tambem: ['Power Automate Desktop']
  },
  dataverse: { nome: 'Dataverse', marca: `${VENDOR}/dataverse/Dataverse_scalable.svg` },
  sharepoint: { nome: 'SharePoint', marca: `${VENDOR}/sharepoint/sharepoint_48x1.svg` },
  'sql-server': { nome: 'SQL Server', fluent: 'database' },
  'oracle-database': { nome: 'Oracle Database', fluent: 'database' },
  sap: { nome: 'SAP', fluent: 'building' },
  excel: { nome: 'Excel', fluent: 'document-table' },
  apis: { nome: 'APIs', fluent: 'plug-connected', tambem: ['REST', 'APIs REST'] },

  /* Painéis de Power BI: tipo de painel */
  executiva: { nome: 'Executiva', en: 'Executive', fluent: 'data-trending' },
  operacional: { nome: 'Operacional', en: 'Operational', fluent: 'gauge' },
  financeira: { nome: 'Financeira', en: 'Financial', fluent: 'money' },
  temporal: { nome: 'Temporal', en: 'Time-based', fluent: 'calendar' },
  governanca: { nome: 'Governança', en: 'Governance', fluent: 'shield-checkmark' },
  geografica: { nome: 'Geográfica', en: 'Geographic', fluent: 'map' },
  'qualidade-servico': { nome: 'Qualidade de serviço', en: 'Service quality', fluent: 'headset' },
  /* Painéis de Power BI: recurso do relatório. RLS é controle de acesso, o
   * mesmo conceito do `shield-lock` dos diagramas; SLA é prazo, o do `timer`. */
  'parametro-campo': { nome: 'Parâmetro de campo', en: 'Field parameter', fluent: 'options' },
  rls: { nome: 'RLS', fluent: 'shield-lock' },
  'drill-through': { nome: 'Drill-through', fluent: 'zoom-in' },
  'top-n': { nome: 'Top N', fluent: 'arrow-sort-down-lines' },
  'menu-lateral': { nome: 'Menu lateral', en: 'Side menu', fluent: 'panel-left' },
  abas: { nome: 'Abas', en: 'Tabs', fluent: 'tabs' },
  'navegador-indicadores': {
    nome: 'Navegador de indicadores',
    en: 'KPI navigator',
    fluent: 'compass-northwest'
  },
  'trilho-icones': { nome: 'Trilho de ícones', en: 'Icon rail', fluent: 'apps-list' },
  sla: { nome: 'SLA', fluent: 'timer' },
  safe: { nome: 'SAFe', fluent: 'people-team' },
  aging: { nome: 'Aging', fluent: 'hourglass' },
  'previsto-realizado': {
    nome: 'Previsto x realizado',
    en: 'Forecast vs. actual',
    fluent: 'target'
  },
  'ano-contra-ano': { nome: 'Ano contra ano', en: 'Year over year', fluent: 'arrow-swap' },
  /* Painéis de Power BI: visual */
  'carta-controle': { nome: 'Carta de controle', en: 'Control chart', fluent: 'data-line' },
  cascata: { nome: 'Cascata', en: 'Waterfall', fluent: 'data-waterfall' },
  matriz: { nome: 'Matriz', en: 'Matrix', fluent: 'grid' },
  'diagrama-linear': { nome: 'Diagrama linear', en: 'Linear diagram', fluent: 'timeline' },
  'multiplos-pequenos': { nome: 'Múltiplos pequenos', en: 'Small multiples', fluent: 'board' }
};

/* Todo logotipo do dicionário precisa estar no manifesto, com o arquivo no
 * disco; os ícones Fluent são conferidos em cases.mjs (lista FLUENT, que monta
 * o sprite e confere o manifesto). */
{
  const manifesto = lerJson('assets/icons/manifest.json');
  const registrados = new Set(
    (manifesto.assets || []).flatMap((a) => [a.path, ...(a.files || []).map((f) => f.path)])
  );
  for (const [chave, t] of Object.entries(TECNOLOGIAS)) {
    if (!t.marca === !t.fluent)
      throw new Error(`demos.mjs: tecnologia "${chave}" precisa de "marca" ou "fluent", um só`);
    if (t.marca && !registrados.has(t.marca))
      throw new Error(`demos.mjs: logotipo de "${chave}" fora do manifesto: ${t.marca}`);
  }
}

const porRotulo = new Map(
  Object.entries(TECNOLOGIAS).flatMap(([chave, t]) =>
    [t.nome, ...(t.tambem || [])].map((r) => [r.toLowerCase(), chave])
  )
);

/** Chave da tecnologia de um rótulo de tag, ou null se não for tecnologia do dicionário. */
export const tecnologiaDe = (rotulo) => porRotulo.get(String(rotulo).toLowerCase()) ?? null;

/**
 * Tag de app no dado: o nome de uma tecnologia ("Power Apps") ou, quando o
 * rótulo muda por idioma, `{ "tec": "apis", "pt": "API de CEP", "en":
 * "Postal code API" }`. Tag que não resolve para o dicionário para o build:
 * todo cartão de app mostra ícone, e ícone desconhecido não cai em genérico.
 */
function tagDoApp(tag, c) {
  if (typeof tag === 'string') {
    const tec = tecnologiaDe(tag);
    if (!tec || TECNOLOGIAS[tec].nome !== tag)
      throw new Error(
        `demos.mjs: app "${c.slug}", tag "${tag}" fora do dicionário TECNOLOGIAS (${Object.values(
          TECNOLOGIAS
        )
          .map((t) => t.nome)
          .join(', ')})`
      );
    return { tec, pt: tag, en: TECNOLOGIAS[tec].en ?? tag };
  }
  if (!tag || !Object.hasOwn(TECNOLOGIAS, tag.tec) || !tag.pt || !tag.en)
    throw new Error(
      `demos.mjs: app "${c.slug}", tag ${JSON.stringify(tag)} precisa de "tec" (chave de TECNOLOGIAS), "pt" e "en"`
    );
  return tag;
}

for (const c of [...dados, ...PAINEIS]) {
  if (!Array.isArray(c.tags) || c.tags.length < 1 || c.tags.length > 4)
    throw new Error(`demos.mjs: app "${c.slug}" precisa de 1 a 4 tags`);
  c.tags.forEach((t) => tagDoApp(t, c));
}

/** Chaves de tecnologia de um app, sem repetição, na ordem das tags. */
export const tecsDoApp = (c) => [...new Set(c.tags.map((t) => tagDoApp(t, c).tec))];

/** Ícone de uma tecnologia, com a classe dada (tag__icon nas tags e no filtro). */
export function iconeTec(chave, classe = 'tag__icon') {
  const t = TECNOLOGIAS[chave];
  return t.marca
    ? `<img class="${classe}" src="/${t.marca}" alt="" width="16" height="16" loading="lazy" decoding="async">`
    : `<svg class="${classe}" aria-hidden="true"><use href="#i-${t.fluent}"></use></svg>`;
}

/** Lista de tags de um app, com ícone em cada uma (mesma marcação das tags de Especialidades). */
export function tagsApp(lang, c) {
  return `<ul class="taglist sem-margem">${c.tags
    .map((tag) => {
      const t = tagDoApp(tag, c);
      return `<li class="tag">${iconeTec(t.tec)}${esc(t[lang])}</li>`;
    })
    .join('')}</ul>`;
}

/** Selo no mesmo pill dos projetos da home (status status--designed). */
export const selo = (lang, col = COLECOES.apps) =>
  `<span class="status status--designed sem-margem">${esc(col.T[lang].selo)}</span>`;

/**
 * Aviso único dos apps (ou dos painéis, com `col`); nas páginas em inglês a
 * nota de idioma fica dentro da caixa.
 */
export function avisoApps(lang, recuo = '      ', col = COLECOES.apps) {
  const t = col.T[lang];
  return [
    `<div class="mock-aviso">`,
    `${recuo}  <p>${t.aviso}</p>`,
    ...(t.notaIdioma ? [`${recuo}  <p class="mock-nota">${t.notaIdioma}</p>`] : []),
    `${recuo}</div>`
  ].join('\n');
}

/**
 * Cartão de um app ou de um painel. `nivel`: nível do título (h5 na aba, sob o
 * h4 do bloco "Apps de demonstração" ou "Painéis de demonstração").
 * `atributos`: marcação extra do envoltório (os dados da busca e dos filtros,
 * que só a home usa). `col`: a coleção (COLECOES.apps ou COLECOES.paineis).
 */
export function cartaoApp(
  lang,
  c,
  { nivel = 5, atributos = '', recuo = '          ', col = COLECOES.apps } = {}
) {
  const t = col.T[lang];
  const href = `${t.base}${col.demos}/${c.slug}/`;
  return [
    `${recuo}<article class="card mock-card"${atributos}>`,
    `${recuo}  <p class="case-card__status">${selo(lang, col)}</p>`,
    `${recuo}  <p class="mock-card__seg sem-margem">${esc(c.segmento[lang])} ${col.sep} ${esc(c.empresa)}</p>`,
    `${recuo}  <h${nivel} class="mock-card__titulo">${esc(c.titulo[lang])}</h${nivel}>`,
    `${recuo}  <p class="sem-margem">${esc(c.solucao[lang])}</p>`,
    `${recuo}  ${tagsApp(lang, c)}`,
    `${recuo}  <a class="btn btn--ghost" href="${href}">${t.ver}<span class="sr-only">: ${esc(c.titulo[lang])}</span></a>`,
    `${recuo}</article>`
  ].join('\n');
}
