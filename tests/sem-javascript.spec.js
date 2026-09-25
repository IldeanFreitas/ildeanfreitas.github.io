import { test, expect } from '@playwright/test';
import cases from '../src/data/cases.json' with { type: 'json' };

/**
 * O teste mais importante da suíte.
 *
 * Até a etapa 1, `.reveal{opacity:0}` escondia 9 blocos e só os revelava
 * quando o IntersectionObserver adicionava `.is-visible`. Sem JavaScript, esse
 * conteúdo nunca aparecia — o visitante via um portfólio vazio, e nada no
 * servidor indicava problema.
 *
 * O defeito está corrigido: o conteúdo nasce visível e a animação é opcional.
 * Estes testes existem para que ele não volte. Se um deles falhar, a
 * degradação sem JavaScript quebrou de novo.
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

  test('os diagramas animados aparecem inteiros e parados', async ({ page }) => {
    await page.goto('/');
    const figuras = page.locator('.architecture-diagram.diagram-anima');
    expect(await figuras.count()).toBeGreaterThan(0);
    const problemas = await figuras.evaluateAll((fs) =>
      fs.flatMap((f) =>
        [f, ...f.querySelectorAll('.diagram-node, .diagram-step, .diagram-call, .diagram-band')]
          .filter((el) => {
            const s = getComputedStyle(el);
            return Number(s.opacity) < 1 || s.transform !== 'none' || s.animationName !== 'none';
          })
          .map((el) => el.className)
      )
    );
    expect(problemas, problemas.join('\n')).toEqual([]);
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

  test('todos os cases estão no HTML servido', async ({ page }) => {
    await page.goto('/');
    // A contagem vem do arquivo de dados, não de um número fixo: os cases são
    // gerados a partir dele, e travar "6" fazia o teste quebrar ao adicionar
    // um case — sinalizando defeito onde havia só conteúdo novo.
    //
    // O que este teste realmente protege é que o conteúdo venha do SERVIDOR.
    // Renderizar os cases no cliente passaria despercebido em qualquer outro
    // teste e destruiria o SEO.
    await expect(page.locator('.case-card')).toHaveCount(cases.length);
  });
});
