import { test, expect } from '@playwright/test';

/**
 * Referência visual.
 *
 * É o que torna a extração de CSS/JS da etapa 2 verificável: o critério de
 * aceite daquela etapa é diff visual vazio, e sem estas capturas o "vazio"
 * seria opinião.
 *
 * As capturas NÃO são versionadas — veja docs/QUALIDADE.md. Gere-as com
 * `npm run baseline` imediatamente antes de começar uma etapa que mexa em CSS
 * ou marcação, e rode `npm run test:visual` ao terminá-la.
 */

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

/**
 * Deixa a página determinística antes de capturar.
 *
 * Dois motivos de instabilidade, ambos reais neste site:
 *
 * 1. A captura de página inteira rola o documento, e a rolagem dispara o
 *    `loading="lazy"` das imagens dos diagramas. A imagem chegando entre
 *    os dois disparos de comparação impede a estabilização.
 * 2. Trocar `data-theme` depois da carga dispara as transições de 0.3s, e a
 *    captura pega o meio da transição.
 */
async function estabilizar(page, tema) {
  if (tema) {
    // Precisa vir antes da troca de tema, e não pode ser addInitScript: naquele
    // momento o documento ainda não existe, e o data-theme fixo no HTML
    // sobrescreveria o valor. O resultado seriam capturas dark e light
    // byte a byte idênticas.
    await page.addStyleTag({
      content: '*,*::before,*::after{transition:none!important;animation:none!important}'
    });
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), tema);
  }

  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      img.loading = 'eager';
    });
    await Promise.all(
      [...document.images].filter((i) => !i.complete).map((i) => i.decode().catch(() => {}))
    );
    await document.fonts.ready;
  });
}

for (const tema of ['dark', 'light']) {
  test(`página inteira — tema ${tema}`, async ({ page }) => {
    await page.goto('/');
    await estabilizar(page, tema);

    // Guarda contra o defeito que já aconteceu aqui: se a troca de tema não
    // pegar, as duas capturas ficam idênticas e a suíte passa sem comparar
    // nada.
    const fundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(fundo, `tema ${tema} não foi aplicado`).toBe(
      tema === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(244, 246, 243)'
    );

    await expect(page).toHaveScreenshot(`pagina-${tema}.png`, {
      fullPage: true,
      animations: 'disabled',
      // Os diagramas agora ocupam a largura integral da página. A captura
      // completa percorre um documento intencionalmente mais alto; este prazo
      // preserva a comparação pixel a pixel sem falso timeout.
      timeout: 15_000
    });
  });
}

test('página em inglês', async ({ page }) => {
  await page.goto('/en/');
  await estabilizar(page, 'dark');
  await expect(page).toHaveScreenshot('pagina-en.png', {
    fullPage: true,
    animations: 'disabled',
    timeout: 15_000
  });
});

test('seção de cases', async ({ page }) => {
  await page.goto('/#cases');
  await estabilizar(page);
  // A seção de cases é quase tão alta quanto a página inteira no desktop; o
  // prazo padrão (5 s) estourava ao gerar a baseline.
  await expect(page.locator('#cases')).toHaveScreenshot('secao-cases.png', {
    animations: 'disabled',
    timeout: 15_000
  });
});

test('404', async ({ page }) => {
  await page.goto('/404.html');
  await estabilizar(page);
  await expect(page).toHaveScreenshot('pagina-404.png', {
    fullPage: true,
    animations: 'disabled'
  });
});
