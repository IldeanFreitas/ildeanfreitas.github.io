/**
 * Extração única da etapa 3b.
 *
 * Lê os seis <article class="case-card"> de src/index.template.html e escreve
 * src/data/cases.json. Roda uma vez; depois disso a fonte dos cases é o JSON e
 * quem monta o HTML é o renderizador em scripts/build.mjs.
 *
 * Extrair em vez de redigitar não é preguiça: são seis blocos de texto longo,
 * e transcrever à mão introduziria erro silencioso justamente no conteúdo que
 * o site existe para mostrar.
 *
 *   node scripts/extrair-cases.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
// Le o template ANTERIOR a esta etapa, passado como argumento. Depois da
// extracao o template so tem o marcador <!--{{ CASES }}-->, e apontar para ele
// devolveria zero cases.
//
//   git show HEAD:src/index.template.html > tpl-anterior.html
//   node scripts/extrair-cases.mjs tpl-anterior.html
const origem = process.argv[2] || 'src/index.template.html';
const html = await readFile(join(RAIZ, origem), 'utf8');

const limpar = (s) => s.replace(/\s+/g, ' ').trim();

/** Um <article ...>…</article> por case, na ordem em que aparecem. */
const artigos = [
  ...html.matchAll(/<article[^>]*class="card case-card reveal"[^>]*>([\s\S]*?)<\/article>/g)
];
if (artigos.length !== 6) {
  console.error(`Esperava 6 cases, encontrei ${artigos.length}.`);
  process.exit(1);
}

function etapas(bloco) {
  return [
    ...bloco.matchAll(/<div class="diagram-stage( diagram-stage--accent)?">([\s\S]*?)<\/div>/g)
  ].map(([, destaque, dentro]) => {
    const campo = (nome) =>
      limpar(
        (dentro.match(new RegExp(`<span class="diagram-stage__${nome}">([\\s\\S]*?)</span>`)) ||
          [])[1] || ''
      );
    const etapa = { tipo: campo('type'), titulo: campo('title'), nota: campo('meta') };
    if (destaque) etapa.destaque = true;
    return etapa;
  });
}

function camadas(bloco) {
  return [
    ...bloco.matchAll(
      /<div class="diagram-layer( diagram-layer--accent)?">([\s\S]*?)<\/div>\s*<\/div>/g
    )
  ].map(([, destaque, dentro]) => {
    const sigla = limpar(
      (dentro.match(/<span class="diagram-layer__mark">([\s\S]*?)<\/span>/) || [])[1] || ''
    );
    const titulo = limpar((dentro.match(/<b>([\s\S]*?)<\/b>/) || [])[1] || '');
    const nota = limpar((dentro.match(/<b>[\s\S]*?<\/b><span>([\s\S]*?)<\/span>/) || [])[1] || '');
    const camada = { sigla, titulo, nota };
    if (destaque) camada.destaque = true;
    return camada;
  });
}

const cases = artigos.map(([, corpo]) => {
  const pegar = (re) => limpar((corpo.match(re) || [])[1] || '');

  const item = {
    id: '',
    status: { variante: '', rotulo: '' },
    titulo: '',
    descricao: '',
    escopo: '',
    tags: [],
    diagrama: {}
  };

  item.status.variante = pegar(/<span class="status status--([a-z]+)">/);
  item.status.rotulo = pegar(/<span class="status status--[a-z]+">([\s\S]*?)<\/span>/);
  item.titulo = pegar(/<h3>([\s\S]*?)<\/h3>/);
  item.descricao = pegar(/<h3>[\s\S]*?<\/h3>\s*<p>([\s\S]*?)<\/p>/);
  // O rotulo do paragrafo de escopo VARIA: cinco cases dizem "Declaração de
  // escopo:" e o da Camara diz "Evidências:". Fixar o texto no renderizador
  // apagaria o do case divergente — foi o que a comparacao de DOM pegou.
  const escopo = corpo.match(/<p class="scope">\s*<b>([\s\S]*?)<\/b>([\s\S]*?)<\/p>/);
  item.escopoRotulo = limpar(escopo[1]);
  item.escopo = limpar(escopo[2]);
  item.tags = [...corpo.matchAll(/<li class="tag">([\s\S]*?)<\/li>/g)].map(([, t]) => limpar(t));

  // Aceita as duas formas que existiam. Um dos seis usava class="button
  // button--secondary", que NAO existe no CSS: o link renderizava como texto
  // simples enquanto os outros quatro eram pilulas. O renderizador emite uma
  // forma so, e o desvio deixa de ser possivel.
  const link = corpo.match(
    /<a class="(?:btn btn--ghost mt-6|button button--secondary)" href="([^"]+)"/
  );
  if (link) item.repositorio = link[1];

  const fig = corpo.match(
    /<figure class="architecture-diagram" role="img" aria-label="([^"]*)">([\s\S]*)<\/figure>/
  );
  item.diagrama.alt = limpar(fig[1]);
  const dentro = fig[2];

  item.diagrama.etiqueta = limpar(
    (dentro.match(/<p class="diagram-kicker">([\s\S]*?)<\/p>/) || [])[1] || ''
  );
  item.diagrama.titulo = limpar(
    (dentro.match(/<div class="diagram-header">[\s\S]*?<b>([\s\S]*?)<\/b>/) || [])[1] || ''
  );

  const fluxo = dentro.match(
    /<div class="diagram-flow">([\s\S]*?)<\/div>\s*<div class="diagram-foundation">/
  );
  if (fluxo) {
    item.diagrama.forma = 'fluxo';
    item.diagrama.etapas = etapas(fluxo[1]);
  } else {
    item.diagrama.forma = 'camadas';
    const layout = dentro.match(
      /<div class="diagram-data-layout">([\s\S]*)<\/div>\s*<div class="diagram-foundation">/
    )[1];
    item.diagrama.zonas = [
      ...layout.matchAll(
        /<section class="diagram-zone( diagram-zone--pipeline)?">([\s\S]*?)<\/section>/g
      )
    ].map(([, pipeline, z]) => {
      const zona = {
        titulo: limpar((z.match(/<p class="diagram-zone__title">([\s\S]*?)<\/p>/) || [])[1] || '')
      };
      if (pipeline) {
        zona.pipeline = true;
        zona.camadas = camadas(z);
      } else {
        zona.etapas = etapas(z);
      }
      return zona;
    });
  }

  const base = dentro.match(/<div class="diagram-foundation">([\s\S]*?)<\/div>/)[1];
  item.diagrama.governanca = [...base.matchAll(/<span><b>([\s\S]*?)<\/b>([\s\S]*?)<\/span>/g)].map(
    ([, n, v]) => ({
      nome: limpar(n),
      valor: limpar(v)
    })
  );

  return item;
});

// Os ids vêm do atributo do <article>, que fica fora do grupo capturado.
const ids = [
  ...html.matchAll(
    /<article[^>]*class="card case-card reveal"[^>]*id="(case-[a-z-]+)"|<article[^>]*id="(case-[a-z-]+)"[^>]*class="card case-card reveal"/g
  )
];
cases.forEach((c, i) => {
  c.id = ids[i][1] || ids[i][2];
});

await mkdir(join(RAIZ, 'src/data'), { recursive: true });
await writeFile(join(RAIZ, 'src/data/cases.json'), JSON.stringify(cases, null, 2) + '\n', 'utf8');

console.warn(`${cases.length} cases extraídos:`);
cases.forEach((c) =>
  console.warn(
    `  ${c.id.padEnd(28)} ${c.diagrama.forma.padEnd(8)} ${c.tags.length} tags` +
      (c.repositorio ? ' · com repositório' : '')
  )
);
