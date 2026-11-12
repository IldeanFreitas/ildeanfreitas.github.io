/* global requestAnimationFrame */
import { test, expect } from '@playwright/test';
import cases from '../src/data/cases.json' with { type: 'json' };
import { PAINEIS, TECNOLOGIAS, dados as APPS, tecnologiaDe, tecsDoApp } from '../scripts/demos.mjs';

/**
 * Seção Cases em abas (desde 11/11/2026). A aba Power Platform: busca,
 * filtros (Tecnologia, Tipo, Segmento dos apps), contador e os dois blocos. A
 * aba Power BI (desde 12/11/2026): busca, filtro Segmento, contador e os
 * cartões dos painéis de demonstração.
 * Sem JavaScript nada disto existe: ver sem-javascript.spec.js.
 *
 * As contagens esperadas vêm dos dados (JSON dos apps, cases.json e o
 * dicionário de tecnologias de scripts/demos.mjs), não de números fixos.
 */
const PROJETOS = cases.filter((c) => c.area === 'power-platform');
const TOTAL = APPS.length + PROJETOS.length;
const tecsDoProjeto = (c) => [...new Set(c.tags.map(tecnologiaDe).filter(Boolean))];

const IDIOMAS = {
  pt: {
    rota: '/',
    lista: 'Projetos por área',
    abas: ['Power Platform', 'Power BI', 'Engenharia de Dados', 'IA aplicada'],
    contagem: (n) => `${n} de ${TOTAL} itens`,
    vazio: /^Nada encontrado/,
    todas: 'Todas',
    projetos: `Projetos (${PROJETOS.length})`,
    demos: `Apps de demonstração (${APPS.length})`,
    aviso: 'Empresas e dados mockados.',
    ver: 'Ver o app',
    buscas: ['saude', 'SAÚDE'],
    bi: {
      contagem: (n) => `${n} de ${PAINEIS.length} itens`,
      bloco: 'Painéis de demonstração',
      segmento: 'Segmento',
      todos: 'Todos',
      dica: 'Buscar por nome, segmento ou recurso',
      ver: 'Ver o painel',
      nota: null
    }
  },
  en: {
    rota: '/en/',
    lista: 'Projects by area',
    abas: ['Power Platform', 'Power BI', 'Data Engineering', 'Applied AI'],
    contagem: (n) => `${n} of ${TOTAL} items`,
    vazio: /^Nothing found/,
    todas: 'All',
    projetos: `Projects (${PROJETOS.length})`,
    demos: `Demo apps (${APPS.length})`,
    aviso: 'Mock companies and data.',
    ver: 'View the app',
    buscas: ['clinica', 'CLÍNICA'],
    bi: {
      contagem: (n) => `${n} of ${PAINEIS.length} items`,
      bloco: 'Demo dashboards',
      segmento: 'Segment',
      todos: 'All',
      dica: 'Search by name, segment or feature',
      ver: 'View the dashboard',
      nota: 'The demo dashboards are in Portuguese.'
    }
  }
};

const PP = '#cases-power-platform';
const BI = '#cases-power-bi';
const visiveis = (page, aba = PP) => page.locator(`${aba} [data-filtro-item]:visible`);

for (const [lang, t] of Object.entries(IDIOMAS)) {
  test.describe(`${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(t.rota);
    });

    test('abas na ordem, com ícone, Power Platform aberta e um painel só visível', async ({
      page
    }) => {
      const lista = page.locator('#cases [role="tablist"]');
      await expect(lista).toHaveCount(1);
      await expect(lista).toHaveAttribute('aria-label', t.lista);
      const abas = lista.locator('[role="tab"]');
      await expect(abas).toHaveText(t.abas);
      for (const [i, id] of ['power-platform', 'power-bi', 'engenharia-dados', 'ia'].entries()) {
        const aba = abas.nth(i);
        await expect(aba).toHaveAttribute('aria-controls', `cases-${id}`);
        await expect(aba).toHaveAttribute('aria-selected', String(i === 0));
        await expect(aba).toHaveAttribute('tabindex', i === 0 ? '0' : '-1');
        // O mesmo ícone do cartão de Especialidades (Power BI: a marca).
        await expect(aba.locator('.cases-aba__icone')).toHaveCount(1);
        await expect(aba.locator('.cases-aba__icone')).toBeVisible();
        expect((await aba.boundingBox()).height).toBeGreaterThanOrEqual(40);
        const painel = page.locator(`#cases-${id}`);
        await expect(painel).toHaveAttribute('role', 'tabpanel');
        await expect(painel).toHaveAttribute('aria-labelledby', `aba-${id}`);
        if (i === 0) await expect(painel).toBeVisible();
        else await expect(painel).toBeHidden();
      }
      // Ícone da aba ativa na cor do acento (traço em currentColor).
      const corAtiva = await abas
        .nth(0)
        .evaluate((a) => [
          getComputedStyle(a).color,
          getComputedStyle(a.querySelector('svg')).color
        ]);
      expect(corAtiva[1]).toBe(corAtiva[0]);
    });

    test('clique e setas trocam a aba (tabindex rolante, Home e End)', async ({ page }) => {
      const aba = (id) => page.locator(`#aba-${id}`);
      await aba('engenharia-dados').click();
      await expect(aba('engenharia-dados')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#cases-engenharia-dados')).toBeVisible();
      await expect(page.locator('#cases-power-platform')).toBeHidden();

      await aba('engenharia-dados').focus();
      await page.keyboard.press('ArrowRight');
      await expect(aba('ia')).toBeFocused();
      await expect(aba('ia')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#cases-ia')).toBeVisible();
      await page.keyboard.press('ArrowRight');
      await expect(aba('power-platform')).toBeFocused();
      await expect(aba('power-platform')).toHaveAttribute('tabindex', '0');
      await expect(aba('ia')).toHaveAttribute('tabindex', '-1');
      await page.keyboard.press('ArrowLeft');
      await expect(aba('ia')).toBeFocused();
      await page.keyboard.press('Home');
      await expect(aba('power-platform')).toBeFocused();
      await page.keyboard.press('End');
      await expect(aba('ia')).toBeFocused();
      await expect(page.locator('#cases [role="tab"][aria-selected="true"]')).toHaveCount(1);
    });

    test('#cases-<área> na URL abre a aba e rola até ela, também em hashchange', async ({
      page
    }) => {
      await page.goto(`${t.rota}#cases-engenharia-dados`);
      await expect(page.locator('#aba-engenharia-dados')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#cases-engenharia-dados')).toBeVisible();
      await expect(page.locator('#cases-engenharia-dados')).toBeInViewport();
      await expect(page.locator('#cases [role="tablist"]')).toBeInViewport();
      // A carga com hash não deixa o painel focado com o contorno em volta da aba.
      await expect(page.locator('#cases-engenharia-dados')).not.toBeFocused();

      await page.evaluate(() => {
        document.location.hash = '#cases-ia';
      });
      await expect(page.locator('#aba-ia')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#cases-ia')).toBeInViewport();

      // Âncora de algo dentro de uma aba (um case) também abre a aba.
      await page.goto(`${t.rota}#case-dataops`);
      await expect(page.locator('#aba-engenharia-dados')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#case-dataops')).toBeInViewport();
    });

    test('busca sem acento e sem caixa, com contador', async ({ page }) => {
      const contagem = page.locator(`${PP} .cases-filtros__contagem`);
      await expect(contagem).toHaveText(t.contagem(TOTAL));
      await expect(contagem.locator('xpath=..')).toHaveAttribute('aria-live', 'polite');
      // PT: o segmento "Saúde"; EN: a empresa "Clínica Lumevita" (o segmento é
      // "Healthcare"). Em ambos, sem acento e em qualquer caixa.
      for (const termo of t.buscas) {
        await page.locator(`${PP} input[type="search"]`).fill(termo);
        await expect(contagem, termo).toHaveText(t.contagem(1));
        await expect(visiveis(page)).toHaveCount(1);
        await expect(visiveis(page)).toContainText('Clínica Lumevita');
      }
      // Projetos sem item visível: o bloco some junto.
      await expect(page.locator(`${PP} [data-bloco="projeto"]`)).toBeHidden();
      await expect(page.locator(`${PP} [data-bloco="demo"] .mock-aviso`)).toBeVisible();

      await page.locator(`${PP} input[type="search"]`).fill('zzzz');
      await expect(contagem).toHaveText(t.contagem(0));
      await expect(page.locator(`${PP} .cases-filtros__vazio`)).toBeVisible();
      await expect(page.locator(`${PP} .cases-filtros__vazio`)).toHaveText(t.vazio);
      // Nenhum bloco à vista, nem o aviso dos apps.
      await expect(page.locator(`${PP} [data-bloco]:visible`)).toHaveCount(0);
      await expect(page.locator('#cases-power-platform .mock-aviso')).toBeHidden();

      await page.locator(`${PP} input[type="search"]`).fill('');
      await expect(contagem).toHaveText(t.contagem(TOTAL));
      await expect(page.locator(`${PP} .cases-filtros__vazio`)).toBeHidden();
    });

    test('filtro de tipo', async ({ page }) => {
      const grupo = page.locator(`${PP} [data-filtro="tipo"]`);
      await grupo.getByRole('button', { name: t.projetos }).click();
      await expect(grupo.getByRole('button', { name: t.projetos })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await expect(page.locator(`${PP} .cases-filtros__contagem`)).toHaveText(
        t.contagem(PROJETOS.length)
      );
      await expect(page.locator(`${PP} [data-bloco="demo"]`)).toBeHidden();
      await expect(page.locator('#cases-power-platform .mock-aviso')).toBeHidden();
      await grupo.getByRole('button', { name: t.demos }).click();
      await expect(page.locator(`${PP} .cases-filtros__contagem`)).toHaveText(
        t.contagem(APPS.length)
      );
      await expect(page.locator(`${PP} [data-bloco="projeto"]`)).toBeHidden();
      await expect(grupo.locator('[aria-pressed="true"]')).toHaveCount(1);
    });

    test('filtro de segmento mostra só os apps do segmento e esconde os projetos', async ({
      page
    }) => {
      const segmento = APPS[APPS.length - 1].segmento[lang];
      const n = APPS.filter((c) => c.segmento[lang] === segmento).length;
      await page
        .locator(`${PP} [data-filtro="segmento"]`)
        .getByRole('button', { name: segmento, exact: true })
        .click();
      await expect(page.locator(`${PP} .cases-filtros__contagem`)).toHaveText(t.contagem(n));
      await expect(page.locator(`${PP} [data-bloco="projeto"]`)).toBeHidden();
      // Com Tipo = Projetos e um segmento escolhido, nada casa.
      await page
        .locator(`${PP} [data-filtro="tipo"]`)
        .getByRole('button', { name: t.projetos })
        .click();
      await expect(page.locator(`${PP} .cases-filtros__contagem`)).toHaveText(t.contagem(0));
      await expect(page.locator(`${PP} .cases-filtros__vazio`)).toBeVisible();
    });

    test('filtro de tecnologia: opções do dicionário, com ícone, e projetos pelas tags', async ({
      page
    }) => {
      const grupo = page.locator(`${PP} [data-filtro="tecs"]`);
      const usadas = new Set([...APPS.flatMap(tecsDoApp), ...PROJETOS.flatMap(tecsDoProjeto)]);
      const opcoes = Object.keys(TECNOLOGIAS).filter((k) => usadas.has(k));
      await expect(grupo.locator('button')).toHaveText([
        t.todas,
        ...opcoes.map((k) => TECNOLOGIAS[k].nome)
      ]);
      for (const k of opcoes)
        await expect(grupo.locator(`[data-valor="${k}"] .tag__icon`)).toHaveCount(1);
      for (const k of opcoes) {
        const esperado =
          APPS.filter((c) => tecsDoApp(c).includes(k)).length +
          PROJETOS.filter((c) => tecsDoProjeto(c).includes(k)).length;
        await grupo.locator(`[data-valor="${k}"]`).click();
        await expect(page.locator(`${PP} .cases-filtros__contagem`), k).toHaveText(
          t.contagem(esperado)
        );
      }
      // O projeto fiscal entra por Power Apps, Dataverse e Power Automate.
      await grupo.locator('[data-valor="dataverse"]').click();
      await expect(page.locator('#case-fiscal-orchestration')).toBeVisible();
      await grupo.getByRole('button', { name: t.todas, exact: true }).click();
      await expect(page.locator(`${PP} .cases-filtros__contagem`)).toHaveText(t.contagem(TOTAL));
    });

    test('cartões dos apps: aviso único, botão "Ver o app", tags com ícone renderizado', async ({
      page
    }) => {
      const cartoes = page.locator('#cases-power-platform .mock-card');
      await expect(cartoes).toHaveCount(APPS.length);
      await expect(page.locator('#cases-power-platform .mock-aviso > p').first()).toHaveText(
        t.aviso
      );
      // O aviso único substitui o (fictícia) do cartão e a frase antiga do aviso.
      await expect(page.locator('#cases-power-platform [data-bloco="demo"]')).not.toContainText(
        /fictícia|fictitious|Não é trabalho entregue|not delivered work/
      );
      for (const [i, c] of APPS.entries()) {
        const botao = cartoes.nth(i).locator('a.btn');
        await expect(botao).toHaveText(`${t.ver}: ${c.titulo[lang]}`);
        await expect(botao.locator('.sr-only')).toHaveText(`: ${c.titulo[lang]}`);
        await expect(botao).toHaveAttribute('href', `${t.rota}demos/power-apps/${c.slug}/`);
      }
      // Toda tag com exatamente um ícone, e ele aparece de fato.
      for (const lista of await page.locator(`${PP} .mock-card .taglist`).all()) {
        await lista.scrollIntoViewIfNeeded();
        await lista.evaluate((l) =>
          Promise.all([...l.querySelectorAll('img')].map((i) => i.decode().catch(() => {})))
        );
      }
      const ruins = await page.locator(`${PP} .mock-card .tag`).evaluateAll((tags) =>
        tags
          .filter((tag) => {
            const icones = tag.querySelectorAll('.tag__icon');
            if (icones.length !== 1) return true;
            const [icone] = icones;
            if (icone.tagName === 'IMG') return !icone.complete || icone.naturalWidth === 0;
            const id = icone.querySelector('use')?.getAttribute('href')?.replace(/^#/, '');
            const simbolo = id && document.getElementById(id);
            return !(simbolo?.tagName === 'symbol' && simbolo.querySelector('path'));
          })
          .map((tag) => tag.textContent.trim())
      );
      expect(ruins).toEqual([]);
      await expect(page.locator(`${PP} .mock-card .tag`, { hasText: /^Canvas$/ })).toHaveCount(0);
    });

    test('filtros com alvo de 40 px, nas duas abas com demonstrações', async ({ page }) => {
      for (const aba of [PP, BI]) {
        if (aba === BI) await page.locator('#aba-power-bi').click();
        const botoes = await page.locator(`${aba} .mock-filtros button`).all();
        expect(botoes.length, aba).toBeGreaterThan(1);
        for (const botao of botoes) {
          await botao.scrollIntoViewIfNeeded();
          expect((await botao.boundingBox()).height, aba).toBeGreaterThanOrEqual(40);
        }
        expect(
          (await page.locator(`${aba} input[type="search"]`).boundingBox()).height,
          aba
        ).toBeGreaterThanOrEqual(40);
      }
    });

    test('aba Power BI: painéis em cartões, com aviso único, botão "Ver o painel" e tags com ícone', async ({
      page
    }) => {
      await page.locator('#aba-power-bi').click();
      const painel = page.locator(BI);
      await expect(painel).toBeVisible();
      await expect(page.locator(PP)).toBeHidden();
      // Com cartões e filtros dentro, o painel não precisa entrar na ordem do Tab.
      await expect(painel).not.toHaveAttribute('tabindex', '0');
      await expect(painel.locator('.cases-bloco__titulo')).toHaveText([t.bi.bloco]);
      await expect(painel.locator('.cases-bloco__titulo')).toHaveJSProperty('tagName', 'H4');
      await expect(painel.locator('.mock-aviso > p').first()).toHaveText(t.aviso);
      if (t.bi.nota) await expect(painel.locator('.mock-aviso .mock-nota')).toHaveText(t.bi.nota);
      else await expect(painel.locator('.mock-nota')).toHaveCount(0);
      // Sem "(fictícia)", sem a frase antiga do aviso, sem o botão da galeria e
      // sem a palavra "case" para painel de demonstração.
      await expect(painel).not.toContainText(
        /\(fictícia\)|\(fictitious\)|Não é trabalho entregue|not delivered work|\bcases?\b/i
      );
      await expect(painel.locator('.demos-mais, a[href$="/demos/power-bi/"]')).toHaveCount(0);
      const cartoes = painel.locator('.mock-card');
      await expect(cartoes).toHaveCount(PAINEIS.length);
      for (const [i, c] of PAINEIS.entries()) {
        const cartao = cartoes.nth(i);
        await expect(cartao.locator('.mock-card__seg')).toHaveText(
          `${c.segmento[lang]} | ${c.empresa}`
        );
        await expect(cartao.locator('.mock-card__titulo')).toHaveText(c.titulo[lang]);
        await expect(cartao.locator('.mock-card__titulo')).toHaveJSProperty('tagName', 'H5');
        await expect(cartao.locator('.status.status--designed')).toHaveCount(1);
        const botao = cartao.locator('a.btn');
        await expect(botao).toHaveText(`${t.bi.ver}: ${c.titulo[lang]}`);
        await expect(botao.locator('.sr-only')).toHaveText(`: ${c.titulo[lang]}`);
        await expect(botao).toHaveAttribute('href', `${t.rota}demos/power-bi/${c.slug}/`);
        await expect(cartao.locator('.tag')).toHaveCount(c.tags.length);
      }
      // Toda tag com exatamente um ícone do sprite, desenhado de fato (as tags
      // dos painéis são conceitos: ícone neutro, nunca logotipo).
      const ruins = await painel.locator('.mock-card .tag').evaluateAll((tags) =>
        tags
          .filter((tag) => {
            const icones = tag.querySelectorAll('.tag__icon');
            if (icones.length !== 1 || icones[0].tagName === 'IMG') return true;
            const id = icones[0].querySelector('use')?.getAttribute('href')?.replace(/^#/, '');
            const simbolo = id && document.getElementById(id);
            const caixa = icones[0].getBoundingClientRect();
            return !(
              simbolo?.tagName === 'symbol' &&
              simbolo.querySelector('path') &&
              caixa.width >= 12 &&
              caixa.height >= 12
            );
          })
          .map((tag) => tag.textContent.trim())
      );
      expect(ruins).toEqual([]);
    });

    test('aba Power BI: busca sem acento e filtro de segmento, com contador', async ({ page }) => {
      await page.locator('#aba-power-bi').click();
      const painel = page.locator(BI);
      const contagem = painel.locator('.cases-filtros__contagem');
      const busca = painel.locator('input[type="search"]');
      await expect(contagem).toHaveText(t.bi.contagem(PAINEIS.length));
      await expect(contagem.locator('xpath=..')).toHaveAttribute('aria-live', 'polite');
      await expect(busca).toHaveAttribute('placeholder', t.bi.dica);
      await expect(busca).toHaveAttribute('id', 'cases-busca-power-bi');
      await expect(painel.locator('label[for="cases-busca-power-bi"]')).toHaveCount(1);
      // Um filtro só: Segmento. Sem Tecnologia (as tags são recursos do
      // relatório) e sem Tipo (a área não tem projeto documentado).
      await expect(painel.locator('[data-filtro]')).toHaveCount(1);
      const grupo = painel.locator('[data-filtro="segmento"]');
      await expect(grupo).toHaveAccessibleName(t.bi.segmento);
      const segmentos = [...new Set(PAINEIS.map((c) => c.segmento[lang]))];
      await expect(grupo.locator('button')).toHaveText([t.bi.todos, ...segmentos]);

      // Busca: a empresa "Olmara Clínicas", sem acento e em qualquer caixa.
      for (const termo of ['clinicas', 'CLÍNICAS']) {
        await busca.fill(termo);
        await expect(contagem, termo).toHaveText(t.bi.contagem(1));
        await expect(visiveis(page, BI)).toHaveCount(1);
        await expect(visiveis(page, BI)).toContainText('Olmara Clínicas');
      }
      // A busca de uma aba não mexe na outra.
      await expect(page.locator(`${PP} [data-filtro-item][hidden]`)).toHaveCount(0);
      // Por tag: "RLS" está em mais de um painel.
      const comRls = PAINEIS.filter((c) => c.tags.includes('RLS')).length;
      expect(comRls).toBeGreaterThan(1);
      await busca.fill('rls');
      await expect(contagem).toHaveText(t.bi.contagem(comRls));
      await busca.fill('zzzz');
      await expect(contagem).toHaveText(t.bi.contagem(0));
      await expect(painel.locator('.cases-filtros__vazio')).toBeVisible();
      await expect(painel.locator('.cases-filtros__vazio')).toHaveText(t.vazio);
      await expect(painel.locator('[data-bloco]:visible')).toHaveCount(0);
      await expect(painel.locator('.mock-aviso')).toBeHidden();
      await busca.fill('');
      await expect(painel.locator('.cases-filtros__vazio')).toBeHidden();

      // Segmento: cada opção deixa só os painéis dela.
      for (const segmento of segmentos) {
        const n = PAINEIS.filter((c) => c.segmento[lang] === segmento).length;
        const botao = grupo.getByRole('button', { name: segmento, exact: true });
        await botao.click();
        await expect(botao).toHaveAttribute('aria-pressed', 'true');
        await expect(grupo.locator('[aria-pressed="true"]')).toHaveCount(1);
        await expect(contagem, segmento).toHaveText(t.bi.contagem(n));
        await expect(visiveis(page, BI)).toHaveCount(n);
        await expect(visiveis(page, BI).first().locator('.mock-card__seg')).toContainText(segmento);
      }
      await grupo.getByRole('button', { name: t.bi.todos, exact: true }).click();
      await expect(contagem).toHaveText(t.bi.contagem(PAINEIS.length));
      // O contador da aba Power Platform continua o dela.
      await expect(page.locator(`${PP} .cases-filtros__contagem`)).toHaveText(t.contagem(TOTAL));
    });

    test('#cases-power-bi na URL abre a aba dos painéis sem focar o painel', async ({ page }) => {
      await page.goto(`${t.rota}#cases-power-bi`);
      await expect(page.locator('#aba-power-bi')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(BI)).toBeVisible();
      await expect(page.locator(BI)).toBeInViewport();
      await expect(page.locator('#cases [role="tablist"]')).toBeInViewport();
      await expect(page.locator(BI)).not.toBeFocused();
      await expect(page.locator(`${BI} .mock-card`).first()).toBeVisible();
    });
  });
}

for (const [nome, aba] of [
  ['Power Platform', PP],
  ['Power BI', BI]
]) {
  test(`no celular, o filtro focado pelo Tab fica inteiro dentro da faixa rolável (${nome})`, async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'a faixa rolável só existe abaixo de 560 px');
    await page.goto('/');
    if (aba === BI) await page.locator('#aba-power-bi').click();
    await page.locator(`${aba} input[type="search"]`).focus();
    const total = await page.locator(`${aba} .mock-filtros button`).count();
    expect(total).toBeGreaterThan(1);
    for (let i = 0; i < total; i++) {
      await page.keyboard.press('Tab');
      const problema = await page.evaluate(() => {
        const b = document.activeElement;
        const faixa = b && b.parentElement;
        if (!faixa || !faixa.classList.contains('mock-filtros'))
          return `foco fora dos filtros: ${b?.tagName}`;
        return new Promise((ok) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const f = faixa.getBoundingClientRect();
              const r = b.getBoundingClientRect();
              // 5 px: espessura do contorno de foco (2) mais o afastamento (3).
              const fora = r.left - 5 < f.left - 0.5 || r.right + 5 > f.right + 0.5;
              ok(
                fora
                  ? `"${b.textContent.trim()}" cortado: ${r.left}-${r.right} em ${f.left}-${f.right}`
                  : null
              );
            })
          )
        );
      });
      expect(problema, `Tab ${i + 1}`).toBeNull();
    }
  });
}
