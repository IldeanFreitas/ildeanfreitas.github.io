import { test, expect } from '@playwright/test';

/**
 * O teste mais importante da suíte.
 *
 * O site esconde 13 blocos com `.reveal{opacity:0}` e só os revela quando o
 * IntersectionObserver adiciona `.is-visible`. Sem JavaScript, esse conteúdo
 * nunca aparece — o visitante vê um portfólio vazio.
 *
 * Estes testes FALHAM no commit 813fbb5, de propósito: são a prova executável
 * do P0 e o portão que impede sua reintrodução depois da correção da etapa 1.
 */
test.use({ javaScriptEnabled: false });

test.describe('sem JavaScript', () => {
  test('o conteúdo revelável está visível', async ({ page }) => {
    await page.goto('/');

    const reveals = page.locator('.reveal');
    const total = await reveals.count();
    expect(total, 'a página deve ter blocos .reveal').toBeGreaterThan(0);

    // Cada bloco precisa estar realmente visível, não apenas presente no DOM:
    // opacity:0 mantém o elemento no layout e enganaria uma checagem de
    // existência.
    for (let i = 0; i < total; i++) {
      const bloco = reveals.nth(i);
      await expect(bloco).toBeVisible();
      const opacidade = await bloco.evaluate((el) => getComputedStyle(el).opacity);
      expect(Number(opacidade), `bloco .reveal[${i}] com opacity ${opacidade}`).toBeGreaterThan(
        0.9
      );
    }
  });

  test('as seções âncora continuam alcançáveis', async ({ page }) => {
    await page.goto('/');
    for (const id of [
      'inicio',
      'sobre',
      'servicos',
      'cases',
      'trajetoria',
      'formacao',
      'contato'
    ]) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
  });

  test('os seis cases estão no HTML servido', async ({ page }) => {
    await page.goto('/');
    // Sem JS o conteúdo tem de vir do servidor — é isso que o buscador indexa.
    await expect(page.locator('.case-card')).toHaveCount(6);
  });
});
