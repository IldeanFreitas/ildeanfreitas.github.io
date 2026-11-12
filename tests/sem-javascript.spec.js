import { test, expect } from '@playwright/test';
import cases from '../src/data/cases.json' with { type: 'json' };
import appsDados from '../src/data/mockups-power-apps.json' with { type: 'json' };
import paineisDados from '../src/data/mockups-power-bi.json' with { type: 'json' };
import { lerIdiomas } from '../scripts/idiomas.mjs';

/** Todos os idiomas de src/idiomas.json passam pelas mesmas verificações. */
const IDIOMAS = lerIdiomas();

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

for (const idioma of IDIOMAS) {
  test.describe(`sem JavaScript, ${idioma.lang}`, () => {
    test('o conteúdo revelável está visível', async ({ page }) => {
      await page.goto(idioma.caminho);

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
      await page.goto(idioma.caminho);
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
      await page.goto(idioma.caminho);
      for (const id of [
        'inicio',
        'sobre',
        'servicos',
        'cases',
        'cases-power-platform',
        'cases-power-bi',
        'cases-engenharia-dados',
        'cases-ia',
        'trajetoria',
        'formacao',
        'contato'
      ]) {
        await expect(page.locator(`#${id}`)).toBeAttached();
      }
    });

    test('a seção Cases fica empilhada, sem abas nem filtros, com tudo listado', async ({
      page
    }) => {
      // Abas, busca e filtros vêm de <template> que só o JS clona; sem JS nada
      // disso existe na página e nenhum painel nasce escondido.
      await page.goto(idioma.caminho);
      await expect(page.locator('[role="tablist"], [role="tab"], [role="tabpanel"]')).toHaveCount(
        0
      );
      await expect(page.locator('.cases-filtros, input[type="search"], .mock-filtros')).toHaveCount(
        0
      );
      await expect(page.locator('#cases [hidden]')).toHaveCount(0);
      for (const id of ['power-platform', 'power-bi', 'engenharia-dados', 'ia']) {
        await expect(page.locator(`#cases-${id}`)).toBeVisible();
        await expect(page.locator(`#cases-${id} > h3`)).toBeVisible();
      }
      const apps = page.locator('#cases-power-platform .mock-card');
      await expect(apps).toHaveCount(appsDados.length);
      for (const card of await apps.all()) await expect(card).toBeVisible();
      for (const card of await page.locator('.case-card').all()) await expect(card).toBeVisible();
      await expect(page.locator('#cases-power-platform .mock-aviso')).toBeVisible();
      await expect(page.locator('#cases-power-platform .cases-bloco__titulo')).toHaveCount(2);
      // Os painéis de Power BI, do mesmo jeito: todos listados, com o aviso, o
      // título do bloco e o botão de cada um.
      const paineis = page.locator('#cases-power-bi .mock-card');
      await expect(paineis).toHaveCount(paineisDados.length);
      for (const card of await paineis.all()) {
        await expect(card).toBeVisible();
        await expect(card.locator('a.btn')).toBeVisible();
        await expect(card.locator('.tag').first()).toBeVisible();
      }
      await expect(page.locator('#cases-power-bi .mock-aviso')).toBeVisible();
      await expect(page.locator('#cases-power-bi .cases-bloco__titulo')).toHaveCount(1);
      await expect(page.locator('#cases-power-bi .cases-bloco__titulo')).toBeVisible();
    });

    test('todos os cases estão no HTML servido', async ({ page }) => {
      await page.goto(idioma.caminho);
      // A contagem vem do arquivo de dados, não de um número fixo: os cases são
      // gerados a partir dele, e travar "6" fazia o teste quebrar ao adicionar
      // um case — sinalizando defeito onde havia só conteúdo novo.
      //
      // O que este teste realmente protege é que o conteúdo venha do SERVIDOR.
      // Renderizar os cases no cliente passaria despercebido em qualquer outro
      // teste e destruiria o SEO.
      await expect(page.locator('.case-card')).toHaveCount(cases.length);
    });

    test('o menu de idiomas abre e os links são alcançáveis', async ({ page }) => {
      // <details> nativo: abrir e fechar não dependem do script. Esc e clique
      // fora são enfeite do JavaScript; aqui o que importa é chegar aos links.
      await page.goto(idioma.caminho);
      const menu = page.locator('#idiomas');
      const links = menu.locator('.idiomas__link');
      await expect(links.first()).toBeHidden();

      await menu.locator('summary').click();
      await expect(menu).toHaveAttribute('open');
      await expect(links).toHaveCount(IDIOMAS.length);
      for (const [i, outro] of IDIOMAS.entries()) {
        await expect(links.nth(i)).toBeVisible();
        await expect(links.nth(i)).toHaveAttribute('href', outro.caminho);
      }
      await menu.locator('summary').click();
      await expect(menu).not.toHaveAttribute('open');

      // Pelo teclado: Enter no botão abre e o Tab chega ao primeiro idioma.
      await menu.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(menu).toHaveAttribute('open');
      await page.keyboard.press('Tab');
      await expect(links.first()).toBeFocused();

      // E o link navega: outra página, servida pronta.
      const destino = IDIOMAS.find((outro) => outro !== idioma);
      await menu.locator(`.idiomas__link[hreflang="${destino.lang}"]`).click();
      await expect(page.locator('html')).toHaveAttribute('lang', destino.lang);
    });
  });
}
