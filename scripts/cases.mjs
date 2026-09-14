/**
 * Renderiza os cases a partir de src/data/cases.json.
 *
 * Roda em TEMPO DE BUILD, não no navegador. Montar os cases no cliente
 * resolveria a duplicação e destruiria o SEO: o conteúdo precisa estar no HTML
 * que o servidor entrega, que é o que o buscador lê e o que aparece com
 * JavaScript desativado.
 */

/** Escapa o que vai para dentro de um atributo HTML. */
const attr = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * O texto dos cases vem do JSON e é conteúdo de autor, com entidades já
 * escritas à mão (&amp;, &nbsp;). Reescapar transformaria "&amp;" em
 * "&amp;amp;" na página. Então só os caracteres que quebrariam a marcação, e
 * apenas quando não fazem parte de uma entidade existente.
 */
const texto = (s) =>
  String(s)
    .replace(/&(?!#?\w+;)/g, '&amp;')
    .replace(/</g, '&lt;');

/** Ícones funcionais, em SVG inline, para manter o site independente de CDNs. */
const icones = {
  database:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/></svg>',
  sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9a4 4 0 0 0-4 4v1"/><path d="m17 4 3 3-3 3M4 17h9a4 4 0 0 0 4-4v-1"/><path d="m7 20-3-3 3-3"/></svg>',
  snowflake:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v20M4.3 6.5l15.4 9M4.3 17.5l15.4-9M8.5 4.1 12 6l3.5-1.9M8.5 19.9 12 18l3.5 1.9M4.3 6.5 4.5 10M19.7 17.5l-.2-3.5M4.3 17.5 7.5 16M19.7 6.5 16.5 8"/></svg>',
  transform:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10l-3-3M17 17H7l3 3M17 7l3 3-3 3M7 17l-3-3 3-3"/></svg>',
  warehouse:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13M7 21v-6h10v6M7 10h.01M12 10h.01M17 10h.01"/></svg>',
  chart:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  upload:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V3M7 8l5-5 5 5M5 21h14"/></svg>',
  queue:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 6h14M5 12h14M5 18h9"/><circle cx="3" cy="6" r=".7" fill="currentColor"/><circle cx="3" cy="12" r=".7" fill="currentColor"/><circle cx="3" cy="18" r=".7" fill="currentColor"/></svg>',
  workflow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h3a3 3 0 0 1 3 3v6M9 18h6"/></svg>',
  bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8"/></svg>',
  monitor:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 10h2l2-3 3 6 1-3h2"/></svg>',
  api: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/></svg>',
  layers:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/></svg>',
  document:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-4-6Z"/><path d="M14 3v6h4M8 13h8M8 17h5"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m21 3-7.5 18-3.5-7-7-3.5L21 3Z"/><path d="m10 14 4-4"/></svg>',
  receipt:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 8-4 4 4 4M16 8l4 4-4 4"/></svg>',
  decision:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M12 7h6l-2 3 2 3h-6M12 14H6l2 3-2 3h6"/></svg>',
  release:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 4 7 5 2-5 2-4 7-4-7-5-2 5-2 4-7Z"/></svg>',
  sliders:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 17h16M9 3v8M15 13v8"/></svg>',
  component:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7 8 4.5L20 7M12 11.5V21"/></svg>',
  output:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h11M13 7l5 5-5 5"/></svg>',
  app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>',
  wrench:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6 4-4 2 2-4 4M4 20l9-9M3 17l4 4"/></svg>',
  attachment:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m8.5 12.5 6-6a3 3 0 1 1 4.2 4.2l-8.1 8.1a4.5 4.5 0 1 1-6.4-6.4l8-8"/></svg>',
  airflow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17c2.5-6 5-8 8-8 2.5 0 4 1.2 8 7M4 7c2.5 6 5 8 8 8 2.5 0 4-1.2 8-7"/><circle cx="4" cy="7" r="1.5"/><circle cx="4" cy="17" r="1.5"/><circle cx="20" cy="7" r="1.5"/><circle cx="20" cy="17" r="1.5"/></svg>',
  catalog:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20M8 7h8M8 11h6"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  quality:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 14.5 8 20 8.8l-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9L9.5 8 12 3Z"/><path d="m9.5 11.5 1.5 1.5 3.5-3.5"/></svg>',
  retry:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0 1 4"/><path d="m20 4 .5 7-7 .5"/></svg>',
  trace:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h4a4 4 0 0 1 4 4v4"/></svg>',
  ci: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4zM8 8h8M8 12h5M8 16h8"/></svg>'
};

const icone = (nome = 'component') => icones[nome] || icones.component;

/** Ícones Fluent locais para conceitos. Marcas de produto ficam no catálogo local. */
const iconesNeutros = {
  database: 'database',
  sync: 'arrow-sync',
  snowflake: 'database-arrow-right',
  transform: 'arrow-sync',
  warehouse: 'database-multiple',
  chart: 'chart-multiple',
  airflow: 'arrow-sync',
  catalog: 'database-search',
  lock: 'lock-closed',
  quality: 'database-checkmark'
};
const iconeNeutro = (nome) =>
  `<span class="dataflow-icon dataflow-icon--${iconesNeutros[nome] || 'database'}" aria-hidden="true"></span>`;

/* Arquivos originais dos fornecedores, obtidos das fontes registradas no
 * manifesto. A marca é decorativa porque o nome do produto permanece no
 * mesmo cartão, de modo que leitores de tela não recebem texto duplicado. */
const marcasDataflow = {
  postgresql: 'assets/icons/vendor/postgresql/PostgreSQL_logo.3colors.svg',
  airbyte: 'assets/icons/vendor/airbyte/Airbyte_icon_color.svg',
  snowflake: 'assets/icons/vendor/snowflake/bug-sno-blue.png',
  dbt: 'assets/icons/vendor/dbt/dbt-bit-standalone.png',
  airflow: 'assets/icons/vendor/airflow/airflow-icon.svg',
  'power-bi': 'assets/icons/vendor/power-bi/power_bi_48_color.svg'
};
const iconeProduto = (marca) =>
  `<img class="dataflow-product-icon" src="${marcasDataflow[marca]}" alt="" aria-hidden="true">`;
const iconeDataflow = (marca, neutro) =>
  marcasDataflow[marca] ? iconeProduto(marca) : iconeNeutro(neutro);

const marcasAssincronas = {
  dataverse: 'assets/icons/vendor/dataverse/Dataverse_scalable.svg',
  'power-apps': 'assets/icons/vendor/power-apps/PowerApps_scalable.svg',
  'power-automate': 'assets/icons/vendor/power-automate/PowerAutomate_scalable.svg'
};
const iconeAssincrono = (etapa) =>
  etapa.produto && marcasAssincronas[etapa.produto]
    ? `<img class="async-product-icon" src="${marcasAssincronas[etapa.produto]}" alt="" aria-hidden="true">`
    : icone(etapa.icone);

/* Marcas oficiais empregadas somente nos nós que nomeiam o produto exato.
 * Redis permanece como conceito neutro neste case: não há um ativo oficial
 * baixado e validado no catálogo local para uso público. */
const marcasRpa = {
  nodejs: 'assets/icons/vendor/nodejs/nodejsHex.svg',
  'power-automate': 'assets/icons/vendor/power-automate/PowerAutomate_scalable.svg'
};
const iconeRpa = (nome, produto) =>
  produto && marcasRpa[produto]
    ? `<img class="rpa-product-icon" src="${marcasRpa[produto]}" alt="" aria-hidden="true">`
    : icone(nome);

const etapa = (e) =>
  `<div class="diagram-stage${e.destaque ? ' diagram-stage--accent' : ''}">` +
  `<div class="diagram-stage__header"><span class="diagram-stage__icon" aria-hidden="true">${icone(e.icone)}</span><span class="diagram-stage__type">${texto(e.tipo)}</span>${e.selo ? `<span class="diagram-stage__badge">${texto(e.selo)}</span>` : ''}</div>` +
  `<span class="diagram-stage__title">${texto(e.titulo)}</span>` +
  `<span class="diagram-stage__meta">${texto(e.nota)}</span></div>`;

const camada = (c) =>
  `<div class="diagram-layer${c.destaque ? ' diagram-layer--accent' : ''}">` +
  `<span class="diagram-layer__icon" aria-hidden="true">${icone(c.icone || 'layers')}</span>` +
  `<div><b>${texto(c.titulo)}</b><span>${texto(c.nota)}</span></div>` +
  `<span class="diagram-layer__mark">${texto(c.sigla)}</span></div>`;

const zona = (z) =>
  `              <section class="diagram-zone${z.pipeline ? ' diagram-zone--pipeline' : ''}">\n` +
  `                <p class="diagram-zone__title">${texto(z.titulo)}</p>\n` +
  (z.pipeline ? z.camadas.map(camada) : z.etapas.map(etapa))
    .map((h) => `                ${h}`)
    .join('\n') +
  `\n              </section>`;

function diagrama(d) {
  if (d.forma === 'dataflow') return dataflow(d);
  if (d.forma === 'async') return fluxoAssincrono(d);
  if (d.forma === 'lakehouse') return lakehouse(d);
  if (d.forma === 'financial') return jornadaFinanceira(d);
  if (d.forma === 'rpa-detailed') return anatomiaRpa(d);

  const pipeline = d.forma === 'pipeline';
  const corpo =
    d.forma === 'fluxo' || pipeline
      ? `            <div class="diagram-flow${pipeline ? ' diagram-flow--pipeline' : ''}">\n` +
        d.etapas.map((e) => `              ${etapa(e)}`).join('\n') +
        `\n            </div>`
      : `            <div class="diagram-data-layout">\n` +
        d.zonas.map(zona).join('\n') +
        `\n            </div>`;

  const base = d.governanca
    .map(
      (g) =>
        `<div class="diagram-foundation__item"><span class="diagram-foundation__icon" aria-hidden="true">${icone(g.icone)}</span><span><b>${texto(g.nome)}</b>${texto(g.valor)}</span></div>`
    )
    .join('');

  const orquestracao = d.orquestracao
    ? `\n            <div class="diagram-orchestration${pipeline ? ' diagram-orchestration--pipeline' : ''}"><span class="diagram-orchestration__icon" aria-hidden="true">${icone(d.orquestracao.icone || 'airflow')}</span><span><b>${texto(d.orquestracao.nome)}</b>${texto(d.orquestracao.valor)}</span></div>`
    : '';

  const legenda = d.legenda
    ? `\n            <div class="diagram-legend"><span><i class="diagram-legend__line" aria-hidden="true"></i>${texto(d.legenda.fluxo)}</span><span><i class="diagram-legend__line diagram-legend__line--dashed" aria-hidden="true"></i>${texto(d.legenda.controle)}</span></div>\n`
    : d.forma === 'fluxo'
      ? `\n            <div class="diagram-legend"><span><i class="diagram-legend__line" aria-hidden="true"></i>Fluxo do processo</span></div>\n`
      : '';

  const tituloBase = `<p class="diagram-foundation__title">${texto(d.tituloBase || 'Capacidades transversais')}</p>`;

  return (
    `          <figure class="architecture-diagram" role="img" aria-label="${attr(d.alt)}">\n` +
    `            <div class="diagram-header"><p class="diagram-kicker">${texto(d.etiqueta)}</p><b>${texto(d.titulo)}</b></div>\n` +
    legenda +
    corpo +
    orquestracao +
    `\n            <div class="diagram-foundation">${tituloBase}${base}</div>\n` +
    `          </figure>`
  );
}

/**
 * Visão lógica de fluxo de dados do case DataOps. O caminho que os dados
 * percorrem fica em uma única linha; orquestração e controles não se passam
 * por etapas de transformação.
 */
const noDataflow = (etapa, grupo, conectado = false) =>
  `<article class="dataflow-node dataflow-node--${attr(grupo)}${etapa.destaque ? ' dataflow-node--emphasis' : ''}${conectado ? ' dataflow-node--connected' : ''}">
                <div class="dataflow-node__head"><span class="dataflow-node__icon">${iconeDataflow(etapa.marca, etapa.icone)}</span><span class="dataflow-node__kind">${texto(etapa.tipo || grupo)}</span></div>
                <b>${texto(etapa.titulo)}</b><span>${texto(etapa.nota)}</span>${etapa.sigla ? `<i>${texto(etapa.sigla)}</i>` : ''}
              </article>`;

const nomeCamadaDbt = (titulo) => texto(titulo.replace(/\s*·\s*dbt$/i, ''));
const painelDbt = (camadas) =>
  `<article class="dataflow-dbt dataflow-node dataflow-node--transformacao dataflow-node--emphasis dataflow-node--connected">
                <div class="dataflow-dbt__head"><span class="dataflow-node__icon">${iconeProduto('dbt')}</span><div><span class="dataflow-node__kind">Transformação</span><b>dbt · camadas analíticas</b></div></div>
                <ol class="dataflow-dbt__stages">${camadas
                  .map(
                    (camada) =>
                      `<li><span>${texto(camada.sigla)}</span><b>${nomeCamadaDbt(camada.titulo)}</b><small>${texto(camada.nota)}</small></li>`
                  )
                  .join('')}</ol>
              </article>`;

function dataflow(d) {
  const fontes = d.zonas[0].etapas.map((etapa) => ({
    ...etapa,
    grupo: 'fonte',
    marca: etapa.titulo === 'PostgreSQL' ? 'postgresql' : 'airbyte'
  }));
  const transformacoes = d.zonas[1].camadas.map((etapa) => ({
    ...etapa,
    tipo: etapa.titulo.includes('RAW') ? 'Persistência' : 'Transformação',
    grupo: 'transformacao',
    marca: etapa.titulo.includes('Snowflake') ? 'snowflake' : 'dbt'
  }));
  const consumo = d.zonas[2].etapas.map((etapa) => ({
    ...etapa,
    grupo: 'consumo',
    marca: 'power-bi'
  }));
  const [postgresql, airbyte] = fontes;
  const [snowflake, ...camadasDbt] = transformacoes;
  const [powerBi] = consumo;

  const controles = d.governanca
    .map(
      (item) =>
        `<li><span>${iconeNeutro(item.icone)}</span><div><b>${texto(item.nome)}</b><small>${texto(item.valor)}</small></div></li>`
    )
    .join('');

  return `          <figure class="architecture-diagram architecture-diagram--dataflow" aria-label="${attr(d.alt)}">
            <div class="diagram-header"><p class="diagram-kicker">${texto(d.etiqueta)}</p><b>${texto(d.titulo)}</b></div>
            <div class="dataflow-intro"><span>Visão lógica · caminho de dados</span><span>Origem → consumo</span></div>
            <section class="dataflow-track" aria-label="Caminho de dados">
              ${noDataflow(postgresql, postgresql.grupo, true)}
              ${noDataflow(airbyte, airbyte.grupo, true)}
              ${noDataflow(snowflake, snowflake.grupo, true)}
              ${painelDbt(camadasDbt)}
              ${noDataflow(powerBi, powerBi.grupo)}
            </section>
            <div class="dataflow-control-plane"><span class="dataflow-control-plane__icon">${iconeProduto('airflow')}</span><div><b>Plano de controle · ${texto(d.orquestracao.nome)}</b><span>${texto(d.orquestracao.valor)}</span></div><small>Orquestra o fluxo, não transforma dados</small></div>
            <section class="dataflow-foundation" aria-label="${attr(d.tituloBase)}"><p>${texto(d.tituloBase)}</p><ul>${controles}</ul></section>
          </figure>`;
}

/* A fila é o estado do processo assíncrono; o Cloud Flow é o plano de
 * controle que reserva e reencaminha jobs. Eles não devem parecer cinco
 * passos lineares com a mesma importância visual. */
const noAssincrono = (etapa, classe, conectado = false) =>
  `<article class="async-job-node async-job-node--${classe}${etapa.destaque ? ' async-job-node--emphasis' : ''}${conectado ? ' async-job-node--connected' : ''}">
                <div class="async-job-node__head"><span class="async-job-node__icon" aria-hidden="true">${iconeAssincrono(etapa)}</span><span class="async-job-node__kind">${texto(etapa.tipo)}</span></div>
                <b>${texto(etapa.titulo)}</b><span>${texto(etapa.nota)}</span>
              </article>`;

function fluxoAssincrono(d) {
  const [entrada, fila, orquestrador, worker, monitoramento] = d.etapas;
  const [idempotencia, resiliencia, rastreabilidade] = d.governanca;
  const protecao = (item, ancora) =>
    `<li class="async-guardrail async-guardrail--${ancora}"><span aria-hidden="true">${icone(item.icone)}</span><div><b>${texto(item.nome)}</b><small>${texto(item.valor)}</small></div></li>`;

  return `          <figure class="architecture-diagram architecture-diagram--async" aria-label="${attr(d.alt)}">
            <div class="diagram-header"><p class="diagram-kicker">${texto(d.etiqueta)}</p><b>${texto(d.titulo)}</b></div>
            <div class="async-intro"><span>Caminho do job</span><span>Entrada → retorno</span></div>
            <div class="async-layout">
              ${noAssincrono(entrada, 'entrada', true)}
              ${noAssincrono(fila, 'fila', true)}
              <div class="async-control-plane"><span class="async-control-plane__icon" aria-hidden="true">${iconeAssincrono(orquestrador)}</span><div><span>Plano de controle</span><b>${texto(orquestrador.titulo)}</b><small>${texto(orquestrador.nota)} · reserva o job, aplica lock e agenda retentativas</small></div></div>
              ${noAssincrono(worker, 'worker', true)}
              ${noAssincrono(monitoramento, 'monitoramento')}
              <section class="async-guardrails" aria-label="Proteções por etapa"><p>Proteções por etapa</p><ul>${protecao(idempotencia, 'fila')}${protecao(resiliencia, 'controle')}${protecao(rastreabilidade, 'monitoramento')}</ul></section>
            </div>
          </figure>`;
}

/* O diagrama do Lakehouse responde a uma pergunta diferente da visão DataOps:
 * como o dado percorre a arquitetura realmente implementada. Por isso o
 * coletor, a landing e os dois modos de execução ficam explícitos, sem fazer
 * parecer que a API é chamada diretamente pelo cluster Databricks. */
const noLakehouse = (etapa, conectado = false) =>
  `<article class="lakehouse-node${etapa.destaque ? ' lakehouse-node--emphasis' : ''}${conectado ? ' lakehouse-node--connected' : ''}">
                <div class="lakehouse-node__head"><span class="lakehouse-node__icon" aria-hidden="true">${iconeLakehouse(etapa)}</span><span class="lakehouse-node__kind">${texto(etapa.tipo)}</span></div>
                <b>${texto(etapa.titulo)}</b><span>${texto(etapa.nota)}</span>
              </article>`;

const marcasLakehouse = {
  databricks: 'assets/icons/vendor/databricks/databricks-symbol-color.svg',
  python: 'assets/icons/vendor/python/python-logo-only.svg',
  'power-bi': 'assets/icons/vendor/power-bi/power_bi_48_color.svg'
};
const iconeLakehouse = (etapa) =>
  etapa.produto && marcasLakehouse[etapa.produto]
    ? `<img class="lakehouse-product-icon" src="${marcasLakehouse[etapa.produto]}" alt="">`
    : icone(etapa.icone);

const marcasAmbienteLakehouse = {
  databricks: 'assets/icons/vendor/databricks/databricks-symbol-color.svg'
};
const iconeAmbienteLakehouse = (ambiente) =>
  ambiente.produto && marcasAmbienteLakehouse[ambiente.produto]
    ? `<img class="lakehouse-environment__product-icon" src="${marcasAmbienteLakehouse[ambiente.produto]}" alt="">`
    : '';

const painelMedallion = (camadas) =>
  `<article class="lakehouse-medallion lakehouse-medallion--connected">
                <div class="lakehouse-medallion__head"><span class="lakehouse-node__icon" aria-hidden="true"><img class="lakehouse-medallion__product-icon" src="${marcasLakehouse.databricks}" alt=""></span><span><small>Medalhão Lakehouse</small><b>Camadas Delta</b></span></div>
                <ol>${camadas
                  .map(
                    (camada) =>
                      `<li class="${camada.destaque ? 'lakehouse-medallion__layer--accent' : ''}"><span aria-hidden="true">${icone(camada.icone)}</span><div><small>${texto(camada.tipo)}</small><b>${texto(camada.titulo)}</b><em>${texto(camada.nota)}</em></div></li>`
                  )
                  .join('')}</ol>
              </article>`;

function lakehouse(d) {
  const [fonte, coleta, landing, bronze, silver, gold, produtos] = d.etapas;
  const ambientes = d.ambientes
    .map(
      (ambiente) =>
        `<li>${iconeAmbienteLakehouse(ambiente)}<div><b>${texto(ambiente.nome)}</b><span>${texto(ambiente.valor)}</span></div></li>`
    )
    .join('');
  const controles = d.governanca
    .map(
      (item) =>
        `<li><span aria-hidden="true">${icone(item.icone)}</span><div><b>${texto(item.nome)}</b><small>${texto(item.valor)}</small></div></li>`
    )
    .join('');

  return `          <figure class="architecture-diagram architecture-diagram--lakehouse" aria-label="${attr(d.alt)}">
            <div class="diagram-header"><p class="diagram-kicker">${texto(d.etiqueta)}</p><b>${texto(d.titulo)}</b></div>
            <div class="lakehouse-intro"><span>Visão lógica · caminho de dados</span><span>Batch · origem → produtos</span></div>
            <section class="lakehouse-track" aria-label="Caminho de dados do Lakehouse">
              ${noLakehouse(fonte, true)}
              ${noLakehouse(coleta, true)}
              ${noLakehouse(landing, true)}
              ${painelMedallion([bronze, silver, gold])}
              ${noLakehouse(produtos)}
            </section>
            <section class="lakehouse-environments" aria-label="Ambientes de execução"><p>Ambientes de execução</p><ul>${ambientes}</ul></section>
            <section class="lakehouse-controls" aria-label="Controles transversais do Lakehouse"><p>${texto(d.tituloBase || 'Controles transversais')}</p><ul>${controles}</ul></section>
          </figure>`;
}

/* A jornada financeira é uma arquitetura operacional, e não uma sequência de
 * estados da tela. Ela deixa explícitos os limites entre a experiência do
 * solicitante, a persistência, a orquestração e o ERP, sem publicar dados ou
 * objetos do ambiente de origem. */
const marcasFinanceiras = {
  'power-apps': 'assets/icons/vendor/power-apps/PowerApps_scalable.svg',
  sharepoint: 'assets/icons/vendor/sharepoint/sharepoint_48x1.svg',
  'power-automate': 'assets/icons/vendor/power-automate/PowerAutomate_scalable.svg'
};
const iconeFinanceiro = (etapa) =>
  etapa.produto === 'sap'
    ? '<span class="financial-sap-icon" aria-hidden="true"></span>'
    : etapa.produto && marcasFinanceiras[etapa.produto]
      ? `<img class="financial-product-icon" src="${marcasFinanceiras[etapa.produto]}" alt="" aria-hidden="true">`
      : icone(etapa.icone);
const noFinanceiro = (etapa, conectado = false) =>
  `<article class="financial-node${etapa.destaque ? ' financial-node--emphasis' : ''}${conectado ? ' financial-node--connected' : ''}">
                <div class="financial-node__head"><span class="financial-node__icon" aria-hidden="true">${iconeFinanceiro(etapa)}</span><span class="financial-node__kind">${texto(etapa.tipo)}</span></div>
                <b>${texto(etapa.titulo)}</b><span>${texto(etapa.nota)}</span>
              </article>`;

function jornadaFinanceira(d) {
  const [solicitacao, persistencia, orquestracao, erp, status] = d.etapas;
  const controles = d.governanca
    .map(
      (item) =>
        `<li><span aria-hidden="true">${icone(item.icone)}</span><div><b>${texto(item.nome)}</b><small>${texto(item.valor)}</small></div></li>`
    )
    .join('');

  return `          <figure class="architecture-diagram architecture-diagram--financial" aria-label="${attr(d.alt)}">
            <div class="diagram-header"><p class="diagram-kicker">${texto(d.etiqueta)}</p><b>${texto(d.titulo)}</b></div>
            <div class="financial-intro"><span>Visão lógica · solicitação ao acompanhamento</span><span>Assíncrono · interface → ERP</span></div>
            <section class="financial-track" aria-label="Caminho operacional da solicitação financeira">
              ${noFinanceiro(solicitacao, true)}
              ${noFinanceiro(persistencia, true)}
              ${noFinanceiro(orquestracao, true)}
              ${noFinanceiro(erp, true)}
              ${noFinanceiro(status)}
            </section>
            <section class="financial-controls" aria-label="Controles transversais da jornada financeira"><p>${texto(d.tituloBase || 'Controles transversais')}</p><ul>${controles}</ul></section>
          </figure>`;
}

/* O RPA alterna HTTP e navegador porque há três limites técnicos verificados.
 * A versão pública deixa portal, domínios, seletores, contas e segredos fora
 * do desenho, mas mantém o caminho de uma conta e a razão de cada fronteira. */
const painelRpa = (zona) =>
  `<article class="rpa-detailed-zone rpa-detailed-zone--${attr(zona.classe)}">
                <header><span aria-hidden="true">${iconeRpa(zona.icone, zona.produto)}</span><div><small>${texto(zona.subtitulo)}</small><b>${texto(zona.titulo)}</b></div></header>
                <ul>${zona.itens
                  .map(
                    (item) =>
                      `<li><span aria-hidden="true">${icone(item.icone)}</span><div><b>${texto(item.titulo)}</b><small>${texto(item.nota)}</small></div></li>`
                  )
                  .join('')}</ul>
              </article>`;

const chamadaRpa = (chamada) =>
  `<li class="rpa-call${chamada.destaque ? ' rpa-call--accent' : ''}"><span>${texto(chamada.numero)}</span><div><b>${texto(chamada.rotulo)}</b><small>${texto(chamada.nota)}</small></div></li>`;

function anatomiaRpa(d) {
  const chamadasHttp = d.chamadas
    .filter((chamada) => chamada.meio === 'http')
    .map(chamadaRpa)
    .join('');
  const chamadasNavegador = d.chamadas
    .filter((chamada) => chamada.meio === 'navegador')
    .map(chamadaRpa)
    .join('');
  const restricoes = d.restricoes
    .map(
      (item) =>
        `<li><span aria-hidden="true">${icone(item.icone)}</span><div><b>${texto(item.titulo)}</b><small>${texto(item.nota)}</small></div></li>`
    )
    .join('');
  const janelas = d.janelas
    .map((item) => `<li><b>${texto(item.titulo)}</b><span>${texto(item.valor)}</span></li>`)
    .join('');

  return `          <figure class="architecture-diagram architecture-diagram--rpa-detailed" aria-label="${attr(d.alt)}">
            <div class="diagram-header"><p class="diagram-kicker">${texto(d.etiqueta)}</p><b>${texto(d.titulo)}</b></div>
            <div class="rpa-detailed-intro"><span>API quando existe · navegador quando é obrigatório</span><span>${texto(d.subtitulo)}</span></div>
            <section class="rpa-detailed-zones" aria-label="Três zonas da automação">
              ${painelRpa(d.zonas.servico)}
              <article class="rpa-detailed-robot">
                <header><span aria-hidden="true">${iconeRpa(d.robo.icone, d.robo.produto)}</span><div><small>Robô</small><b>${texto(d.robo.titulo)}</b></div></header>
                <ol>${d.robo.subfluxos.map((subfluxo) => `<li>${texto(subfluxo)}</li>`).join('')}</ol>
                <p>${texto(d.robo.rodape)}</p>
              </article>
              ${painelRpa(d.zonas.portal)}
            </section>
            <section class="rpa-detailed-calls" aria-label="Ciclo de uma conta">
              <div><p><i aria-hidden="true"></i>Chamadas HTTP</p><ol>${chamadasHttp}</ol></div>
              <div><p><i aria-hidden="true"></i>Interações no navegador</p><ol>${chamadasNavegador}</ol></div>
            </section>
            <div class="rpa-detailed-legend"><span><i aria-hidden="true"></i>HTTP</span><span><i aria-hidden="true"></i>Navegador</span><span>O passo 6 só ocorre após o login</span></div>
            <section class="rpa-detailed-restrictions" aria-label="Por que não é só um POST de token"><p>Por que não é só um <code>POST /token</code></p><ul>${restricoes}</ul></section>
            <section class="rpa-detailed-clocks" aria-label="Janelas que governam o desenho"><p>Janelas que governam o desenho</p><ul>${janelas}</ul></section>
            <figcaption>${texto(d.legenda)}</figcaption>
          </figure>`;
}

/**
 * Um case. A ordem e as classes do envoltório existem em UM lugar só — era
 * esse o ponto da conversão. Antes, seis blocos quase iguais divergiam sem
 * ninguém notar: um deles usava class="button button--secondary", que não
 * existe no CSS, e o link do repositório renderizava como texto simples
 * enquanto os outros cinco eram pílulas.
 */
export function renderizarCase(c) {
  const classes = `card case-card case-card--feature case-card--${attr(c.id.replace(/^case-/, ''))} reveal`;
  const partes = [
    `        <article class="${classes}" id="${attr(c.id)}">`,
    `          <div class="case-card__content">`,
    `          <span class="status status--${attr(c.status.variante)}">${texto(c.status.rotulo)}</span>`,
    `          <h3>${texto(c.titulo)}</h3>`,
    `          <p>${texto(c.descricao)}</p>`,
    `          <p class="scope"><b>${texto(c.escopoRotulo)}</b> ${texto(c.escopo)}</p>`,
    `          <ul class="taglist">`,
    ...c.tags.map((t) => `            <li class="tag">${texto(t)}</li>`),
    `          </ul>`
  ];

  if (c.repositorio) {
    partes.push(
      `          <a class="btn btn--ghost mt-6" href="${attr(c.repositorio)}" target="_blank" rel="noopener">Ver repositório e evidências <span aria-hidden="true">↗</span></a>`
    );
  }

  partes.push(`          </div>`, diagrama(c.diagrama), `        </article>`);
  return partes.join('\n');
}

export function renderizarCases(cases) {
  return cases.map(renderizarCase).join('\n\n');
}
