#!/usr/bin/env node
/**
 * Gera a galeria "Cases Power Apps" e uma página por app (pt e en).
 * Depende de index.html e en/index.html já gerados (reaproveita CSS, cabeçalho,
 * rodapé e scripts), então roda DEPOIS de scripts/build.mjs.
 *
 * Saída: cases/power-apps/index.html, cases/power-apps/<slug>/index.html e
 * en/cases/power-apps/... Os apps (app.html) ficam versionados ao lado.
 * `--check` só confere se os arquivos gerados estão em dia.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8');
const MODO_CHECK = process.argv.includes('--check');
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
    outro: '/en/cases/power-apps/',
    lang: 'pt-BR',
    titulo: 'Cases Power Apps',
    intro:
      'Doze apps de demonstração, navegáveis, para problemas comuns de empresas. Todos com dados fictícios e desenhados para serem construídos na Power Platform.',
    filtroTodos: 'Todos',
    filtroRot: 'Filtrar por segmento',
    selo: 'Arquitetura documentada',
    ver: 'Ver o case',
    voltar: '← Todos os cases Power Apps',
    dor: 'O problema',
    solucao: 'A solução',
    roteiro: 'Teste em 3 passos',
    aviso: 'Dados 100% fictícios. Demonstração do que seria construído na Power Platform.',
    cheia: 'Abrir em tela cheia',
    player: {
      voltar: '← Voltar ao case',
      janela: 'Ajustar à janela',
      tablet: 'Tablet 16:9',
      celular: 'Celular',
      modos: 'Formato de exibição',
      tela: 'Tela inteira',
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
    outro: '/cases/power-apps/',
    lang: 'en',
    titulo: 'Power Apps cases',
    intro:
      'Twelve clickable demo apps for common business problems. All data is fictitious and each app is designed to be built on the Power Platform.',
    filtroTodos: 'All',
    filtroRot: 'Filter by segment',
    selo: 'Documented architecture',
    ver: 'See the case',
    voltar: '← All Power Apps cases',
    dor: 'The problem',
    solucao: 'The solution',
    roteiro: 'Try it in 3 steps',
    aviso: '100% fictitious data. A demonstration of what would be built on the Power Platform.',
    cheia: 'Open full screen',
    player: {
      voltar: '← Back to the case',
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

function ajustarNav(trecho, lang, urlOutroIdioma) {
  const t = T[lang];
  return trecho
    .replace(/href="#inicio"/g, `href="${t.home}"`)
    .replace(/href="#([a-z]+)"/g, `href="${t.home}#$1"`)
    .replace(
      /(<a class="icon-btn icon-btn--text lang-toggle" href=")[^"]*"/,
      `$1${urlOutroIdioma}"`
    )
    .replace(/(<li><a href=")\/en\/(" hreflang="en")/, `$1${urlOutroIdioma}$2`);
}

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
${ajustarNav(p.header, lang, alternativo)}

<main id="conteudo">
${corpo}
</main>

${ajustarNav(p.footer, lang, alternativo)}

<script>
${p.principal}
</script>${scriptExtra ?? ''}
</body>
</html>
`;
}

function cartao(lang, c) {
  const t = T[lang];
  const href = `${t.base}cases/power-apps/${c.slug}/`;
  return `        <article class="card mock-card" data-segmento="${esc(c.segmento[lang])}">
          <p class="mock-card__seg sem-margem">${esc(c.segmento[lang])} · ${esc(c.empresa)}</p>
          <h2>${esc(c.titulo[lang])}</h2>
          <p class="sem-margem">${esc(c.solucao[lang])}</p>
          <p class="taglist sem-margem">${c.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}<span class="tag">${esc(t.selo)}</span></p>
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
      <p class="mock-aviso">${t.aviso}</p>
      <div class="mock-filtros" role="group" aria-label="${t.filtroRot}">
        <button type="button" aria-pressed="true" data-seg="">${t.filtroTodos}</button>
${segs.map((s) => `        <button type="button" aria-pressed="false" data-seg="${esc(s)}">${esc(s)}</button>`).join('\n')}
      </div>
      <div class="grid grid--3">
${dados.map((c) => cartao(lang, c)).join('\n')}
      </div>
    </div>
  </section>`;
  const js = `
<script>
(function () {
  var bs = document.querySelectorAll('.mock-filtros button');
  var cs = document.querySelectorAll('.mock-card');
  bs.forEach(function (b) {
    b.addEventListener('click', function () {
      bs.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      cs.forEach(function (c) { c.hidden = !!b.dataset.seg && c.dataset.segmento !== b.dataset.seg; });
    });
  });
})();
</script>`;
  return { corpo, js };
}

function detalhe(lang, c) {
  const t = T[lang];
  const app = `${t.base === '/' ? '/' : '/'}cases/power-apps/${c.slug}/app.html`;
  return `  <section class="section">
    <div class="wrap">
      <a class="mock-voltar" href="${t.base}cases/power-apps/">${t.voltar}</a>
      <p class="eyebrow">${esc(c.segmento[lang])} · ${esc(c.empresa)}</p>
      <h1>${esc(c.titulo[lang])}</h1>
      <p class="taglist sem-margem">${c.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}<span class="tag">${esc(t.selo)}</span></p>
      <h2>${t.dor}</h2>
      <p class="lead">${esc(c.dor[lang])}</p>
      <h2>${t.solucao}</h2>
      <p class="lead">${esc(c.solucao[lang])}</p>
      <h2>${t.roteiro}</h2>
      <ol class="mock-passos">
${c.passos[lang].map((s) => `        <li>${esc(s)}</li>`).join('\n')}
      </ol>
      <p class="mock-aviso">${t.aviso}</p>
      <div class="mock-acoes">
        <a class="btn btn--primary" href="${t.base}cases/power-apps/${c.slug}/tela-cheia/">${t.cheia}</a>
      </div>
      <p class="mock-so-mobile sem-margem">${t.mobile}</p>
      <iframe class="mock-moldura mock-so-desktop" src="${app}" title="${t.moldura} ${esc(c.empresa)}" loading="lazy" allow="fullscreen" sandbox="allow-scripts allow-modals allow-same-origin"></iframe>
    </div>
  </section>`;
}

function player(lang, c) {
  const t = T[lang];
  const p = t.player;
  const app = `/cases/power-apps/${c.slug}/app.html`;
  const voltar = `${t.base}cases/power-apps/${c.slug}/`;
  const titulo = `${c.empresa} · ${t.moldura.replace(/ de$| of$/, '')}`;
  return `<!DOCTYPE html>
<!-- ARQUIVO GERADO por scripts/mockups.mjs. Não edite. -->
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(c.empresa)} | ${esc(t.titulo)}</title>
<style>
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{display:flex;flex-direction:column;background:#1b1b1f;color:#f2f2f2;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
.barra{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1rem;padding:.5rem .9rem;background:#0f0f12;border-bottom:1px solid #333}
.barra a,.barra button{color:#f2f2f2;font:inherit}
.voltar{text-decoration:none;font-weight:600;padding:.4rem .7rem;border:1px solid #555;border-radius:6px}
.nome{font-weight:700;margin-right:auto}
.modos{display:flex;gap:.25rem;border:0;padding:0;margin:0}
.modos legend{position:absolute;left:-9999px}
.modos button,.tela{background:#26262c;border:1px solid #555;border-radius:6px;padding:.4rem .7rem;cursor:pointer;min-height:40px}
.modos button[aria-pressed="true"]{background:#c4df00;color:#0b1200;border-color:#c4df00;font-weight:700}
.dica{margin:0;padding:.3rem .9rem;color:#b8b8c0;font-size:.8rem;background:#16161a}
.palco{flex:1;min-height:0;display:grid;place-items:center;overflow:hidden;position:relative}
.caixa{position:relative;background:#fff;overflow:hidden;box-shadow:0 0 0 1px #444}
iframe{border:0;display:block;background:#fff;transform-origin:0 0}
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
<div class="palco" id="palco"><div class="caixa" id="caixa"><iframe id="app" src="${app}" title="${t.moldura} ${esc(c.empresa)}" allow="fullscreen" sandbox="allow-scripts allow-modals allow-same-origin"></iframe></div></div>
<script>
(function () {
  var DICAS = ${JSON.stringify(p.dica)};
  var TAM = { tablet: [1366, 768], celular: [390, 844] };
  var palco = document.getElementById('palco');
  var caixa = document.getElementById('caixa');
  var app = document.getElementById('app');
  var botoes = document.querySelectorAll('[data-modo]');
  var modo = window.innerWidth < 700 ? 'janela' : 'tablet';
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
  window.addEventListener('resize', ajustar);
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
  const urlG = `${t.base}cases/power-apps/`;
  const urlGOutro = T[lang === 'pt' ? 'en' : 'pt'].base + 'cases/power-apps/';
  saidas.set(
    `${pre}cases/power-apps/index.html`,
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
    saidas.set(`${pre}cases/power-apps/${c.slug}/tela-cheia/index.html`, player(lang, c));
    const u = `${t.base}cases/power-apps/${c.slug}/`;
    const uo = `${T[lang === 'pt' ? 'en' : 'pt'].base}cases/power-apps/${c.slug}/`;
    saidas.set(
      `${pre}cases/power-apps/${c.slug}/index.html`,
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
  if (!existsSync(join(RAIZ, `cases/power-apps/${c.slug}/app.html`))) {
    console.error(`Falta cases/power-apps/${c.slug}/app.html`);
    defasados++;
  }
}
if (MODO_CHECK && defasados) process.exit(1);
console.log(`${saidas.size} páginas ${MODO_CHECK ? 'conferidas' : 'geradas'}.`);
