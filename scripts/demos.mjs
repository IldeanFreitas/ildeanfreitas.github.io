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
 *
 * Idiomas: todo texto daqui tem uma versão por idioma de src/idiomas.json.
 * São três lugares, e o build para se faltar um deles (conferirDemos, no fim):
 *
 *   T_PA e T_BI              uma entrada por código, com as mesmas chaves do
 *                            idioma padrão
 *   TECNOLOGIAS              `nome` é o rótulo do idioma padrão; termo que se
 *                            traduz leva uma chave por outro idioma (`en: '…'`)
 *   src/data/mockups-*.json  `segmento`, `titulo`, `dor`, `solucao` e `passos`
 *                            (e as tags escritas como objeto) com uma chave
 *                            por código
 *
 * O endereço e o `lang` de cada idioma não são texto: vêm de src/idiomas.json
 * (idiomaDe e enderecoDe, abaixo), e nenhuma tabela daqui os repete.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { diferencasDeChaves, lerIdiomas } from './idiomas.mjs';

const RAIZ = new URL('../', import.meta.url);
const lerJson = (caminho) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(caminho, RAIZ)), 'utf8'));

/** Caminho das páginas e dos apps, sem barra nas pontas (muda em um lugar só). */
export const DEMOS = 'demos/power-apps';

/**
 * Os idiomas de src/idiomas.json, lidos na primeira vez que alguém precisa
 * (e não na importação: quem roda primeiro, build ou mockups, já leu a
 * configuração com lerIdiomasOuSair e parou com a mensagem se ela estiver
 * inválida).
 */
let idiomasLidos;
const idiomas = () => (idiomasLidos ??= lerIdiomas());

/**
 * Idioma de um código, com `caminho` (a home dele: "/", "/en/") e `lang`.
 * Código fora da configuração para com a mensagem, em vez de publicar link
 * para "undefineddemos/…".
 */
export function idiomaDe(codigo) {
  const idioma = idiomas().find((i) => i.codigo === codigo);
  if (!idioma) throw new Error(`demos.mjs: idioma "${codigo}" não está em src/idiomas.json`);
  return idioma;
}

/** Endereço (de raiz) de uma página de demonstração num idioma: "/en/demos/power-bi/x/". */
export const enderecoDe = (codigo, caminho) => `${idiomaDe(codigo).caminho}${caminho}`;

/** Os apps, na ordem de exibição. Um texto por idioma em cada campo. */
export const dados = lerJson('src/data/mockups-power-apps.json');

/** Os painéis de Power BI, na ordem de exibição. Mesmo formato dos apps. */
export const PAINEIS = lerJson('src/data/mockups-power-bi.json');

export const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * Textos fixos das páginas dos apps e do cartão: uma entrada por idioma de
 * src/idiomas.json, com as mesmas chaves do idioma padrão (conferirDemos).
 */
const T_PA = {
  pt: {
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
    nome: 'Demonstração navegável',
    desc: (t) => `${t} Demonstração navegável com dados fictícios.`
  },
  en: {
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
    nome: 'Clickable demo',
    desc: (t) => `${t} Clickable demo with fictitious data.`
  },
  es: {
    titulo: 'Aplicaciones de demostración para Power Apps',
    selo: 'Arquitectura documentada',
    ver: 'Ver la aplicación',
    voltar: '← Todas las aplicaciones de demostración',
    dor: 'Escenario ficticio',
    solucao: 'Qué muestra la demostración',
    roteiro: 'Pruébala en 3 pasos',
    aviso: 'Empresas y datos simulados.',
    notaIdioma: 'Las aplicaciones de demostración están en portugués.',
    escopoRot: 'Ejecución en Power Platform:',
    escopo: 'ninguna. Prototipo en HTML con datos ficticios.',
    cheia: 'Abrir en pantalla completa',
    redirecionamento: {
      texto: 'Las aplicaciones de demostración ahora están en la página de inicio.',
      link: 'Ver las aplicaciones de demostración'
    },
    player: {
      voltar: '← Volver a la página de la aplicación',
      janela: 'Ajustar a la ventana',
      tablet: 'Tablet 16:9',
      celular: 'Teléfono móvil',
      modos: 'Formato de visualización',
      tela: 'Pantalla completa',
      nota: 'Simulación de la aplicación abierta en el navegador. Datos ficticios.',
      dica: {
        janela:
          'La aplicación ocupa toda la ventana, como una aplicación adaptable (Scale to fit desactivado).',
        tablet:
          'Proporción fija 16:9, reducida para caber, como una aplicación de tablet con Scale to fit activado.',
        celular:
          'Proporción de teléfono móvil en vertical, con barras laterales, como en el navegador.'
      }
    },
    mobile: 'En pantallas pequeñas la aplicación se abre en pantalla completa.',
    moldura: 'Demostración navegable de',
    nome: 'Demostración navegable',
    desc: (t) => `${t} Demostración navegable con datos ficticios.`
  }
};

/** Textos fixos das páginas dos painéis de Power BI e do cartão, por idioma. */
const T_BI = {
  pt: {
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
    nome: 'Painel de demonstração',
    desc: (t) => `${t} Painel navegável com dados fictícios.`
  },
  en: {
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
    nome: 'Demo dashboard',
    desc: (t) => `${t} Explorable dashboard with fictitious data.`
  },
  es: {
    titulo: 'Paneles de demostración para Power BI',
    selo: 'Arquitectura documentada',
    ver: 'Ver el panel',
    voltar: 'Volver a todos los paneles de demostración',
    dor: 'Escenario ficticio',
    solucao: 'Qué muestra el panel',
    roteiro: 'Pruébalo en 3 pasos',
    aviso: 'Empresas y datos simulados.',
    notaIdioma: 'Los paneles de demostración están en portugués.',
    escopoRot: 'Ejecución en Power BI:',
    escopo:
      'ninguna. Prototipo en HTML con datos ficticios; el panel "Como seria no Power BI" (cómo sería en Power BI) de cada página trae objetos visuales, medidas DAX y modelo, con fuente en Microsoft Learn o marcado "a confirmar" (por confirmar).',
    cheia: 'Abrir en pantalla completa',
    redirecionamento: {
      texto: 'Los paneles de demostración ahora están en la página de inicio.',
      link: 'Ver los paneles de demostración'
    },
    player: {
      voltar: 'Volver a la página del panel',
      janela: 'Ajustar a la ventana',
      tablet: 'Portátil 1366 x 768',
      celular: 'Teléfono móvil',
      modos: 'Formato de visualización',
      tela: 'Pantalla completa',
      nota: 'Simulación del informe abierto en el navegador. Datos ficticios.',
      dica: {
        janela:
          'El panel ocupa toda la ventana y se ajusta a la página, como en el servicio de Power BI.',
        tablet: 'Pantalla de portátil de 1366 x 768, reducida para caber.',
        celular:
          'Teléfono móvil en vertical: el panel muestra su diseño propio para pantallas pequeñas.'
      }
    },
    mobile: 'En pantallas pequeñas el panel se abre en pantalla completa.',
    moldura: 'Panel de demostración de',
    nome: 'Panel de demostración',
    desc: (t) => `${t} Panel navegable con datos ficticios.`
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
 * não produtos: todas levam ícone neutro Fluent com o nome ao lado. Nenhuma
 * aparece no filtro Tecnologia da aba Power Platform, que só lista o que
 * algum item dela usa.
 *
 * Rótulo por idioma: `nome` é o do idioma padrão (PT-BR). Nome de produto e
 * sigla não se traduzem e ficam só com `nome` (Power Apps, RLS, SLA). Termo
 * que se traduz leva uma chave por código dos outros idiomas (`en: 'Tabs'`);
 * quem traduz para um idioma precisa traduzir para todos, senão o build para
 * dizendo qual chave falta (conferirDemos). Se o termo for igual num idioma,
 * repita-o: a repetição é a prova de que alguém olhou.
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
  executiva: { nome: 'Executiva', en: 'Executive', es: 'Ejecutiva', fluent: 'data-trending' },
  operacional: { nome: 'Operacional', en: 'Operational', es: 'Operativa', fluent: 'gauge' },
  financeira: { nome: 'Financeira', en: 'Financial', es: 'Financiera', fluent: 'money' },
  temporal: { nome: 'Temporal', en: 'Time-based', es: 'Temporal', fluent: 'calendar' },
  governanca: {
    nome: 'Governança',
    en: 'Governance',
    es: 'Gobernanza',
    fluent: 'shield-checkmark'
  },
  geografica: { nome: 'Geográfica', en: 'Geographic', es: 'Geográfica', fluent: 'map' },
  'qualidade-servico': {
    nome: 'Qualidade de serviço',
    en: 'Service quality',
    es: 'Calidad de servicio',
    fluent: 'headset'
  },
  /* Painéis de Power BI: recurso do relatório. RLS é controle de acesso, o
   * mesmo conceito do `shield-lock` dos diagramas; SLA é prazo, o do `timer`. */
  'parametro-campo': {
    nome: 'Parâmetro de campo',
    en: 'Field parameter',
    es: 'Parámetro de campo',
    fluent: 'options'
  },
  rls: { nome: 'RLS', fluent: 'shield-lock' },
  'drill-through': { nome: 'Drill-through', fluent: 'zoom-in' },
  'top-n': { nome: 'Top N', fluent: 'arrow-sort-down-lines' },
  'menu-lateral': {
    nome: 'Menu lateral',
    en: 'Side menu',
    es: 'Menú lateral',
    fluent: 'panel-left'
  },
  abas: { nome: 'Abas', en: 'Tabs', es: 'Pestañas', fluent: 'tabs' },
  /* O recurso do Power BI (Inserir, Botões, Navegador) tem dois tipos: de
   * páginas e de indicadores (bookmarks). O painel do gás usa o de páginas. */
  'navegador-paginas': {
    nome: 'Navegador de páginas',
    en: 'Page navigator',
    es: 'Navegador de páginas',
    fluent: 'compass-northwest'
  },
  'trilho-icones': {
    nome: 'Trilho de ícones',
    en: 'Icon rail',
    es: 'Barra de iconos',
    fluent: 'apps-list'
  },
  sla: { nome: 'SLA', fluent: 'timer' },
  safe: { nome: 'SAFe', fluent: 'people-team' },
  aging: { nome: 'Aging', fluent: 'hourglass' },
  'previsto-realizado': {
    nome: 'Previsto x realizado',
    en: 'Forecast vs. actual',
    es: 'Previsto frente a real',
    fluent: 'target'
  },
  'ano-contra-ano': {
    nome: 'Ano contra ano',
    en: 'Year over year',
    es: 'Interanual',
    fluent: 'arrow-swap'
  },
  /* Painéis de Power BI: visual */
  'carta-controle': {
    nome: 'Carta de controle',
    en: 'Control chart',
    es: 'Gráfico de control',
    fluent: 'data-line'
  },
  cascata: { nome: 'Cascata', en: 'Waterfall', es: 'Cascada', fluent: 'data-waterfall' },
  matriz: { nome: 'Matriz', en: 'Matrix', es: 'Matriz', fluent: 'grid' },
  'diagrama-linear': {
    nome: 'Diagrama linear',
    en: 'Linear diagram',
    es: 'Diagrama lineal',
    fluent: 'timeline'
  },
  'multiplos-pequenos': {
    nome: 'Múltiplos pequenos',
    en: 'Small multiples',
    es: 'Múltiplos pequeños',
    fluent: 'board'
  }
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

/** Chaves de uma tecnologia que não são rótulo de idioma. */
const CAMPOS_DA_TECNOLOGIA = ['nome', 'marca', 'fluent', 'tambem'];

/** Rótulo de uma tecnologia num idioma: o traduzido, se houver, ou o `nome`. */
export const nomeDaTecnologia = (chave, lang) => {
  const t = TECNOLOGIAS[chave];
  return Object.hasOwn(t, lang) && !CAMPOS_DA_TECNOLOGIA.includes(lang) ? t[lang] : t.nome;
};

/**
 * Tag de app no dado: o nome de uma tecnologia ("Power Apps") ou, quando o
 * rótulo é próprio do app, `{ "tec": "apis", "pt": "API de CEP", "en":
 * "Postal code API" }`, com uma chave por idioma. Tag que não resolve para o
 * dicionário para o build: todo cartão de app mostra ícone, e ícone
 * desconhecido não cai em genérico. Devolve a chave da tecnologia e, com
 * `lang`, o rótulo naquele idioma.
 */
function tagDoApp(tag, c, lang) {
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
    return { tec, rotulo: lang ? nomeDaTecnologia(tec, lang) : tag };
  }
  if (!tag || !Object.hasOwn(TECNOLOGIAS, tag.tec))
    throw new Error(
      `demos.mjs: app "${c.slug}", tag ${JSON.stringify(tag)} precisa de "tec" (chave de TECNOLOGIAS) e de um rótulo por idioma`
    );
  if (lang && !tag[lang])
    throw new Error(
      `demos.mjs: app "${c.slug}", tag ${JSON.stringify(tag)} sem o rótulo do idioma "${lang}"`
    );
  return { tec: tag.tec, rotulo: lang ? tag[lang] : undefined };
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
      const t = tagDoApp(tag, c, lang);
      return `<li class="tag">${iconeTec(t.tec)}${esc(t.rotulo)}</li>`;
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
  const href = enderecoDe(lang, `${col.demos}/${c.slug}/`);
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

/* ---------------------------------------------------------------------------
 * Conferência por idioma
 * ------------------------------------------------------------------------- */

/** Campos de cada app ou painel com um texto por idioma (`passos` é lista). */
const CAMPOS_POR_IDIOMA = ['segmento', 'titulo', 'dor', 'solucao', 'passos'];

/**
 * Confere os textos das demonstrações contra a lista de idiomas, no mesmo
 * padrão de conferirDicionario (scripts/cases.mjs): devolve a lista de
 * problemas, cada um dizendo a tabela ou o arquivo e a chave que falta; vazia
 * quando está tudo certo. O build e scripts/mockups.mjs param com ela.
 *
 * - T_PA e T_BI: uma entrada por código, com as mesmas chaves do padrão;
 * - TECNOLOGIAS: termo traduzido para algum idioma precisa de todos;
 * - src/data/mockups-*.json: todo campo de texto e toda tag-objeto com um
 *   texto por código, e `passos` com a mesma quantidade do padrão.
 *
 * Entrada de idioma que ainda não está na configuração não é problema: é o
 * passo natural de quem prepara um idioma novo. Os parâmetros opcionais
 * existem para o teste de unidade conferir tabelas de mentira.
 */
export function conferirDemos(
  codigos,
  padrao,
  { colecoes = COLECOES, tecnologias = TECNOLOGIAS } = {}
) {
  const problemas = [];
  const outros = codigos.filter((codigo) => codigo !== padrao);

  for (const [nome, col] of Object.entries(colecoes)) {
    const tabela = `textos de "${nome}" (scripts/demos.mjs)`;
    if (!Object.hasOwn(col.T, padrao)) {
      problemas.push(`${tabela}: sem a entrada do idioma padrão "${padrao}"`);
      continue;
    }
    for (const codigo of outros) {
      if (!Object.hasOwn(col.T, codigo)) {
        problemas.push(`${tabela}: sem a entrada "${codigo}"`);
        continue;
      }
      for (const diferenca of diferencasDeChaves(col.T[padrao], col.T[codigo]))
        problemas.push(`${tabela}, entrada "${codigo}": ${diferenca} (comparado a "${padrao}")`);
    }

    const arquivo = `src/data/${col.json}`;
    for (const c of col.dados) {
      const onde = `${arquivo}: "${c.slug}"`;
      for (const campo of CAMPOS_POR_IDIOMA) {
        const valor = c[campo];
        if (valor === null || typeof valor !== 'object') {
          problemas.push(`${onde}, campo "${campo}" ausente`);
          continue;
        }
        for (const codigo of codigos) {
          const texto = valor[codigo];
          const vazio =
            campo === 'passos'
              ? !Array.isArray(texto) || !texto.length || texto.some((p) => !String(p).trim())
              : typeof texto !== 'string' || !texto.trim();
          if (vazio) problemas.push(`${onde}, falta "${campo}.${codigo}"`);
          else if (campo === 'passos' && texto.length !== valor[padrao]?.length)
            problemas.push(
              `${onde}, "passos.${codigo}" com ${texto.length} passos; "passos.${padrao}" tem ${valor[padrao]?.length ?? 0}`
            );
        }
      }
      (c.tags || []).forEach((tag, i) => {
        if (typeof tag === 'string') return;
        for (const codigo of codigos)
          if (typeof tag?.[codigo] !== 'string' || !tag[codigo].trim())
            problemas.push(`${onde}, falta "tags[${i}].${codigo}" (tag "${tag?.tec}")`);
      });
    }
  }

  for (const [chave, t] of Object.entries(tecnologias)) {
    const traduzido = Object.keys(t).some((campo) => !CAMPOS_DA_TECNOLOGIA.includes(campo));
    if (!traduzido) continue;
    for (const codigo of outros)
      if (typeof t[codigo] !== 'string' || !t[codigo].trim())
        problemas.push(
          `TECNOLOGIAS (scripts/demos.mjs): falta "${chave}.${codigo}" ("${t.nome}" tem tradução em outro idioma)`
        );
  }
  return problemas;
}
