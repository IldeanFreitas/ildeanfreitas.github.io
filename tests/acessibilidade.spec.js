import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Portão de acessibilidade. Roda nos dois temas: o tema claro recalcula o
 * acento para #4a5600 justamente por causa de contraste, e uma regressão ali
 * não apareceria na varredura do tema escuro.
 */
const PADROES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const tema of ['dark', 'light']) {
  test(`index sem violações de acessibilidade — tema ${tema}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), tema);

    const { violations } = await new AxeBuilder({ page }).withTags(PADROES).analyze();

    // Mensagem legível no log em vez de um objeto cru enorme.
    const resumo = violations.map((v) => `${v.id} (${v.nodes.length}x): ${v.help}`);
    expect(resumo, resumo.join('\n')).toEqual([]);
  });
}

test('versão em inglês sem violações de acessibilidade', async ({ page }) => {
  await page.goto('/en/');
  const { violations } = await new AxeBuilder({ page }).withTags(PADROES).analyze();
  const resumo = violations.map((v) => `${v.id} (${v.nodes.length}x): ${v.help}`);
  expect(resumo, resumo.join('\n')).toEqual([]);
});

/**
 * Contraste medido à mão, e não é redundância com o axe.
 *
 * O axe não consegue calcular contraste quando o fundo é gradiente: ele move
 * esses nós para `incomplete`, que não é `violations`. Neste site, que usa
 * gradiente em quase toda superfície, isso eram **374 nós** — a maior parte do
 * texto da página — passando sem nunca terem sido verificados.
 *
 * Foi assim que `.diagram-stage__title` foi para produção com contraste 1.02
 * no tema claro: fundo escuro literal com texto vindo de token de tema, ou
 * seja, quase-preto sobre quase-preto, nos oito diagramas.
 *
 * Este teste resolve o fundo subindo a árvore até achar uma cor opaca — o que
 * o axe se recusa a fazer por não ser garantido. Aqui é aceitável porque
 * conhecemos o site: nenhum texto fica sobre imagem.
 */
const AMOSTRA = [
  '.diagram-zone__title',
  '.diagram-stage__type',
  '.diagram-stage__title',
  '.diagram-stage__meta',
  '.diagram-layer b',
  '.diagram-layer span',
  '.diagram-foundation span',
  '.case-card__content p',
  '.case-facts li',
  '.case-facts h4',
  '.status-natureza',
  '.scope',
  '.tag',
  '.hero__desc',
  '.panel li',
  '.status'
];

for (const tema of ['dark', 'light']) {
  test(`contraste sobre gradiente — tema ${tema}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), tema);
    // O observer só revela o que entra na viewport; sem isto, metade da página
    // fica com opacity:0 e não seria medida.
    await page.evaluate(() =>
      document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-visible'))
    );

    const reprovados = await page.evaluate((seletores) => {
      const lum = (cor) => {
        const [r, g, b] = cor
          .match(/\d+/g)
          .map(Number)
          .map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const razao = (frente, fundo) => {
        const a = lum(frente);
        const b = lum(fundo);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      /**
       * Compõe as camadas de fundo subindo a árvore.
       *
       * Duas armadilhas, ambas encontradas na prática:
       *
       * 1. Parar na primeira cor não-transparente erra: o site empilha
       *    superfícies de 5% a 12% de alfa — `.diagram-foundation` usa
       *    `rgba(198,223,0,.055)`. O que se enxerga é a composição.
       * 2. Ignorar `background-image` erra ainda mais: gradiente não aparece
       *    em `background-color`, e é justamente aí que o axe desiste. Como as
       *    superfícies deste site são gradientes de duas paradas, a média
       *    delas é uma aproximação boa o bastante para servir de portão.
       */
      const camadaDe = (estilo) => {
        const grad = estilo.backgroundImage;
        const paradas = grad && grad !== 'none' ? grad.match(/rgba?\([^)]+\)/g) : null;
        const cor = estilo.backgroundColor;

        if (paradas && paradas.length) {
          const vals = paradas.map((p) => p.match(/[\d.]+/g).map(Number));
          const med = (i) => vals.reduce((s, v) => s + v[i], 0) / vals.length;
          const a = vals.reduce((s, v) => s + (v.length > 3 ? v[3] : 1), 0) / vals.length;
          return { r: med(0), g: med(1), b: med(2), a };
        }
        const m = cor && cor.match(/[\d.]+/g);
        if (!m) return null;
        const a = m.length > 3 ? parseFloat(m[3]) : 1;
        return a > 0 ? { r: +m[0], g: +m[1], b: +m[2], a } : null;
      };

      const fundoOpaco = (el) => {
        const camadas = [];
        let n = el;
        while (n && n !== document.documentElement) {
          const c = camadaDe(getComputedStyle(n));
          if (c) {
            camadas.push(c);
            if (c.a >= 0.999) break;
          }
          n = n.parentElement;
        }
        const raiz = camadaDe(getComputedStyle(document.body)) ||
          camadaDe(getComputedStyle(document.documentElement)) || { r: 255, g: 255, b: 255, a: 1 };
        let base = [raiz.r, raiz.g, raiz.b];
        // De baixo para cima: cada camada compõe sobre o resultado anterior.
        for (const c of camadas.reverse()) {
          base = [0, 1, 2].map((i) => Math.round(c.a * [c.r, c.g, c.b][i] + (1 - c.a) * base[i]));
        }
        return `rgb(${base.join(', ')})`;
      };

      const falhas = [];
      for (const sel of seletores) {
        for (const el of document.querySelectorAll(sel)) {
          const s = getComputedStyle(el);
          if (!el.textContent.trim()) continue;
          const tamanho = parseFloat(s.fontSize);
          const grande = tamanho >= 24 || (tamanho >= 18.66 && Number(s.fontWeight) >= 700);
          const minimo = grande ? 3 : 4.5;
          const r = razao(s.color, fundoOpaco(el));
          if (r < minimo) falhas.push(`${sel} — ${r.toFixed(2)} (mínimo ${minimo})`);
        }
      }
      return [...new Set(falhas)];
    }, AMOSTRA);

    expect(reprovados, reprovados.join('\n')).toEqual([]);
  });
}

test('nenhum texto abaixo de 11px em nenhuma largura', async ({ page }) => {
  // A avaliação de 2026-09-17 achou 155 dos 406 textos da página com menos
  // de 10px — quase todos nos diagramas. Piso de 11.2px (0.7rem) em qualquer
  // largura para rótulos; em telas estreitas os diagramas empilham e o texto
  // corrido deles sobe para 12.8px (ver o bloco de 560px em diagrama.css).
  await page.goto('/');
  await page.evaluate(() =>
    document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-visible'))
  );
  const piso = 11.1;
  const pequenos = await page.evaluate((min) => {
    const folhas = [...document.querySelectorAll('main *')].filter(
      (e) => !e.children.length && e.textContent.trim() && e.getBoundingClientRect().width > 0
    );
    return [
      ...new Set(
        folhas
          .map((e) => ({ tam: parseFloat(getComputedStyle(e).fontSize), e }))
          .filter((x) => x.tam < min)
          .map(
            (x) =>
              `${x.tam.toFixed(1)}px ${x.e.tagName}.${String(x.e.className).split(' ')[0]} "${x.e.textContent.trim().slice(0, 30)}"`
          )
      )
    ].slice(0, 15);
  }, piso);
  expect(pequenos, pequenos.join('\n')).toEqual([]);
});

test('404 sem violações de acessibilidade', async ({ page }) => {
  await page.goto('/404.html');
  const { violations } = await new AxeBuilder({ page }).withTags(PADROES).analyze();
  const resumo = violations.map((v) => `${v.id} (${v.nodes.length}x): ${v.help}`);
  expect(resumo, resumo.join('\n')).toEqual([]);
});

test('a hierarquia de títulos começa em h1 único', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
});

test('toda imagem tem texto alternativo', async ({ page }) => {
  await page.goto('/');
  const semAlt = await page.locator('img:not([alt])').count();
  expect(semAlt).toBe(0);
});

test('a lista de definições do hero está na ordem da gramática', async ({ page }) => {
  // <dt> antes de <dd>: o leitor de tela anuncia o rótulo e depois o valor.
  // A ordem visual (número em cima) é responsabilidade do CSS.
  await page.goto('/');
  const ordem = await page
    .locator('.stats > div')
    .evaluateAll((divs) => divs.map((d) => [...d.children].map((c) => c.tagName).join('>')));
  expect(ordem.every((o) => o === 'DT>DD')).toBe(true);
});
