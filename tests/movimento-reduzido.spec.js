import { test, expect } from '@playwright/test';
import cases from '../src/data/cases.json' with { type: 'json' };

/**
 * Os diagramas animam a entrada (etapas acendendo, pulso nas conexões,
 * destaque marcado uma vez). Este arquivo prova as duas pontas do contrato:
 *
 * - com `prefers-reduced-motion: reduce`, nenhum diagrama anima e todos
 *   aparecem inteiros e parados;
 * - sem essa preferência, a animação existe de fato (senão o primeiro teste
 *   passaria por nada estar animado em lugar nenhum).
 *
 * Sem JavaScript: a figura animada (.diagram-anima) não tem opacidade nem
 * deslocamento próprios, e toda a animação exige .js-anima + .is-visible;
 * sem-javascript.spec.js confere que o cartão (.reveal) aparece inteiro.
 */

/** Rola até cada diagrama e devolve o que ainda está animando ou deslocado. */
async function percorrerDiagramas(page) {
  const figuras = page.locator('.case-card .architecture-diagram');
  const total = await figuras.count();
  const relatorio = [];
  for (let i = 0; i < total; i++) {
    const figura = figuras.nth(i);
    await figura.scrollIntoViewIfNeeded();
    await expect(figura).toBeVisible();
    relatorio.push(
      await figura.evaluate((f) => {
        // O CSS global de movimento reduzido encurta tudo para 0,001 ms; uma
        // transição assim neutralizada pode aparecer por um instante. O que
        // não pode existir é animação com duração perceptível.
        const animacoes = f
          .getAnimations({ subtree: true })
          .filter((a) => Number(a.effect.getComputedTiming().duration) > 1);
        const blocos = [
          ...f.querySelectorAll('.diagram-node, .diagram-step, .diagram-call, .diagram-band')
        ];
        const deslocados = blocos.filter((b) => {
          const s = getComputedStyle(b);
          return s.transform !== 'none' || Number(s.opacity) < 1;
        }).length;
        return {
          id: f.closest('.case-card').id,
          animacoes: animacoes.length,
          nomes: animacoes.slice(0, 3).map((a) => a.animationName || a.transitionProperty),
          deslocados,
          blocos: blocos.length,
          opacidade: Number(getComputedStyle(f).opacity)
        };
      })
    );
  }
  return relatorio;
}

test.describe('com movimento reduzido', () => {
  // reducedMotion não é opção de fixture do Playwright: passada direto em
  // test.use, seria ignorada em silêncio. Vai pelas opções do contexto.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('todo diagrama fica parado e completo', async ({ page }) => {
    await page.goto('/');
    const relatorio = await percorrerDiagramas(page);
    expect(relatorio).toHaveLength(cases.length);
    for (const r of relatorio) {
      expect(r.animacoes, `${r.id}: animação rodando (${r.nomes.join('; ')})`).toBe(0);
      expect(r.deslocados, `${r.id}: bloco deslocado ou translúcido`).toBe(0);
      expect(r.blocos, `${r.id}: diagrama sem blocos`).toBeGreaterThan(0);
      expect(r.opacidade, `${r.id}: figura translúcida`).toBe(1);
    }
  });

  test('o texto de cada diagrama está todo presente', async ({ page }) => {
    await page.goto('/');
    for (const c of cases) {
      const figura = page.locator(`#${c.id} .architecture-diagram`);
      await expect(figura.locator('figcaption')).toHaveText(c.diagrama.resumo);
      await expect(figura).toContainText(c.diagrama.titulo);
    }
  });
});

test.describe('sem preferência de movimento', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('todos os diagramas animam a entrada', async ({ page }) => {
    await page.goto('/');
    const animados = [];
    for (const c of cases) {
      const figura = page.locator(`#${c.id} .architecture-diagram`);
      await figura.scrollIntoViewIfNeeded();
      await expect(figura).toHaveClass(/is-visible/);
      const n = await figura.evaluate((f) => f.getAnimations({ subtree: true }).length);
      if (n > 0) animados.push(c.id);
    }
    expect(animados.sort()).toEqual(cases.map((c) => c.id).sort());
  });
});
