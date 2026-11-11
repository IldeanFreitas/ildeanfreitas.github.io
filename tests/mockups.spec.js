import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Galeria e páginas dos cases Power Apps (pt e en). */
const PAGINAS = [
  '/cases/power-apps/',
  '/cases/power-apps/obra/',
  '/en/cases/power-apps/',
  '/en/cases/power-apps/ouvidoria/'
];

for (const url of PAGINAS) {
  test(`${url} sem violações de acessibilidade e sem erros`, async ({ page }) => {
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
    await page.goto(url);
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important}' });
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
    expect(erros).toEqual([]);
  });
}

test('galeria lista os 12 apps e o filtro por segmento funciona', async ({ page }) => {
  await page.goto('/cases/power-apps/');
  await expect(page.locator('.mock-card')).toHaveCount(12);
  await page.click('.mock-filtros button[data-seg="Saúde"]');
  await expect(page.locator('.mock-card:not([hidden])')).toHaveCount(1);
});

test('toda página de app aponta para um app.html existente', async ({ page, request }) => {
  await page.goto('/cases/power-apps/');
  const links = await page.locator('.mock-card a').evaluateAll((as) => as.map((a) => a.href));
  expect(links).toHaveLength(12);
  for (const l of links) {
    const r = await request.get(l + 'app.html');
    expect(r.status(), l).toBe(200);
  }
});

test('player em tela cheia carrega o app e troca o formato', async ({ page }) => {
  await page.goto('/cases/power-apps/obra/tela-cheia/');
  await expect(page.frameLocator('#app').locator('body')).toBeVisible();
  await page.click('[data-modo="celular"]');
  await expect(page.locator('[data-modo="celular"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-modo="janela"]');
  const [caixa, palco] = await Promise.all([
    page.locator('#caixa').boundingBox(),
    page.locator('#palco').boundingBox()
  ]);
  expect(Math.round(caixa.width)).toBe(Math.round(palco.width));
});
