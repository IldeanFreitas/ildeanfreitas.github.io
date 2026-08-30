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

const etapa = (e) =>
  `<div class="diagram-stage${e.destaque ? ' diagram-stage--accent' : ''}">` +
  `<span class="diagram-stage__type">${texto(e.tipo)}</span>` +
  `<span class="diagram-stage__title">${texto(e.titulo)}</span>` +
  `<span class="diagram-stage__meta">${texto(e.nota)}</span></div>`;

const camada = (c) =>
  `<div class="diagram-layer${c.destaque ? ' diagram-layer--accent' : ''}">` +
  `<span class="diagram-layer__mark">${texto(c.sigla)}</span>` +
  `<div><b>${texto(c.titulo)}</b><span>${texto(c.nota)}</span></div></div>`;

const zona = (z) =>
  `              <section class="diagram-zone${z.pipeline ? ' diagram-zone--pipeline' : ''}">\n` +
  `                <p class="diagram-zone__title">${texto(z.titulo)}</p>\n` +
  (z.pipeline ? z.camadas.map(camada) : z.etapas.map(etapa))
    .map((h) => `                ${h}`)
    .join('\n') +
  `\n              </section>`;

function diagrama(d) {
  const corpo =
    d.forma === 'fluxo'
      ? `            <div class="diagram-flow">\n` +
        d.etapas.map((e) => `              ${etapa(e)}`).join('\n') +
        `\n            </div>`
      : `            <div class="diagram-data-layout">\n` +
        d.zonas.map(zona).join('\n') +
        `\n            </div>`;

  const base = d.governanca
    .map((g) => `<span><b>${texto(g.nome)}</b>${texto(g.valor)}</span>`)
    .join('');

  return (
    `          <figure class="architecture-diagram" role="img" aria-label="${attr(d.alt)}">\n` +
    `            <div class="diagram-header"><p class="diagram-kicker">${texto(d.etiqueta)}</p><b>${texto(d.titulo)}</b></div>\n` +
    corpo +
    `\n            <div class="diagram-foundation">${base}</div>\n` +
    `          </figure>`
  );
}

/**
 * Um case. A ordem e as classes do envoltório existem em UM lugar só — era
 * esse o ponto da conversão. Antes, seis blocos quase iguais divergiam sem
 * ninguém notar: um deles usava class="button button--secondary", que não
 * existe no CSS, e o link do repositório renderizava como texto simples
 * enquanto os outros cinco eram pílulas.
 */
export function renderizarCase(c) {
  const partes = [
    `        <article class="card case-card reveal" id="${attr(c.id)}">`,
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
