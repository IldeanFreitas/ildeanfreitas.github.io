/* Gera favicon.ico, apple-touch-icon.png e as imagens de compartilhamento
 * (pt-BR e en) a partir da marca e dos tokens do próprio site. */
import { chromium } from 'playwright';
import { writeFile, readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const browser = await chromium.launch();

const MARCA = (tam) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#c4df00"/><g fill="#0b1200"><rect x="8" y="9" width="3.4" height="14" rx="1"/><rect x="15" y="9" width="3.4" height="14" rx="1"/><rect x="15" y="9" width="9" height="3.2" rx="1"/><rect x="15" y="14.6" width="7" height="3" rx="1"/></g></svg>`;

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

/* ICO com entradas PNG (aceito por todo navegador desde o Vista). Cabeçalho de
 * 6 bytes, uma entrada de 16 bytes por imagem, depois os PNGs em sequência. */
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

/* Imagem de compartilhamento: mesma composição da anterior, com o eyebrow
 * alinhado ao posicionamento atual do site. */
const fonte400 = join(RAIZ, 'assets/fonts/mona-sans-latin-400-normal.woff2').replace(/\\/g, '/');
const fonte800 = join(RAIZ, 'assets/fonts/mona-sans-latin-800-normal.woff2').replace(/\\/g, '/');
const fonte700 = join(RAIZ, 'assets/fonts/mona-sans-latin-700-normal.woff2').replace(/\\/g, '/');

const og = ({
  eyebrow,
  titulo,
  destaque,
  sub1,
  sub2,
  tags
}) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Mona Sans";font-weight:400;src:url("file:///${fonte400}") format("woff2")}
@font-face{font-family:"Mona Sans";font-weight:700;src:url("file:///${fonte700}") format("woff2")}
@font-face{font-family:"Mona Sans";font-weight:800;src:url("file:///${fonte800}") format("woff2")}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{font-family:"Mona Sans","Segoe UI",sans-serif;color:#fff;background:#000;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(60% 70% at 8% 20%,rgba(0,52,56,.9),transparent 62%),radial-gradient(50% 60% at 96% 10%,rgba(162,183,0,.32),transparent 60%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(80% 70% at 40% 30%,#000,transparent 78%)}
.wrap{position:absolute;inset:64px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:16px;font-weight:800;font-size:32px}
.eyebrow{display:inline-flex;align-self:flex-start;margin-top:40px;padding:12px 24px;border:1px solid rgba(162,183,0,.35);border-radius:999px;background:rgba(162,183,0,.10);color:#c4df00;font-weight:700;font-size:22px}
h1{margin:24px 0 0;font-size:66px;line-height:1.02;letter-spacing:-.035em;font-weight:800;max-width:15ch}
h1 em{font-style:normal;color:#c4df00}
.sub{margin-top:26px;color:#c1c1c1;font-size:24px;line-height:1.4}
.foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.1);padding-top:22px;font-size:22px;font-weight:700}
.tags{display:flex;gap:12px}.tags span{padding:10px 20px;border:1px solid rgba(255,255,255,.14);border-radius:999px;font-weight:600;font-size:20px;color:#e6e6e6}
</style></head><body><div class="bg"></div><div class="grid"></div><div class="wrap">
<div class="brand">${MARCA(56)}Ildean Freitas</div>
<div class="eyebrow">${eyebrow}</div>
<h1>${titulo} <em>${destaque}</em>.</h1>
<div class="sub">${sub1}<br>${sub2}</div>
<div class="foot"><span>ildeanfreitas.github.io</span><div class="tags">${tags.map((t) => `<span>${t}</span>`).join('')}</div></div>
</div></body></html>`;

const versoes = [
  {
    arquivo: 'assets/img/og-image.png',
    html: og({
      eyebrow: 'Power Platform + Engenharia de Dados + IA aplicada',
      titulo: 'A ponte entre o processo e o',
      destaque: 'dado confiável',
      sub1: 'Analista de desenvolvimento de software sênior.',
      sub2: 'Arquitetura, decisões técnicas e cases com status real.',
      tags: ['Power Apps', 'Power BI', 'dbt', 'Databricks']
    })
  },
  {
    arquivo: 'assets/img/og-image-en.png',
    html: og({
      eyebrow: 'Power Platform + Data Engineering + Applied AI',
      titulo: 'The bridge between the process and',
      destaque: 'trustworthy data',
      sub1: 'Senior software development analyst.',
      sub2: 'Architecture, technical decisions and cases with their real status.',
      tags: ['Power Apps', 'Power BI', 'dbt', 'Databricks']
    })
  }
];

for (const v of versoes) {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1
  });
  await page.setContent(v.html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: join(RAIZ, v.arquivo),
    clip: { x: 0, y: 0, width: 1200, height: 630 }
  });
  await page.close();
  const tamanho = (await readFile(join(RAIZ, v.arquivo))).length;
  console.log(`${v.arquivo}: ${Math.round(tamanho / 1024)} KB`);
}

await browser.close();
