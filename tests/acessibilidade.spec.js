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
