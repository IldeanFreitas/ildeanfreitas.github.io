import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

/** Fonte única: slugs, contagens e segmentos vêm do JSON, não do teste. */
const DADOS = JSON.parse(
  readFileSync(new URL('../src/data/mockups-power-bi.json', import.meta.url), 'utf8')
);
const SLUGS = DADOS.map((c) => c.slug);
const N = DADOS.length;
const RAIZ = '/demos/power-bi/';

/** Galeria e páginas dos painéis de demonstração Power BI (pt e en). */
for (const url of [RAIZ, `${RAIZ}varejo/`, `/en${RAIZ}`, `/en${RAIZ}atendimento-ti/`]) {
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

test('galeria lista todos os painéis e o filtro por segmento funciona', async ({ page }) => {
  await page.goto(RAIZ);
  await expect(page.locator('.mock-card')).toHaveCount(N);
  const saude = DADOS.filter((c) => c.segmento.pt === 'Saúde').length;
  expect(saude).toBeGreaterThan(0);
  await page.click('.mock-filtros button[data-seg="Saúde"]');
  await expect(page.locator('.mock-card:not([hidden])')).toHaveCount(saude);
  await expect(page.locator('#mock-contagem')).toHaveText(
    `${saude} ${saude === 1 ? 'painel' : 'painéis'}`
  );
});

test('toda página de painel aponta para um app.html existente', async ({ page, request }) => {
  await page.goto(RAIZ);
  const links = await page.locator('.mock-card a').evaluateAll((as) => as.map((a) => a.href));
  expect(links).toHaveLength(N);
  for (const l of links) {
    const r = await request.get(l + 'app.html');
    expect(r.status(), l).toBe(200);
  }
});

test('player em tela cheia carrega o painel e troca o formato', async ({ page }) => {
  await page.goto(`${RAIZ}financeiro/tela-cheia/`);
  await expect(page.frameLocator('#app').locator('body')).toBeVisible();
  await expect(page.locator('[data-modo="janela"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-modo="celular"]');
  await expect(page.locator('[data-modo="celular"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-modo="janela"]');
  const [caixa, palco] = await Promise.all([
    page.locator('#caixa').boundingBox(),
    page.locator('#palco').boundingBox()
  ]);
  expect(Math.round(caixa.width)).toBe(Math.round(palco.width));
});

const TEXTOS = {
  pt: {
    raiz: RAIZ,
    h1: 'Painéis de demonstração para Power BI',
    ficticia: '(fictícia)',
    cenario: 'Cenário fictício',
    mostra: 'O que o painel mostra',
    aviso: 'Não é trabalho entregue nem resultado medido.',
    escopo: /^Execução no Power BI: nenhuma\. Protótipo em HTML com dados fictícios/
  },
  en: {
    raiz: `/en${RAIZ}`,
    h1: 'Demo dashboards for Power BI',
    ficticia: '(fictitious)',
    cenario: 'Fictitious scenario',
    mostra: 'What the dashboard shows',
    aviso: 'It is not delivered work or a measured result.',
    escopo: /^Execution in Power BI: none\. HTML prototype with fictional data/
  }
};

for (const [lang, t] of Object.entries(TEXTOS)) {
  test(`${lang}: galeria de painéis com título, selo, empresa fictícia e aviso`, async ({
    page
  }) => {
    await page.goto(t.raiz);
    await expect(page.locator('h1')).toHaveText(t.h1);
    await expect(page).toHaveTitle(new RegExp(`^${t.h1}`));
    await expect(page.locator('.mock-card .status.status--designed')).toHaveCount(N);
    await expect(page.locator('.mock-card .mock-ficticia')).toHaveCount(N);
    await expect(page.locator('.mock-card .mock-ficticia').first()).toHaveText(t.ficticia);
    await expect(page.locator('.mock-aviso')).toContainText(t.aviso);
  });

  test(`${lang}: página do painel mostra o aviso antes do cenário e o escopo`, async ({ page }) => {
    await page.goto(`${t.raiz}clinicas/`);
    await expect(page.locator('.eyebrow')).toContainText(t.ficticia);
    await expect(page.locator('.scope')).toHaveText(t.escopo);
    const [aviso, cenario, mostra] = await Promise.all([
      page.locator('.mock-aviso').boundingBox(),
      page.getByRole('heading', { level: 2, name: t.cenario }).boundingBox(),
      page.getByRole('heading', { level: 2, name: t.mostra }).boundingBox()
    ]);
    expect(aviso.y).toBeLessThan(cenario.y);
    expect(cenario.y).toBeLessThan(mostra.y);
  });
}

test('a nota de idioma dos painéis aparece só em inglês', async ({ page }) => {
  await page.goto(`/en${RAIZ}gas/`);
  await expect(page.locator('.mock-aviso .mock-nota')).toHaveText(
    'The demo dashboards are in Portuguese.'
  );
  await page.goto(`${RAIZ}gas/`);
  await expect(page.locator('.mock-nota')).toHaveCount(0);
});

test('as páginas dos painéis não usam ponto médio, travessão nem seta no texto', async ({
  page
}) => {
  for (const url of [RAIZ, `/en${RAIZ}`, ...SLUGS.map((s) => `${RAIZ}${s}/`)]) {
    await page.goto(url);
    await expect(page.locator('main'), url).not.toContainText(/[·—–→]/);
    await expect(page.locator('main'), url).not.toContainText(/\bcases?\b/i);
  }
});

test('nenhum painel faz requisição para fora do próprio site', async ({ page, baseURL }) => {
  const externas = [];
  page.on('request', (r) => {
    if (
      !r.url().startsWith(baseURL) &&
      !r.url().startsWith('data:') &&
      !r.url().startsWith('blob:')
    )
      externas.push(r.url());
  });
  for (const slug of SLUGS) {
    await page.goto(`${RAIZ}${slug}/app.html`);
    await page.waitForLoadState('load');
  }
  expect(externas).toEqual([]);
});

test('o botão da sessão Power BI da home leva à galeria, em PT e em EN', async ({ page }) => {
  await page.goto('/');
  const pt = page.locator('#cases-power-bi .demos-mais a');
  await expect(pt).toHaveText('Ver os 10 painéis de demonstração (dados fictícios)');
  await expect(pt).toHaveAttribute('href', RAIZ);
  await page.goto('/en/');
  const en = page.locator('#cases-power-bi .demos-mais a');
  await expect(en).toHaveText('See the 10 demo dashboards (fictitious data)');
  await expect(en).toHaveAttribute('href', `/en${RAIZ}`);
});

test('todo app.html e todo player de painel têm noindex', async ({ request }) => {
  for (const slug of SLUGS) {
    for (const url of [`${RAIZ}${slug}/app.html`, `${RAIZ}${slug}/tela-cheia/`]) {
      const html = await (await request.get(url)).text();
      const head = html.slice(0, html.indexOf('</head>'));
      expect(head, url).toContain('<meta name="robots" content="noindex">');
    }
  }
});

test('o link de idioma das páginas de painéis leva à página par', async ({ page }) => {
  for (const [de, para] of [
    [`${RAIZ}seguros/`, `/en${RAIZ}seguros/`],
    [`/en${RAIZ}seguros/`, `${RAIZ}seguros/`]
  ]) {
    await page.goto(de);
    await expect(page.locator('.site-header .lang-toggle'), de).toHaveAttribute('href', para);
  }
});

test.describe('painel dentro do iframe', () => {
  test.skip(({ viewport }) => viewport.width < 1024, 'o iframe da página só aparece no desktop');

  test('o painel abre o relatório e filtra dentro do iframe (mineração)', async ({ page }) => {
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto(`${RAIZ}mineracao/`);
    const app = page.frameLocator('iframe.mock-moldura');
    await app.getByRole('button', { name: 'Abrir o relatório' }).click();
    await expect(app.locator('#capa')).toBeHidden();
    expect(erros).toEqual([]);
  });

  test('o link do Learn do painel abre nova aba a partir do iframe', async ({ page, context }) => {
    await context.route('https://learn.microsoft.com/**', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Learn</title>' })
    );
    await page.goto(`${RAIZ}varejo/`);
    const app = page.frameLocator('iframe.mock-moldura');
    await app.getByRole('button', { name: 'Abrir o relatório' }).click();
    await app.getByRole('button', { name: 'Como seria no Power BI' }).click();
    const link = app.locator('a[href^="https://learn.microsoft.com/"]').first();
    await expect(link).toHaveAttribute('target', '_blank');
    await link.focus();
    const [aba] = await Promise.all([context.waitForEvent('page'), link.press('Enter')]);
    expect(aba.url()).toMatch(/^https:\/\/learn\.microsoft\.com\//);
    await aba.close();
  });
});
