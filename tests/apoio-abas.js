import { expect } from '@playwright/test';

/**
 * Com JavaScript a seção Cases mostra uma aba por vez (src/js/principal.js,
 * "abas dos cases"). Teste que rola até algo, mede tamanho ou confere
 * visibilidade de um elemento de outra aba precisa abri-la antes; o que só lê
 * o DOM (atributo, texto, contagem) não precisa.
 *
 * Não é spec: o Playwright só recolhe *.spec.js e *.test.js.
 */

/** Abre a aba que contém o primeiro elemento de `seletor` (nada a fazer sem abas). */
export async function abrirAbaDe(page, seletor) {
  const painel = await page
    .locator(seletor)
    .first()
    .evaluate((el) => el.closest('[role="tabpanel"]')?.id ?? null);
  if (!painel) return;
  const aba = page.locator(`#cases [role="tab"][aria-controls="${painel}"]`);
  if ((await aba.getAttribute('aria-selected')) !== 'true') await aba.click();
  await expect(page.locator(`#${painel}`)).toBeVisible();
}

/** Roda `fn(idDoPainel)` com cada aba aberta, na ordem; sem abas, roda uma vez com null. */
export async function emCadaAba(page, fn) {
  const abas = page.locator('#cases [role="tab"]');
  const total = await abas.count();
  if (!total) return fn(null);
  for (let i = 0; i < total; i++) {
    await abas.nth(i).click();
    const painel = await abas.nth(i).getAttribute('aria-controls');
    await expect(page.locator(`#${painel}`)).toBeVisible();
    await fn(painel);
  }
}
