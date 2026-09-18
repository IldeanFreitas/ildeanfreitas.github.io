/* Gera favicon.ico, apple-touch-icon.png, as imagens de compartilhamento
 * (pt-BR e en) e o banner do README de perfil a partir da marca e dos tokens
 * do próprio site.
 *
 *   node scripts/gera-icones.mjs                 # favicon, apple-touch-icon e OG
 *   node scripts/gera-icones.mjs --banner <png>  # só o banner 1280×400 do perfil
 *
 * As páginas de composição são gravadas em arquivo e abertas por file://,
 * não injetadas com setContent(): a partir de about:blank o Chromium bloqueia
 * @font-face em file://, e o resultado saía em Segoe UI sem nenhum aviso. */
import { chromium } from 'playwright';
import { writeFile, readFile, mkdtemp, rm } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const soBanner = args.indexOf('--banner');
const browser = await chromium.launch();
const temp = await mkdtemp(join(tmpdir(), 'portfolio-og-'));

const MARCA = (tam) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#c4df00"/><g fill="#0b1200"><rect x="8" y="9" width="3.4" height="14" rx="1"/><rect x="15" y="9" width="3.4" height="14" rx="1"/><rect x="15" y="9" width="9" height="3.2" rx="1"/><rect x="15" y="14.6" width="7" height="3" rx="1"/></g></svg>`;

const fonte = (peso) =>
  pathToFileURL(join(RAIZ, `assets/fonts/mona-sans-latin-${peso}-normal.woff2`)).href;
const FONTES = `
@font-face{font-family:"Mona Sans";font-weight:400;src:url("${fonte(400)}") format("woff2")}
@font-face{font-family:"Mona Sans";font-weight:700;src:url("${fonte(700)}") format("woff2")}
@font-face{font-family:"Mona Sans";font-weight:800;src:url("${fonte(800)}") format("woff2")}`;

/** Abre uma composição gravada em arquivo e captura exatamente o quadro. */
async function capturar(html, largura, altura, destino) {
  const arquivo = join(temp, `${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  await writeFile(arquivo, html, 'utf8');
  const page = await browser.newPage({
    viewport: { width: largura, height: altura },
    deviceScaleFactor: 1
  });
  await page.goto(pathToFileURL(arquivo).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const mona = await page.evaluate(() => document.fonts.check('800 20px "Mona Sans"'));
  if (!mona) throw new Error(`Mona Sans não carregou ao gerar ${destino}`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: destino, clip: { x: 0, y: 0, width: largura, height: altura } });
  await page.close();
  const tamanho = (await readFile(destino)).length;
  console.log(`${destino}: ${Math.round(tamanho / 1024)} KB`);
}

const composicao = ({
  largura,
  altura,
  escala,
  eyebrow,
  linha1,
  linha2,
  destaque,
  sub,
  tags
}) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${FONTES}
html,body{margin:0;width:${largura}px;height:${altura}px;overflow:hidden}
body{font-family:"Mona Sans","Segoe UI",sans-serif;color:#fff;background:#000;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(60% 70% at 8% 20%,rgba(0,52,56,.9),transparent 62%),radial-gradient(50% 60% at 96% 10%,rgba(162,183,0,.32),transparent 60%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(80% 70% at 40% 30%,#000,transparent 78%)}
.wrap{position:absolute;inset:${Math.round(52 * escala)}px ${Math.round(64 * escala)}px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:${Math.round(14 * escala)}px;font-weight:800;font-size:${Math.round(30 * escala)}px}
.eyebrow{display:inline-flex;align-self:flex-start;margin-top:${Math.round(28 * escala)}px;padding:${Math.round(11 * escala)}px ${Math.round(22 * escala)}px;border:1px solid rgba(162,183,0,.35);border-radius:999px;background:rgba(162,183,0,.10);color:#c4df00;font-weight:700;font-size:${Math.round(21 * escala)}px}
h1{margin:${Math.round(20 * escala)}px 0 0;font-size:${Math.round(62 * escala)}px;line-height:1.04;letter-spacing:-.035em;font-weight:800}
h1 em{font-style:normal;color:#c4df00}
.sub{margin-top:${Math.round(20 * escala)}px;color:#c1c1c1;font-size:${Math.round(23 * escala)}px;line-height:1.4;max-width:62ch}
.foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.1);padding-top:${Math.round(20 * escala)}px;font-size:${Math.round(22 * escala)}px;font-weight:700}
.tags{display:flex;gap:${Math.round(12 * escala)}px}.tags span{padding:${Math.round(9 * escala)}px ${Math.round(20 * escala)}px;border:1px solid rgba(255,255,255,.14);border-radius:999px;font-weight:600;font-size:${Math.round(19 * escala)}px;color:#e6e6e6}
</style></head><body><div class="bg"></div><div class="grid"></div><div class="wrap">
<div class="brand">${MARCA(Math.round(56 * escala))}Ildean Freitas</div>
<div class="eyebrow">${eyebrow}</div>
<h1>${linha1}<br>${linha2} <em>${destaque}</em>.</h1>
<div class="sub">${sub}</div>
<div class="foot"><span>ildeanfreitas.github.io</span><div class="tags">${tags.map((t) => `<span>${t}</span>`).join('')}</div></div>
</div></body></html>`;

const TAGS = ['Power Apps', 'Power BI', 'dbt', 'Databricks'];
const PT = {
  eyebrow: 'Power Platform + Engenharia de Dados + IA aplicada',
  linha1: 'A ponte entre o processo',
  linha2: 'e o',
  destaque: 'dado confiável',
  sub: 'Analista de desenvolvimento de software sênior. Arquitetura, decisões técnicas e cases com status real.',
  tags: TAGS
};
const EN = {
  eyebrow: 'Power Platform + Data Engineering + Applied AI',
  linha1: 'The bridge between the process',
  linha2: 'and',
  destaque: 'trustworthy data',
  sub: 'Senior software development analyst. Architecture, technical decisions and cases with their real status.',
  tags: TAGS
};

if (soBanner >= 0) {
  const destino = args[soBanner + 1];
  if (!destino) throw new Error('uso: node scripts/gera-icones.mjs --banner <caminho/banner.png>');
  await capturar(
    composicao({ largura: 1280, altura: 400, escala: 0.72, ...PT }),
    1280,
    400,
    destino
  );
} else {
  /* Favicon e ícone de toque a partir da marca. */
  async function pngDaMarca(tam) {
    const page = await browser.newPage({
      viewport: { width: tam, height: tam },
      deviceScaleFactor: 1
    });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${MARCA(tam)}</body></html>`
    );
    const png = await page.screenshot({
      omitBackground: true,
      clip: { x: 0, y: 0, width: tam, height: tam }
    });
    await page.close();
    return png;
  }

  /* ICO com entradas PNG (aceito por todo navegador desde o Vista). Cabeçalho
   * de 6 bytes, uma entrada de 16 bytes por imagem, depois os PNGs. */
  function ico(imagens) {
    const cabecalho = Buffer.alloc(6);
    cabecalho.writeUInt16LE(0, 0);
    cabecalho.writeUInt16LE(1, 2);
    cabecalho.writeUInt16LE(imagens.length, 4);
    let deslocamento = 6 + 16 * imagens.length;
    const entradas = [];
    for (const { tam, png } of imagens) {
      const e = Buffer.alloc(16);
      e.writeUInt8(tam >= 256 ? 0 : tam, 0);
      e.writeUInt8(tam >= 256 ? 0 : tam, 1);
      e.writeUInt8(0, 2);
      e.writeUInt8(0, 3);
      e.writeUInt16LE(1, 4);
      e.writeUInt16LE(32, 6);
      e.writeUInt32LE(png.length, 8);
      e.writeUInt32LE(deslocamento, 12);
      deslocamento += png.length;
      entradas.push(e);
    }
    return Buffer.concat([cabecalho, ...entradas, ...imagens.map((i) => i.png)]);
  }

  const [p32, p48, p180] = await Promise.all([pngDaMarca(32), pngDaMarca(48), pngDaMarca(180)]);
  await writeFile(
    join(RAIZ, 'favicon.ico'),
    ico([
      { tam: 32, png: p32 },
      { tam: 48, png: p48 }
    ])
  );
  await writeFile(join(RAIZ, 'apple-touch-icon.png'), p180);
  console.log('favicon.ico (32+48) e apple-touch-icon.png (180) gerados');

  await capturar(
    composicao({ largura: 1200, altura: 630, escala: 1, ...PT }),
    1200,
    630,
    join(RAIZ, 'assets/img/og-image.png')
  );
  await capturar(
    composicao({ largura: 1200, altura: 630, escala: 1, ...EN }),
    1200,
    630,
    join(RAIZ, 'assets/img/og-image-en.png')
  );
}

await browser.close();
await rm(temp, { recursive: true, force: true });
