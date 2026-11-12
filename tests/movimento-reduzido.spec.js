import { test, expect } from '@playwright/test';
import cases from '../src/data/cases.json' with { type: 'json' };
import { abrirAbaDe } from './apoio-abas.js';
import { lerIdiomas } from '../scripts/idiomas.mjs';

/** O menu de idiomas existe em todas as páginas; cada uma entra nos testes dele. */
const IDIOMAS = lerIdiomas();

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

/**
 * Rola até cada diagrama e devolve o que ainda está animando ou deslocado.
 * Com JS a seção Cases mostra uma aba por vez: abre a do case antes.
 */
async function percorrerDiagramas(page) {
  const figuras = page.locator('.case-card .architecture-diagram');
  const total = await figuras.count();
  const relatorio = [];
  for (let i = 0; i < total; i++) {
    const figura = figuras.nth(i);
    await abrirAbaDe(page, `#${await figura.evaluate((f) => f.closest('.case-card').id)}`);
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

/**
 * Abre o menu de idiomas e devolve o que está animando nele. Abre pela
 * propriedade `open` e espera dois quadros dentro da própria página: abrir por
 * clique e consultar depois deixaria a animação de 160 ms terminar antes da
 * leitura, e o teste dependeria da velocidade da máquina.
 */
function abrirMenuDeIdiomas(page) {
  return page.evaluate(async () => {
    const menu = document.getElementById('idiomas');
    menu.open = true;
    await new Promise((fim) => requestAnimationFrame(() => requestAnimationFrame(fim)));
    const alvos = [
      menu.querySelector('summary'),
      menu.querySelector('.idiomas__lista'),
      ...menu.querySelectorAll('.idiomas__link')
    ];
    const segundos = (texto) => texto.split(',').map((valor) => parseFloat(valor) || 0);
    return {
      animacoes: menu.getAnimations({ subtree: true }).map((a) => ({
        nome: a.animationName || a.transitionProperty,
        duracao: Number(a.effect.getComputedTiming().duration)
      })),
      // Maior duração de transição e de animação declarada nos alvos, em ms.
      transicaoMaxima:
        Math.max(...alvos.flatMap((el) => segundos(getComputedStyle(el).transitionDuration))) *
        1000,
      animacaoDaLista: getComputedStyle(menu.querySelector('.idiomas__lista')).animationName
    };
  });
}

test.describe('com movimento reduzido', () => {
  // reducedMotion não é opção de fixture do Playwright: passada direto em
  // test.use, seria ignorada em silêncio. Vai pelas opções do contexto.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  for (const idioma of IDIOMAS) {
    test(`o menu de idiomas aberto não anima nem faz transição, ${idioma.lang}`, async ({
      page
    }) => {
      await page.goto(idioma.caminho);
      const menu = await abrirMenuDeIdiomas(page);
      // O CSS global de movimento reduzido encurta tudo para 0,001 ms; o que
      // não pode existir é movimento com duração perceptível.
      const perceptiveis = menu.animacoes.filter((a) => a.duracao > 1);
      expect(perceptiveis, `animação rodando: ${JSON.stringify(perceptiveis)}`).toEqual([]);
      expect(menu.animacaoDaLista, 'a lista ainda tem animação declarada').toBe('none');
      expect(menu.transicaoMaxima, 'transição com duração perceptível (ms)').toBeLessThanOrEqual(1);
      await expect(page.locator('#idiomas .idiomas__lista')).toBeVisible();
      await expect(page.locator('#idiomas .idiomas__lista')).toHaveCSS('opacity', '1');
    });
  }

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

  // A contraprova do teste de cima: sem a preferência, o painel anima ao abrir.
  // Sem isto, ele passaria por nada estar animado em lugar nenhum.
  test('o painel do menu de idiomas anima ao abrir', async ({ page }) => {
    await page.goto('/');
    const menu = await abrirMenuDeIdiomas(page);
    expect(menu.animacaoDaLista).toBe('idiomas-abre');
    expect(menu.animacoes.find((a) => a.nome === 'idiomas-abre')?.duracao).toBe(160);
  });

  test('todos os diagramas animam a entrada', async ({ page }) => {
    await page.goto('/');
    const animados = [];
    for (const c of cases) {
      await abrirAbaDe(page, `#${c.id}`);
      const figura = page.locator(`#${c.id} .architecture-diagram`);
      await figura.scrollIntoViewIfNeeded();
      await expect(figura).toHaveClass(/is-visible/);
      const n = await figura.evaluate((f) => f.getAnimations({ subtree: true }).length);
      if (n > 0) animados.push(c.id);
    }
    expect(animados.sort()).toEqual(cases.map((c) => c.id).sort());
  });
});
