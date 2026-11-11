#!/usr/bin/env node
/**
 * Gera a galeria "Apps de demonstração Power Apps" e uma página por app (pt e en).
 * Depende de index.html e en/index.html já gerados (reaproveita CSS, cabeçalho,
 * rodapé e scripts), então roda DEPOIS de scripts/build.mjs.
 *
 * Saída: demos/power-apps/index.html, demos/power-apps/<slug>/index.html e
 * en/demos/power-apps/... Os apps (app.html) ficam versionados ao lado.
 * `--check` só confere se os arquivos gerados estão em dia.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8');
const MODO_CHECK = process.argv.includes('--check');
/** Caminho das páginas e dos apps, sem barra nas pontas (muda em um lugar só). */
const DEMOS = 'demos/power-apps';
const dados = JSON.parse(ler('src/data/mockups-power-apps.json'));

const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const T = {
  pt: {
    base: '/',
    home: '/',
    outro: `/en/${DEMOS}/`,
    lang: 'pt-BR',
    titulo: 'Apps de demonstração para Power Apps',
    intro:
      'Doze apps de demonstração, navegáveis. Cada um parte de um cenário fictício e mostra como seria construído na Power Platform.',
    filtroTodos: 'Todos',
    filtroRot: 'Filtrar por segmento',
    selo: 'Arquitetura documentada',
    ficticia: '(fictícia)',
    ver: 'Ver o app de demonstração',
    voltar: '← Todos os apps de demonstração',
    dor: 'Cenário fictício',
    solucao: 'O que a demonstração mostra',
    roteiro: 'Teste em 3 passos',
    aviso: 'Empresa e dados fictícios. Não é trabalho entregue nem resultado medido.',
    notaIdioma: '',
    escopoRot: 'Execução na Power Platform:',
    escopo: 'nenhuma. Protótipo em HTML com dados fictícios.',
    cheia: 'Abrir em tela cheia',
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
    outro: `/${DEMOS}/`,
    lang: 'en',
    titulo: 'Demo apps for Power Apps',
    intro:
      'Twelve clickable demo apps. Each starts from a fictitious scenario and shows how it would be built on the Power Platform.',
    filtroTodos: 'All',
    filtroRot: 'Filter by segment',
    selo: 'Documented architecture',
    ficticia: '(fictitious)',
    ver: 'See the demo app',
    voltar: '← All demo apps',
    dor: 'Fictitious scenario',
    solucao: 'What the demo shows',
    roteiro: 'Try it in 3 steps',
    aviso: 'Fictitious company and data. It is not delivered work or a measured result.',
    notaIdioma: 'The demo apps are in Portuguese.',
    escopoRot: 'Execution on Power Platform:',
    escopo: 'none. HTML prototype with fictional data.',
    cheia: 'Open full screen',
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

function pedacos(htmlGerado) {
  /* O index gerado usa assets/ relativo; as páginas internas usam caminho de raiz. */
  const css = htmlGerado
    .match(/<style>\n([\s\S]*?)\n<\/style>/)[1]
    .replace(/url\((['"]?)(?:\.\.\/)?assets\//g, 'url($1/assets/');
  const header = htmlGerado.match(/<header class="site-header">[\s\S]*?<\/header>/)[0];
  const footer = htmlGerado.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
  const scripts = [...htmlGerado.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g)].map((m) => m[1]);
  return { css, header, footer, ini: scripts[0], principal: scripts[scripts.length - 1] };
}

/**
 * Âncoras da home viram links para a home; o link de idioma (botão do cabeçalho e item
 * do rodapé) passa a apontar para a página par no outro idioma. Se nenhum link de
 * idioma for reescrito, o cabeçalho ou o rodapé mudou (a F2a troca o alternador por um
 * menu de idiomas): falha alto em vez de publicar páginas que levam à home do outro idioma.
 */
function ajustarNav(trecho, lang, urlOutroIdioma, onde) {
  const t = T[lang];
  let idioma = 0;
  const html = trecho
    .replace(/href="#inicio"/g, `href="${t.home}"`)
    .replace(/href="#([a-z]+)"/g, `href="${t.home}#$1"`)
    .replace(/(<a class="icon-btn icon-btn--text lang-toggle" href=")[^"]*"/, (_, a) => {
      idioma++;
      return `${a}${urlOutroIdioma}"`;
    })
    .replace(/(<li><a href=")[^"]*(" hreflang="(?:en|pt-BR)")/, (_, a, b) => {
      idioma++;
      return `${a}${urlOutroIdioma}${b}`;
    });
  if (!idioma) {
    throw new Error(
      `ajustarNav: nenhum link de idioma reescrito no ${onde} (${lang}). O markup do alternador mudou; adapte scripts/mockups.mjs.`
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

function pagina(lang, p, { titulo, descricao, canonico, alternativo, corpo, scriptExtra }) {
  const t = T[lang];
  const alt =
    lang === 'pt' ? ['pt-BR', canonico, 'en', alternativo] : ['pt-BR', alternativo, 'en', canonico];
  return `<!DOCTYPE html>
<!-- ARQUIVO GERADO por scripts/mockups.mjs a partir de src/data/mockups-power-apps.json. Não edite. -->
<html lang="${t.lang}" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} | Ildean Freitas</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="https://ildeanfreitas.github.io${canonico}">
<link rel="alternate" hreflang="${alt[0]}" href="https://ildeanfreitas.github.io${alt[1]}">
<link rel="alternate" hreflang="${alt[2]}" href="https://ildeanfreitas.github.io${alt[3]}">
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
<a class="skip" href="#conteudo">${lang === 'pt' ? 'Pular para o conteúdo' : 'Skip to content'}</a>
${ajustarNav(p.header, lang, alternativo, 'cabeçalho')}

<main id="conteudo">
${corpo}
</main>

${ajustarNav(p.footer, lang, alternativo, 'rodapé')}

<script>
${p.principal}
</script>${scriptExtra ?? ''}
</body>
</html>
`;
}

/** Selo no mesmo pill dos projetos da home (status status--designed). */
const selo = (t) => `<span class="status status--designed sem-margem">${esc(t.selo)}</span>`;
/** Aviso de dados fictícios; nas páginas em inglês a nota de idioma fica dentro da caixa. */
const aviso = (t) =>
  `<div class="mock-aviso">
        <p>${t.aviso}</p>${
          t.notaIdioma
            ? `
        <p class="mock-nota">${t.notaIdioma}</p>`
            : ''
        }
      </div>`;
const tags = (c) => c.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('');

function cartao(lang, c) {
  const t = T[lang];
  const href = `${t.base}${DEMOS}/${c.slug}/`;
  return `        <article class="card mock-card" data-segmento="${esc(c.segmento[lang])}">
          <p class="case-card__status">${selo(t)}</p>
          <p class="mock-card__seg sem-margem">${esc(c.segmento[lang])} · ${esc(c.empresa)} <span class="mock-ficticia">${t.ficticia}</span></p>
          <h2>${esc(c.titulo[lang])}</h2>
          <p class="sem-margem">${esc(c.solucao[lang])}</p>
          <p class="taglist sem-margem">${tags(c)}</p>
          <a class="btn btn--ghost" href="${href}">${t.ver}<span class="sr-only">: ${esc(c.titulo[lang])}</span></a>
        </article>`;
}

function galeria(lang) {
  const t = T[lang];
  const segs = [...new Set(dados.map((c) => c.segmento[lang]))];
  const corpo = `  <section class="section">
    <div class="wrap">
      <p class="eyebrow">Power Apps</p>
      <h1>${t.titulo}</h1>
      <p class="lead">${t.intro}</p>
      ${aviso(t)}
      <div class="mock-filtros" role="group" aria-label="${t.filtroRot}">
        <button type="button" aria-pressed="true" data-seg="">${t.filtroTodos}</button>
${segs.map((s) => `        <button type="button" aria-pressed="false" data-seg="${esc(s)}">${esc(s)}</button>`).join('\n')}
      </div>
      <p class="sr-only" id="mock-contagem" aria-live="polite"></p>
      <div class="grid grid--3 mock-grid">
${dados.map((c) => cartao(lang, c)).join('\n')}
      </div>
    </div>
  </section>`;
  const js = `
<script>
(function () {
  var bs = document.querySelectorAll('.mock-filtros button');
  var cs = document.querySelectorAll('.mock-card');
  var conta = document.getElementById('mock-contagem');
  bs.forEach(function (b) {
    b.addEventListener('click', function () {
      var n = 0;
      bs.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      cs.forEach(function (c) {
        c.hidden = !!b.dataset.seg && c.dataset.segmento !== b.dataset.seg;
        if (!c.hidden) n++;
      });
      conta.textContent = n + (n === 1 ? ' app' : ' apps');
    });
  });
})();
</script>`;
  return { corpo, js };
}

function detalhe(lang, c) {
  const t = T[lang];
  const app = `/${DEMOS}/${c.slug}/app.html`;
  return `  <section class="section">
    <div class="wrap">
      <a class="mock-voltar" href="${t.base}${DEMOS}/">${t.voltar}</a>
      <p class="eyebrow mock-kicker">${esc(c.segmento[lang])} · ${esc(c.empresa)} ${t.ficticia}</p>
      <h1>${esc(c.titulo[lang])}</h1>
      ${aviso(t)}
      <p class="case-card__status">${selo(t)}</p>
      <p class="taglist sem-margem">${tags(c)}</p>
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
        <a class="btn btn--primary" href="${t.base}${DEMOS}/${c.slug}/tela-cheia/">${t.cheia}</a>
      </div>
      <p class="mock-so-mobile sem-margem">${t.mobile}</p>
      <iframe class="mock-moldura mock-so-desktop" src="${app}" title="${t.moldura} ${esc(c.empresa)}" loading="lazy" allow="fullscreen" sandbox="${SANDBOX}"></iframe>
    </div>
  </section>`;
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

function player(lang, c) {
  const t = T[lang];
  const p = t.player;
  const app = `/${DEMOS}/${c.slug}/app.html`;
  const voltar = `${t.base}${DEMOS}/${c.slug}/`;
  const titulo = `${c.empresa} · ${t.moldura.replace(/ de$| of$/, '')}`;
  return `<!DOCTYPE html>
<!-- ARQUIVO GERADO por scripts/mockups.mjs. Não edite. -->
<html lang="${t.lang}" data-theme="dark">
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
for (const lang of ['pt', 'en']) {
  const t = T[lang];
  const gerado = ler(lang === 'pt' ? 'index.html' : 'en/index.html');
  const p = pedacos(gerado);
  const pre = lang === 'pt' ? '' : 'en/';
  const g = galeria(lang);
  const urlG = `${t.base}${DEMOS}/`;
  const urlGOutro = `${T[lang === 'pt' ? 'en' : 'pt'].base}${DEMOS}/`;
  saidas.set(
    `${pre}${DEMOS}/index.html`,
    pagina(lang, p, {
      titulo: t.titulo,
      descricao: t.intro,
      canonico: urlG,
      alternativo: urlGOutro,
      corpo: g.corpo,
      scriptExtra: g.js
    })
  );
  for (const c of dados) {
    saidas.set(`${pre}${DEMOS}/${c.slug}/tela-cheia/index.html`, player(lang, c));
    const u = `${t.base}${DEMOS}/${c.slug}/`;
    const uo = `${T[lang === 'pt' ? 'en' : 'pt'].base}${DEMOS}/${c.slug}/`;
    saidas.set(
      `${pre}${DEMOS}/${c.slug}/index.html`,
      pagina(lang, p, {
        titulo: c.titulo[lang],
        descricao: t.desc(c.solucao[lang]),
        canonico: u,
        alternativo: uo,
        corpo: detalhe(lang, c)
      })
    );
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
for (const c of dados) {
  if (!existsSync(join(RAIZ, `${DEMOS}/${c.slug}/app.html`))) {
    console.error(`Falta ${DEMOS}/${c.slug}/app.html`);
    defasados++;
  }
}
if (MODO_CHECK && defasados) process.exit(1);
console.log(`${saidas.size} páginas ${MODO_CHECK ? 'conferidas' : 'geradas'}.`);
