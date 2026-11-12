import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

/** Fonte única: os slugs, as contagens e os segmentos vêm do JSON, não do teste. */
const DADOS = JSON.parse(
  readFileSync(new URL('../src/data/mockups-power-apps.json', import.meta.url), 'utf8')
);
const SLUGS = DADOS.map((c) => c.slug);
const N = DADOS.length;

/**
 * Apps de demonstração Power Apps. Desde 11/11/2026 a lista dos apps vive na
 * home, na aba Power Platform da seção Cases (comportamento da aba em
 * cases-abas.spec.js); aqui ficam a página de cada app, o player e o
 * redirecionamento da antiga galeria.
 */
const PAGINAS = ['/demos/power-apps/obra/', '/en/demos/power-apps/ouvidoria/'];

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

test('a aba Power Platform da home lista os apps e cada um aponta para um app.html existente', async ({
  page,
  request
}) => {
  await page.goto('/');
  const links = await page
    .locator('#cases-power-platform .mock-card a')
    .evaluateAll((as) => as.map((a) => a.href));
  expect(links).toHaveLength(N);
  for (const l of links) {
    const r = await request.get(l + 'app.html');
    expect(r.status(), l).toBe(200);
  }
});

test('player em tela cheia carrega o app e troca o formato', async ({ page }) => {
  await page.goto('/demos/power-apps/obra/tela-cheia/');
  await expect(page.frameLocator('#app').locator('body')).toBeVisible();
  // padrão: abre ajustado à janela em qualquer largura
  await expect(page.locator('[data-modo="janela"]')).toHaveAttribute('aria-pressed', 'true');
  const [caixa0, palco0] = await Promise.all([
    page.locator('#caixa').boundingBox(),
    page.locator('#palco').boundingBox()
  ]);
  expect(Math.round(caixa0.width)).toBe(Math.round(palco0.width));
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
    home: '/',
    raiz: '/demos/power-apps/',
    cenario: 'Cenário fictício',
    mostra: 'O que a demonstração mostra',
    aviso: 'Empresas e dados mockados.',
    voltar: '← Todos os apps de demonstração',
    escopo: 'Execução na Power Platform: nenhuma. Protótipo em HTML com dados fictícios.'
  },
  en: {
    home: '/en/',
    raiz: '/en/demos/power-apps/',
    cenario: 'Fictitious scenario',
    mostra: 'What the demo shows',
    aviso: 'Mock companies and data.',
    voltar: '← All demo apps',
    escopo: 'Execution on Power Platform: none. HTML prototype with fictional data.'
  }
};

for (const [lang, t] of Object.entries(TEXTOS)) {
  test(`${lang}: página do app mostra o aviso antes do cenário, o escopo e volta à aba da home`, async ({
    page
  }) => {
    await page.goto(`${t.raiz}clinica/`);
    // O aviso já diz que a empresa é mockada: o kicker leva só segmento e nome.
    const c = DADOS.find((x) => x.slug === 'clinica');
    await expect(page.locator('.eyebrow')).toHaveText(`${c.segmento[lang]} · ${c.empresa}`);
    await expect(page.locator('main')).not.toContainText(/\(fictícia\)|\(fictitious\)/);
    await expect(page.locator('.mock-aviso > p').first()).toHaveText(t.aviso);
    await expect(page.locator('.mock-aviso')).not.toContainText(
      /Não é trabalho entregue|not delivered work/
    );
    await expect(page.locator('.status.status--designed')).toHaveCount(1);
    await expect(page.locator('.scope')).toHaveText(t.escopo);
    // Tags com ícone, como nos cartões da home.
    const tags = page.locator('main .taglist .tag');
    await expect(tags).toHaveCount(c.tags.length);
    for (const tag of await tags.all()) await expect(tag.locator('.tag__icon')).toHaveCount(1);
    // "← Todos os apps de demonstração" leva à aba Power Platform da home.
    await expect(page.locator('.mock-voltar')).toHaveText(t.voltar);
    await expect(page.locator('.mock-voltar')).toHaveAttribute(
      'href',
      `${t.home}#cases-power-platform`
    );
    const [aviso, cenario, mostra] = await Promise.all([
      page.locator('.mock-aviso').boundingBox(),
      page.getByRole('heading', { level: 2, name: t.cenario }).boundingBox(),
      page.getByRole('heading', { level: 2, name: t.mostra }).boundingBox()
    ]);
    const h1 = await page.locator('h1').boundingBox();
    expect(h1.y).toBeLessThan(aviso.y);
    expect(aviso.y).toBeLessThan(cenario.y);
    expect(cenario.y).toBeLessThan(mostra.y);
  });

  test(`${lang}: a antiga galeria redireciona para a aba Power Platform da home`, async ({
    page,
    request
  }) => {
    const html = await (await request.get(t.raiz)).text();
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain('<meta name="robots" content="noindex">');
    expect(head).toContain(
      `<meta http-equiv="refresh" content="0; url=${t.home}#cases-power-platform">`
    );
    expect(head).toContain(
      `<link rel="canonical" href="https://ildeanfreitas.github.io${t.home}">`
    );
    expect(html).toContain(`<a href="${t.home}#cases-power-platform">`);
    await page.goto(t.raiz);
    await page.waitForURL(`**${t.home}#cases-power-platform`);
    await expect(page.locator('#aba-power-platform')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#cases-power-platform .mock-card').first()).toBeVisible();
  });
}

test.describe('sem JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('a antiga galeria redireciona pelo meta refresh', async ({ page }) => {
    await page.goto('/demos/power-apps/');
    await page.waitForURL('**/#cases-power-platform');
    await expect(page.locator('#cases-power-platform .mock-card')).toHaveCount(N);
  });
});

test('o sitemap lista as páginas dos apps e não a antiga galeria', async () => {
  const xml = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
  expect(xml).not.toMatch(/demos\/power-apps\/<\/loc>/);
  for (const s of SLUGS) {
    expect(xml).toContain(`/demos/power-apps/${s}/</loc>`);
    expect(xml).toContain(`/en/demos/power-apps/${s}/</loc>`);
  }
});

test('a nota de idioma aparece só em inglês, dentro do aviso (home e página do app)', async ({
  page
}) => {
  const nota = 'The demo apps are in Portuguese.';
  // Na home a aba Power BI tem o próprio aviso (paineis.spec.js): aqui, o dos apps.
  await page.goto('/en/');
  await expect(page.locator('#cases-power-platform .mock-aviso .mock-nota')).toHaveText(nota);
  await page.goto('/en/demos/power-apps/ordens-servico/');
  await expect(page.locator('.mock-aviso .mock-nota')).toHaveText(nota);
  for (const url of ['/', '/demos/power-apps/ordens-servico/']) {
    await page.goto(url);
    await expect(page.locator('.mock-nota')).toHaveCount(0);
  }
});

test('o texto das páginas dos apps não usa a palavra "case"', async ({ page }) => {
  for (const url of SLUGS.flatMap((s) => [
    `/demos/power-apps/${s}/`,
    `/en/demos/power-apps/${s}/`
  ])) {
    await page.goto(url);
    // o menu do site leva "Cases" para a seção da home; o miolo da página não.
    await expect(page.locator('main'), url).not.toContainText(/\bcases?\b/i);
    expect(
      await page.locator('head meta[name="description"]').getAttribute('content'),
      url
    ).not.toMatch(/\bcases?\b/i);
    expect(await page.title(), url).not.toMatch(/\bcases?\b/i);
  }
});

test('nenhum dos apps faz requisição para fora do próprio site', async ({ page, baseURL }) => {
  const externas = [];
  page.on('request', (r) => {
    if (
      !r.url().startsWith(baseURL) &&
      !r.url().startsWith('data:') &&
      !r.url().startsWith('blob:')
    ) {
      externas.push(r.url());
    }
  });
  for (const slug of SLUGS) {
    await page.goto(`/demos/power-apps/${slug}/app.html`);
    await page.waitForLoadState('load');
  }
  expect(externas).toEqual([]);
});

test('todo app.html, todo player e o redirecionamento da galeria têm noindex', async ({
  request
}) => {
  const urls = [
    '/demos/power-apps/',
    '/en/demos/power-apps/',
    ...SLUGS.flatMap((slug) => [
      `/demos/power-apps/${slug}/app.html`,
      `/demos/power-apps/${slug}/tela-cheia/`,
      `/en/demos/power-apps/${slug}/tela-cheia/`
    ])
  ];
  for (const url of urls) {
    const html = await (await request.get(url)).text();
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head, url).toContain('<meta name="robots" content="noindex">');
  }
});

test('o link de idioma das páginas de app leva à página par', async ({ page }) => {
  const pt = '/demos/power-apps/obra/';
  const en = '/en/demos/power-apps/obra/';
  for (const [de, para] of [
    [pt, en],
    [en, pt]
  ]) {
    await page.goto(de);
    await expect(page.locator('.site-header .lang-toggle'), de).toHaveAttribute('href', para);
    await expect(page.locator('.site-footer a[hreflang]'), de).toHaveAttribute('href', para);
  }
});

test.describe('sandbox do iframe', () => {
  test.skip(({ viewport }) => viewport.width < 1024, 'o iframe da página só aparece no desktop');

  test('o formulário do app envia dentro do iframe (obra: nova ocorrência)', async ({ page }) => {
    await page.goto('/demos/power-apps/obra/');
    const app = page.frameLocator('iframe.mock-moldura');
    await app.getByRole('button', { name: /Márcio Nunes/ }).click();
    await app.locator('#entrar').click();
    await app.getByRole('button', { name: 'Abrir diário deste dia' }).click();
    await app.getByRole('button', { name: 'Nova ocorrência' }).click();
    const form = app.locator('#modal form');
    await expect(form).toBeVisible();
    await form.locator('#f_t').selectOption('Material');
    await form.locator('#f_x').fill('Entrega de cimento atrasada em dois dias.');
    await form.getByRole('button', { name: 'Adicionar' }).click();
    // sem allow-forms o submit não dispara e o modal continua aberto
    await expect(app.locator('#modal form')).toHaveCount(0);
    await expect(app.getByText('Entrega de cimento atrasada em dois dias.')).toBeVisible();
  });

  test('o link do Learn abre nova aba a partir do iframe', async ({ page, context }) => {
    await context.route('https://learn.microsoft.com/**', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Learn</title>' })
    );
    await page.goto('/demos/power-apps/obra/');
    const app = page.frameLocator('iframe.mock-moldura');
    await app.getByRole('button', { name: /Márcio Nunes/ }).click();
    await app.locator('#entrar').click();
    // no iframe da página o painel não cabe acoplado: abre pelo botão, em modal
    await app.locator('#ppbtn').click();
    const link = app.locator('#modal .src a').first();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link.locator('.sr')).toHaveText(' (abre em nova aba)');
    // pelo teclado: o link pode estar fora da área visível do modal dentro do iframe
    await link.focus();
    const [aba] = await Promise.all([context.waitForEvent('page'), link.press('Enter')]);
    expect(aba.url()).toMatch(/^https:\/\/learn\.microsoft\.com\//);
    await aba.close();
  });
});

test('os links do Learn mostram o título da página, avisam a nova aba e têm alvo de 24 px', async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const slug of ['inspecao-via', 'obra', 'ordens-servico', 'rebanho']) {
    await page.goto(`/demos/power-apps/${slug}/app.html`);
    const html = await page.content();
    // cada URL citada no app tem título no mapa TL
    const faltam = await page.evaluate(() => {
      /* global TL, LB0 */
      const src = document.documentElement.outerHTML;
      const urls = [
        ...src.matchAll(/https:\/\/learn\.microsoft\.com\/([^"'`\s]+)/g),
        ...src.matchAll(/LB\+"([^"]+)"/g)
      ].map((m) => m[1]);
      return [...new Set(urls)].filter((u) => !TL[u] && u !== LB0);
    });
    expect(faltam, slug).toEqual([]);
    expect(html, slug).not.toContain('word-break:break-all');
  }
  // rótulo e tamanho de um link renderizado (obra, painel acoplado a 1440 px)
  await page.goto('/demos/power-apps/obra/app.html?fast');
  await page.getByRole('button', { name: /Márcio Nunes/ }).click();
  await page.locator('#entrar').click();
  const a = page.locator('#pp .src a').first();
  await expect(a).toBeVisible();
  expect(await a.innerText()).not.toMatch(/learn\.microsoft\.com|^power-/);
  expect((await a.boundingBox()).height).toBeGreaterThanOrEqual(24);
});

test('player em 375 px: sem modo Tablet, barra compacta, tema salvo', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.addInitScript("localStorage.setItem('tema', 'light')");
  await page.goto('/demos/power-apps/obra/tela-cheia/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('[data-modo="tablet"]')).toBeHidden();
  await expect(page.locator('[data-modo="janela"]')).toHaveAttribute('aria-pressed', 'true');
  const palco = await page.locator('#palco').boundingBox();
  // tudo acima do palco (barra e dica) ocupa no máximo 12% da altura
  expect(palco.y).toBeLessThanOrEqual(740 * 0.12);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain(
    'Mona Sans'
  );
});

test('o aviso do app não cobre o painel aberto em tela estreita (inspecao-via)', async ({
  page
}) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto('/demos/power-apps/inspecao-via/app.html?fast');
  await page.locator('#entrar').click();
  await expect(page.locator('.toast').first()).toBeVisible();
  await page.locator('#ppbtn').click();
  await expect(page.locator('#modal .pp')).toBeVisible();
  const toast = await page.locator('#toasts').boundingBox();
  expect(toast.y + toast.height).toBeLessThan(740 / 2);
});
