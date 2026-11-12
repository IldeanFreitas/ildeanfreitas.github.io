#!/usr/bin/env node
/**
 * Gera uma página por demonstração (app de Power Apps ou painel de Power BI) e
 * o player em tela cheia, em cada idioma de src/idiomas.json, mais o
 * redirecionamento das antigas galerias. Depende da página de cada idioma já
 * gerada (index.html, en/index.html…: reaproveita CSS, cabeçalho, rodapé e
 * scripts), então roda DEPOIS de scripts/build.mjs.
 *
 * As galerias vivem na home, na seção Cases (cartão em scripts/demos.mjs,
 * montado por scripts/cases.mjs): os apps na aba Power Platform desde
 * 11/11/2026, os painéis na aba Power BI desde 12/11/2026. As URLs antigas
 * /demos/power-apps/, /demos/power-bi/ e as equivalentes de cada idioma
 * (/en/…) viram redirecionamento para lá.
 *
 * Saída, por coleção (COLECOES em scripts/demos.mjs): demos/<coleção>/index.html
 * (redirecionamento), demos/<coleção>/<slug>/index.html, .../tela-cheia/index.html
 * e as equivalentes na pasta de cada outro idioma (en/…). Os apps e painéis
 * (app.html) ficam versionados ao lado, uma vez só: são em português por
 * decisão, e as páginas dos outros idiomas avisam (`notaIdioma`).
 * `--check` só confere se os arquivos gerados estão em dia.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLECOES, avisoApps, conferirDemos, enderecoDe, esc, selo, tagsApp } from './demos.mjs';
import { spriteFluent } from './cases.mjs';
import { lerIdiomasOuSair } from './idiomas.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8');
const MODO_CHECK = process.argv.includes('--check');

/**
 * Os idiomas do site, na ordem do menu (ver scripts/idiomas.mjs). Cada página
 * daqui sai uma vez por idioma, e cada uma aponta para a equivalente nos outros.
 */
const IDIOMAS = lerIdiomasOuSair();
const PADRAO = IDIOMAS.find((idioma) => idioma.padrao);

/* Textos das demonstrações: todo idioma da configuração precisa dos seus. O
 * build já confere; aqui a conferência vale para quem roda só este script. */
{
  const problemas = conferirDemos(
    IDIOMAS.map((idioma) => idioma.codigo),
    PADRAO.codigo
  );
  if (problemas.length) {
    console.error(`Textos das demonstrações incompletos:\n  ${problemas.join('\n  ')}`);
    process.exit(1);
  }
}

/**
 * Coleção em geração (apps de Power Apps ou painéis de Power BI; COLECOES em
 * scripts/demos.mjs). As funções abaixo leem estas variáveis; o laço do fim
 * troca a coleção. DEMOS = caminho das páginas e dos apps, sem barra nas pontas.
 */
let DEMOS;
let dados;
let T;
let CFG;

function pedacos(htmlGerado) {
  /* O index gerado usa assets/ relativo; as páginas internas usam caminho de raiz. */
  const css = htmlGerado
    .match(/<style>\n([\s\S]*?)\n<\/style>/)[1]
    .replace(/url\((['"]?)(?:\.\.\/)?assets\//g, 'url($1/assets/');
  const header = htmlGerado.match(/<header class="site-header">[\s\S]*?<\/header>/)[0];
  const footer = htmlGerado.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
  const scripts = [...htmlGerado.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g)].map((m) => m[1]);
  // O link "pular para o conteúdo" já está traduzido no template de cada idioma.
  const pular = htmlGerado.match(/<a class="skip" href="#conteudo">[^<]*<\/a>/)?.[0];
  if (!pular) throw new Error('pedacos: link "pular para o conteúdo" (a.skip) não encontrado.');
  return { css, header, footer, pular, ini: scripts[0], principal: scripts[scripts.length - 1] };
}

/**
 * Âncoras da home viram links para a home do idioma; os links de idioma passam
 * a apontar para a página par em cada idioma (`enderecos`: `lang` → endereço).
 *
 * Link de idioma é todo `<a … href hreflang lang>` que o build gera a partir de
 * src/idiomas.json: os itens do menu `<details class="idiomas">` do cabeçalho
 * (um por idioma, o atual com aria-current="page") e os do rodapé (um por
 * outro idioma). `esperados` é quantos o trecho precisa ter. Se a contagem não
 * bater, a marcação do menu mudou: falha alto em vez de publicar página de
 * demonstração cujo menu leva à home do outro idioma.
 */
function ajustarNav(trecho, idioma, enderecos, onde, esperados) {
  let reescritos = 0;
  const html = trecho
    .replace(/href="#inicio"/g, `href="${idioma.caminho}"`)
    .replace(/href="#([a-z]+)"/g, `href="${idioma.caminho}#$1"`)
    .replace(
      /(<a\b[^>]*?) href="[^"]*"( hreflang="([^"]+)" lang="[^"]+")/g,
      (tudo, antes, depois, lang) => {
        if (!enderecos.has(lang))
          throw new Error(
            `ajustarNav: link de idioma "${lang}" no ${onde} (${idioma.codigo}) não está em src/idiomas.json.`
          );
        reescritos++;
        return `${antes} href="${enderecos.get(lang)}"${depois}`;
      }
    );
  if (reescritos !== esperados) {
    throw new Error(
      `ajustarNav: ${reescritos} links de idioma reescritos no ${onde} (${idioma.codigo}), esperados ${esperados}. A marcação do menu de idiomas mudou; adapte scripts/mockups.mjs.`
    );
  }
  return html;
}

/**
 * Sandbox único dos iframes (página do app e player). Sem allow-same-origin: os apps não
 * usam storage, cookie, parent nem postMessage. allow-forms para o submit dos formulários;
 * allow-popups e allow-popups-to-escape-sandbox para os links do Learn em nova aba.
 */
const SANDBOX =
  'allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox';

/**
 * Página de um app ou painel. `caminho`: o da página sem o idioma
 * ("demos/power-apps/inspecao-via/"), igual em todos. Canonical, hreflang e
 * menu saem da lista de idiomas, como na home: a página aponta para ela mesma
 * em cada idioma, e x-default para a do idioma padrão.
 */
function pagina(idioma, p, { titulo, descricao, caminho, corpo }) {
  const enderecos = new Map(IDIOMAS.map((i) => [i.lang, enderecoDe(i.codigo, caminho)]));
  const alternativas = [
    ...IDIOMAS.map((i) => `<link rel="alternate" hreflang="${i.lang}" href="${i.url}${caminho}">`),
    `<link rel="alternate" hreflang="x-default" href="${PADRAO.url}${caminho}">`
  ].join('\n');
  return `<!DOCTYPE html>
<!-- ARQUIVO GERADO por scripts/mockups.mjs a partir de src/data/${CFG.json}. Não edite. -->
<html lang="${idioma.lang}" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} | Ildean Freitas</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${idioma.url}${caminho}">
${alternativas}
<meta name="theme-color" content="#000000">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/mona-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<style>
${p.css}
</style>
<script>
${p.ini}
</script>
</head>

<body>
${p.pular}
${ajustarNav(p.header, idioma, enderecos, 'cabeçalho', IDIOMAS.length)}

<main id="conteudo">
${corpo}
</main>

${ajustarNav(p.footer, idioma, enderecos, 'rodapé', IDIOMAS.length - 1)}

<script>
${p.principal}
</script>
</body>
</html>
`;
}

function detalhe(idioma, c) {
  const lang = idioma.codigo;
  const t = T[lang];
  const app = `/${DEMOS}/${c.slug}/app.html`;
  const tags = tagsApp(lang, c);
  return `${spriteFluent(tags)}
  <section class="section">
    <div class="wrap">
      <a class="mock-voltar" href="${idioma.caminho}${CFG.secao}">${t.voltar}</a>
      <p class="eyebrow mock-kicker">${esc(c.segmento[lang])} ${CFG.sep} ${esc(c.empresa)}</p>
      <h1>${esc(c.titulo[lang])}</h1>
      ${avisoApps(lang, '      ', CFG)}
      <p class="case-card__status">${selo(lang, CFG)}</p>
      ${tags}
      <p class="scope"><b>${t.escopoRot}</b> ${t.escopo}</p>
      <h2>${t.dor}</h2>
      <p class="lead">${esc(c.dor[lang])}</p>
      <h2>${t.solucao}</h2>
      <p class="lead">${esc(c.solucao[lang])}</p>
      <h2>${t.roteiro}</h2>
      <ol class="mock-passos">
${c.passos[lang].map((s) => `        <li>${esc(s)}</li>`).join('\n')}
      </ol>
      <div class="mock-acoes">
        <a class="btn btn--primary" href="${enderecoDe(lang, `${DEMOS}/${c.slug}/tela-cheia/`)}">${t.cheia}</a>
      </div>
      <p class="mock-so-mobile sem-margem">${t.mobile}</p>
      <iframe class="mock-moldura mock-so-desktop" src="${app}" title="${t.moldura} ${esc(c.empresa)}" loading="lazy" allow="fullscreen" sandbox="${SANDBOX}"></iframe>
    </div>
  </section>`;
}

/**
 * As antigas galerias (/demos/power-apps/, /demos/power-bi/ e as equivalentes de
 * cada idioma, /en/…): os apps agora ficam na aba Power Platform da home e os
 * painéis, na aba Power BI. Redirecionamento por meta refresh (vale sem JS) e
 * location.replace (não deixa a página no histórico), noindex, canonical para a
 * home do mesmo idioma e um link visível para quem o navegador não levar. Sem
 * hreflang nem menu de idiomas: a página não é indexada e ninguém fica nela.
 */
function redirecionamento(idioma) {
  const t = T[idioma.codigo];
  const destino = `${idioma.caminho}${CFG.secao}`;
  return `<!DOCTYPE html>
<!-- ARQUIVO GERADO por scripts/mockups.mjs. Não edite. A galeria agora vive na home. -->
<html lang="${idioma.lang}" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${destino}">
<title>${esc(t.titulo)} | Ildean Freitas</title>
<link rel="canonical" href="${idioma.url}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<script>
${TEMA_JS}
location.replace(${JSON.stringify(destino)});
</script>
<style>
${REDIR_CSS}
</style>
</head>
<body>
<main>
<p>${t.redirecionamento.texto}</p>
<p><a href="${destino}">${t.redirecionamento.link}</a></p>
</main>
</body>
</html>
`;
}

/**
 * Player em tela cheia: página própria, sem o cabeçalho do site, mas com a mesma
 * identidade (fonte e tokens lidos de src/css, tema salvo em localStorage 'tema').
 * Abaixo de 700 px o modo Tablet 16:9 some (ficaria com uns 210 px de altura) e a
 * barra compacta; a dica continua anunciada (aria-live), só sai da tela.
 */
const TEMA_JS = `(function () {
  try {
    var salvo = localStorage.getItem('tema');
    if (salvo === 'dark' || salvo === 'light') document.documentElement.setAttribute('data-theme', salvo);
  } catch (e) {}
})();`;
const PLAYER_CSS = `${ler('src/css/base/fonte.css').trim()}
${ler('src/css/base/tokens.css').trim()}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{display:flex;flex-direction:column;background:var(--bg);color:var(--text);font:14px/1.4 var(--font)}
.barra{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1rem;padding:.5rem .9rem;background:var(--bg-alt);border-bottom:1px solid var(--border-strong)}
.barra a,.barra button{color:var(--text);font:inherit}
.voltar{display:inline-flex;align-items:center;min-height:40px;text-decoration:none;font-weight:600;padding:.4rem .9rem;border:1px solid var(--border-strong);border-radius:var(--r-pill)}
.voltar:hover{border-color:var(--accent-solid)}
.nome{font-weight:700;margin-right:auto}
.modos{display:flex;gap:.25rem;border:0;padding:0;margin:0}
.modos legend{position:absolute;left:-9999px}
.modos button,.tela{background:var(--surface-soft);border:1px solid var(--border-strong);border-radius:var(--r-pill);padding:.4rem .9rem;cursor:pointer;min-height:40px}
.modos button:hover,.tela:hover{border-color:var(--accent-solid)}
.modos button[aria-pressed="true"]{background:var(--lime-soft);color:var(--accent);border-color:var(--border-lime);font-weight:700}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.dica{margin:0;padding:.3rem .9rem;color:var(--text-muted);font-size:.8rem;background:var(--bg-alt);border-bottom:1px solid var(--border)}
.palco{flex:1;min-height:0;display:grid;place-items:center;overflow:hidden;position:relative;background:var(--bg)}
.caixa{position:relative;background:#fff;overflow:hidden;box-shadow:0 0 0 1px var(--border-strong)}
iframe{border:0;display:block;background:#fff;transform-origin:0 0}
@media (max-width:700px){
  [data-modo="tablet"]{display:none}
  .barra{gap:.35rem;padding:.35rem .5rem;font-size:13px}
  .nome{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .voltar,.modos button,.tela{min-height:32px;padding:.25rem .65rem}
  .voltar{margin-right:auto}
  .dica{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;padding:0;border:0}
}`;

/** Página de redirecionamento: mesma fonte e tokens, só o texto e o link. */
const REDIR_CSS = `${ler('src/css/base/fonte.css').trim()}
${ler('src/css/base/tokens.css').trim()}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text);font:1rem/1.6 var(--font)}
main{padding:2rem 1.25rem;text-align:center}
a{color:var(--accent);font-weight:600;text-underline-offset:.22em}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:6px}`;

function player(idioma, c) {
  const t = T[idioma.codigo];
  const p = t.player;
  const app = `/${DEMOS}/${c.slug}/app.html`;
  const voltar = enderecoDe(idioma.codigo, `${DEMOS}/${c.slug}/`);
  const titulo = `${c.empresa} ${CFG.sep} ${t.nome}`;
  return `<!DOCTYPE html>
<!-- ARQUIVO GERADO por scripts/mockups.mjs. Não edite. -->
<html lang="${idioma.lang}" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(c.empresa)} | ${esc(t.titulo)}</title>
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="preload" href="/assets/fonts/mona-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<script>
${TEMA_JS}
</script>
<style>
${PLAYER_CSS}
</style>
</head>
<body>
<div class="barra">
  <a class="voltar" href="${voltar}">${p.voltar}</a>
  <span class="nome">${esc(titulo)}</span>
  <fieldset class="modos"><legend>${p.modos}</legend>
    <button type="button" data-modo="tablet" aria-pressed="false">${p.tablet}</button>
    <button type="button" data-modo="celular" aria-pressed="false">${p.celular}</button>
    <button type="button" data-modo="janela" aria-pressed="false">${p.janela}</button>
  </fieldset>
  <button type="button" class="tela" id="tela">${p.tela}</button>
</div>
<p class="dica" id="dica" aria-live="polite">${p.nota}</p>
<div class="palco" id="palco"><div class="caixa" id="caixa"><iframe id="app" src="${app}" title="${t.moldura} ${esc(c.empresa)}" allow="fullscreen" sandbox="${SANDBOX}"></iframe></div></div>
<script>
(function () {
  var DICAS = ${JSON.stringify(p.dica)};
  var TAM = { tablet: [1366, 768], celular: [390, 844] };
  var palco = document.getElementById('palco');
  var caixa = document.getElementById('caixa');
  var app = document.getElementById('app');
  var botoes = document.querySelectorAll('[data-modo]');
  var modo = 'janela';
  function ajustar() {
    var w = palco.clientWidth, h = palco.clientHeight;
    if (modo === 'janela') {
      caixa.style.width = w + 'px'; caixa.style.height = h + 'px';
      app.style.width = w + 'px'; app.style.height = h + 'px'; app.style.transform = 'none';
      return;
    }
    var d = TAM[modo];
    var k = Math.min(w / d[0], h / d[1], 1);
    caixa.style.width = Math.floor(d[0] * k) + 'px'; caixa.style.height = Math.floor(d[1] * k) + 'px';
    app.style.width = d[0] + 'px'; app.style.height = d[1] + 'px';
    app.style.transform = 'scale(' + k + ')';
  }
  function aplicar(m) {
    modo = m;
    botoes.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.modo === m ? 'true' : 'false'); });
    document.getElementById('dica').textContent = DICAS[m];
    ajustar();
  }
  botoes.forEach(function (b) { b.addEventListener('click', function () { aplicar(b.dataset.modo); }); });
  document.getElementById('tela').addEventListener('click', function () {
    var el = document.documentElement;
    if (document.fullscreenElement) { document.exitFullscreen(); }
    else if (el.requestFullscreen) { el.requestFullscreen().catch(function () {}); }
  });
  var estreito = window.matchMedia('(max-width: 700px)');
  window.addEventListener('resize', function () {
    if (modo === 'tablet' && estreito.matches) aplicar('janela');
    else ajustar();
  });
  aplicar(modo);
})();
</script>
</body>
</html>
`;
}

const saidas = new Map();
for (const col of Object.values(COLECOES)) {
  DEMOS = col.demos;
  dados = col.dados;
  T = col.T;
  CFG = col;
  for (const idioma of IDIOMAS) {
    const lang = idioma.codigo;
    const t = T[lang];
    const p = pedacos(ler(idioma.arquivo));
    const pre = idioma.pasta;
    saidas.set(`${pre}${DEMOS}/index.html`, redirecionamento(idioma));
    for (const c of dados) {
      const caminho = `${DEMOS}/${c.slug}/`;
      saidas.set(`${pre}${caminho}tela-cheia/index.html`, player(idioma, c));
      saidas.set(
        `${pre}${caminho}index.html`,
        pagina(idioma, p, {
          titulo: c.titulo[lang],
          descricao: t.desc(c.solucao[lang]),
          caminho,
          corpo: detalhe(idioma, c)
        })
      );
    }
  }
}

let defasados = 0;
for (const [arq, html] of saidas) {
  const dest = join(RAIZ, arq);
  if (MODO_CHECK) {
    if (!existsSync(dest) || readFileSync(dest, 'utf8') !== html) {
      console.error(`Desatualizado: ${arq}`);
      defasados++;
    }
  } else {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
  }
}
for (const col of Object.values(COLECOES)) {
  for (const c of col.dados) {
    if (!existsSync(join(RAIZ, `${col.demos}/${c.slug}/app.html`))) {
      console.error(`Falta ${col.demos}/${c.slug}/app.html`);
      defasados++;
    }
  }
}
if (MODO_CHECK && defasados) process.exit(1);
console.log(
  `${saidas.size} páginas ${MODO_CHECK ? 'conferidas' : 'geradas'} (${IDIOMAS.length} idiomas).`
);
