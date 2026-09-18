import { test, expect } from '@playwright/test';
import cases from '../src/data/cases.json' with { type: 'json' };

/**
 * As funcionalidades inventariadas no diagnóstico. Este arquivo é o contrato
 * que a refatoração precisa preservar: se um teste daqui quebrar numa etapa
 * posterior, a etapa alterou comportamento — não apenas estrutura.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('o tema escuro é o padrão, mesmo em sistema com preferência clara', async ({ page }) => {
  // O site não segue prefers-color-scheme: escuro é identidade, não palpite.
  // Só a escolha explícita do visitante, salva em localStorage, muda isso.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate('localStorage.clear()');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#000000');
});

test('alterna o tema e reflete no aria-pressed', async ({ page }) => {
  const botao = page.locator('#themeToggle');
  const html = page.locator('html');

  const inicial = await html.getAttribute('data-theme');
  await botao.click();
  await expect(html).not.toHaveAttribute('data-theme', inicial ?? '');

  await botao.click();
  await expect(html).toHaveAttribute('data-theme', inicial ?? '');

  // O botão precisa anunciar o próprio estado para leitor de tela.
  await expect(botao).toHaveAttribute('aria-pressed', /true|false/);
});

test('a escolha de tema sobrevive ao recarregamento', async ({ page }) => {
  const html = page.locator('html');
  const inicial = await html.getAttribute('data-theme');
  const desejado = inicial === 'dark' ? 'light' : 'dark';

  await page.locator('#themeToggle').click();
  await expect(html).toHaveAttribute('data-theme', desejado);

  await page.reload();
  // Falha no commit 813fbb5: setTheme() não persiste em localStorage.
  await expect(html).toHaveAttribute('data-theme', desejado);
});

test('o menu mobile abre, fecha por Escape e devolve o foco', async ({ page }, testInfo) => {
  // O botão só existe visualmente abaixo de 940px; em desktop ele está oculto
  // por CSS e o teste não teria o que exercitar.
  test.skip(testInfo.project.name === 'desktop', 'o menu compacto não aparece em desktop');

  const botao = page.locator('#navToggle');
  const nav = page.locator('#nav');

  await expect(botao).toHaveAttribute('aria-expanded', 'false');
  await expect(botao).toHaveText('Abrir menu');
  await botao.click();
  await expect(botao).toHaveAttribute('aria-expanded', 'true');
  await expect(botao).toHaveText('Fechar menu');
  await expect(nav).toHaveAttribute('data-open', 'true');

  await page.keyboard.press('Escape');
  await expect(botao).toHaveAttribute('aria-expanded', 'false');
  await expect(botao).toBeFocused();
});

test('a navegação marca a seção ativa', async ({ page }, testInfo) => {
  // Abaixo de 940px os links vivem dentro do menu compacto e precisam dele
  // aberto para serem clicáveis.
  if (testInfo.project.name !== 'desktop') {
    await page.locator('#navToggle').click();
  }
  await page.locator('a.nav__link[href="#cases"]').click();
  // Sem `ratio`: a seção é mais alta que a viewport mobile, e a fração dela
  // visível não diz nada sobre a navegação ter funcionado.
  await expect(page.locator('#cases')).toBeInViewport();
  await expect(page.locator('.nav__link[aria-current]')).toHaveCount(1);
});

test('a versão em inglês existe, aponta de volta e tem os mesmos cases', async ({ page }) => {
  // Outra página, gerada no build — não troca de strings no cliente. O
  // conteúdo precisa estar no HTML servido para buscador e para uso sem JS.
  await page.goto('/en/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('a.lang-toggle')).toHaveAttribute('href', '/');
  await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute(
    'href',
    'https://ildeanfreitas.github.io/'
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://ildeanfreitas.github.io/en/'
  );
  await expect(page.locator('.case-card')).toHaveCount(cases.length);
  await expect(page.locator('#navToggle')).toHaveText('Open menu');

  // E a página em português aponta para a inglesa.
  await page.goto('/');
  await expect(page.locator('a.lang-toggle')).toHaveAttribute('href', '/en/');
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    'href',
    'https://ildeanfreitas.github.io/en/'
  );
});

test('a legenda de selos cobre exatamente os selos usados nos cases', async ({ page }) => {
  // O gap mais visível da avaliação de 2026-09-17: a legenda prometia selos
  // que nenhum case usava, e os cases usavam selos que a legenda não explicava.
  const legenda = await page
    .locator('#sobre .lista-empilhada .status')
    .evaluateAll((els) => els.map((e) => e.textContent.trim()));
  const usados = await page
    .locator('.case-card .status')
    .evaluateAll((els) => [...new Set(els.map((e) => e.textContent.trim()))]);
  expect(usados.sort()).toEqual(legenda.sort());
});

test('o diagrama da AWS é conteúdo legível, não imagem', async ({ page }) => {
  // Substitui o antigo teste do modal de ampliação. Aquele modal existia só
  // para dar zoom num PNG de 1,3 MB com texto dentro; com o diagrama montado
  // nos mesmos componentes dos outros cases, ele deixou de ter função.
  // O case agora vive na grade, como os demais, com o selo que corresponde ao
  // que ele é: arquitetura proposta, não executada.
  const card = page.locator('#plataforma-dados-aws');
  const diagrama = card.locator('.architecture-diagram');
  await expect(card.locator('.status')).toHaveText('Arquitetura documentada');
  await expect(diagrama).toBeVisible();
  await expect(diagrama).toContainText('Bronze');
  await expect(diagrama).toContainText('Silver');
  await expect(diagrama).toContainText('Gold');
  await expect(diagrama).toHaveAttribute('role', 'img');
  await expect(diagrama).toHaveAttribute('aria-label', /.{60,}/);
  await expect(diagrama.locator('img[src*="vendor/aws"]')).toHaveCount(2);
});

test('o DataOps separa caminho de dados, controle e capacidades transversais', async ({ page }) => {
  const diagrama = page.locator('#case-dataops .architecture-diagram--dataflow');
  await diagrama.scrollIntoViewIfNeeded();

  await expect(diagrama).toHaveAttribute('aria-label', /Visão lógica do laboratório DataOps/);
  await expect(diagrama.locator('.dataflow-track > .dataflow-node')).toHaveCount(5);
  await expect(diagrama.locator('.dataflow-dbt__stages > li')).toHaveCount(3);
  await expect(diagrama.locator('.dataflow-control-plane')).toContainText(
    'Plano de controle · Airflow'
  );
  await expect(diagrama.locator('.dataflow-control-plane')).toContainText('não transforma dados');
  await expect(diagrama.locator('.dataflow-foundation li')).toHaveCount(4);
  await expect(diagrama.locator('.dataflow-product-icon')).toHaveCount(6);
  await expect(diagrama.locator('img[src*="vendor/postgresql"]')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="vendor/airbyte"]')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="vendor/snowflake"]')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="vendor/dbt"]')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="vendor/airflow"]')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="vendor/power-bi"]')).toHaveCount(1);
  await expect(diagrama.locator('.dataflow-icon')).not.toHaveCount(0);
});

test('o bloco dbt do DataOps não estoura a largura no celular', async ({ page }, testInfo) => {
  // Defeito visto na avaliação: a 375px as camadas STG/INT/DW ficavam numa
  // coluna estreita à direita do cabeçalho, com o texto cortado.
  test.skip(testInfo.project.name !== 'mobile', 'só faz sentido na largura de celular');
  const painel = page.locator('#case-dataops .dataflow-dbt');
  await painel.scrollIntoViewIfNeeded();
  const estouro = await painel.evaluate((el) => {
    const limite = el.getBoundingClientRect().right;
    return [...el.querySelectorAll('li b, li small')].some(
      (t) => t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().right > limite
    );
  });
  expect(estouro, 'texto das camadas dbt cortado ou fora do painel').toBe(false);
});

test('a operação assíncrona separa fila, plano de controle e proteções', async ({ page }) => {
  const diagrama = page.locator('#case-fiscal-orchestration .architecture-diagram--async');
  await diagrama.scrollIntoViewIfNeeded();

  await expect(diagrama).toHaveAttribute('aria-label', /Power Apps importa um arquivo Excel/);
  await expect(diagrama.locator('.async-job-node')).toHaveCount(4);
  await expect(diagrama.locator('.async-job-node--entrada')).toContainText('Power Apps');
  await expect(diagrama.locator('.async-job-node--entrada')).toContainText('arquivo Excel');
  await expect(diagrama.locator('.async-job-node--fila')).toContainText('Fila');
  await expect(diagrama.locator('.async-control-plane')).toContainText('Plano de controle');
  await expect(diagrama.locator('.async-control-plane')).toContainText('Power Automate');
  await expect(diagrama.locator('.async-control-plane')).toContainText('retentativas');
  await expect(diagrama.locator('img[src*="vendor/dataverse"]')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="vendor/power-apps"]')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="vendor/power-automate"]')).toHaveCount(1);
  await expect(diagrama.locator('.async-guardrail')).toHaveCount(3);
});

test('o Lakehouse da Câmara distingue coleta, ambientes e controles', async ({ page }) => {
  const diagrama = page.locator('#case-camara-lakehouse .architecture-diagram--lakehouse');
  await diagrama.scrollIntoViewIfNeeded();

  await expect(diagrama).toHaveAttribute('aria-label', /coletor Python/);
  await expect(diagrama.locator('.lakehouse-node')).toHaveCount(4);
  await expect(diagrama.locator('.lakehouse-medallion li')).toHaveCount(3);
  await expect(diagrama.locator('.lakehouse-track')).toContainText('Worker Python');
  await expect(diagrama.locator('.lakehouse-track')).toContainText('Unity Catalog Volume');
  await expect(diagrama.locator('.lakehouse-track')).toContainText('7 dimensões · 4 fatos');
  await expect(diagrama.locator('img[src*="vendor/python"]')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="vendor/power-bi"]')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="vendor/databricks"]')).toHaveCount(2);
  await expect(diagrama.locator('.lakehouse-environments')).toContainText('Desenvolvimento local');
  await expect(diagrama.locator('.lakehouse-environments')).toContainText('Lakehouse Databricks');
  await expect(diagrama.locator('.lakehouse-controls li')).toHaveCount(4);
  await expect(diagrama.locator('.lakehouse-controls')).toContainText('48 testes pytest');
});

test('o RPA OIDC distingue HTTP, navegador e persistência Redis sem expor o portal', async ({
  page
}) => {
  const card = page.locator('#case-rpa-oidc');
  const diagrama = card.locator('.architecture-diagram--rpa-detailed');
  await diagrama.scrollIntoViewIfNeeded();

  // Selo âmbar próprio: "homologação" não é "entregue", e o verde dizia que era.
  await expect(card.locator('.status')).toHaveText('Em homologação');
  await expect(card.locator('.status')).toHaveClass(/status--staging/);
  await expect(card).toContainText('Power Automate Desktop');
  await expect(card).toContainText('Redis');
  await expect(card.locator('a')).toHaveCount(0);
  await expect(diagrama).toHaveAttribute('aria-label', /Redis com TTL/);
  await expect(diagrama.locator('.rpa-detailed-zone')).toHaveCount(2);
  await expect(diagrama.locator('.rpa-product-icon')).toHaveCount(2);
  await expect(diagrama.locator('.rpa-product-icon').first()).toHaveAttribute(
    'src',
    /nodejsHex\.svg$/
  );
  await expect(diagrama.locator('.rpa-product-icon').last()).toHaveAttribute(
    'src',
    /PowerAutomate_scalable\.svg$/
  );
  await expect(diagrama.locator('.rpa-detailed-robot')).toContainText('Power Automate Desktop');
  await expect(diagrama.locator('.rpa-detailed-zones')).toContainText('Redis com TTL');
  await expect(diagrama.locator('.rpa-detailed-zones')).toContainText('localStorage');
  await expect(diagrama.locator('.rpa-detailed-calls .rpa-call')).toHaveCount(10);
  await expect(diagrama.locator('.rpa-call--accent')).toContainText(
    'OTP preenchido após o desafio'
  );
  await expect(diagrama.locator('.rpa-detailed-restrictions li')).toHaveCount(3);
  await expect(diagrama.locator('.rpa-detailed-clocks li')).toHaveCount(3);
  await expect(diagrama.locator('.rpa-detailed-legend')).toContainText('HTTP');
  await expect(diagrama.locator('.rpa-detailed-legend')).toContainText('Navegador');
});

test('cada case traz decisões técnicas e resultado', async ({ page }) => {
  // Blocos que respondem ao que um avaliador pergunta: por que assim, e deu
  // em quê. Papel e aprendizados são opcionais; decisões e resultado, não.
  const cards = page.locator('.case-card');
  const total = await cards.count();
  for (let i = 0; i < total; i++) {
    const fatos = cards.nth(i).locator('.case-facts');
    await expect(fatos, `case ${i} sem bloco de fatos`).toHaveCount(1);
    await expect(fatos.locator('h4', { hasText: 'Decisões técnicas' })).toHaveCount(1);
    await expect(fatos.locator('h4', { hasText: 'Resultado' })).toHaveCount(1);
  }
});

test('os cases são gerados de uma forma só', async ({ page }) => {
  // Antes de virarem dados, os seis cases eram blocos quase iguais mantidos à
  // mão, e um deles tinha divergido: usava class="button button--secondary",
  // que não existe no CSS, e o link do repositório renderizava como texto
  // simples enquanto os outros eram pílulas. Este teste trava a invariante que
  // a geração passou a garantir.
  const links = page.locator('.case-card a[href^="https://github.com"]');
  const total = await links.count();
  expect(total).toBeGreaterThan(0);

  for (let i = 0; i < total; i++) {
    const link = links.nth(i);
    await expect(link).toHaveClass(/\bbtn\b/);
    await expect(link).toHaveAttribute('rel', 'noopener');
    // Um link sem estilo cai para display:inline; o botão é inline-flex.
    const display = await link.evaluate((el) => getComputedStyle(el).display);
    expect(display, `link ${i} sem estilo de botão`).toBe('inline-flex');
  }
});

test('links que abrem em nova aba avisam o leitor de tela', async ({ page }) => {
  const externos = page.locator('a[target="_blank"]');
  const total = await externos.count();
  expect(total).toBeGreaterThan(0);
  for (let i = 0; i < total; i++) {
    await expect(externos.nth(i)).toContainText(/abre em nova aba/);
  }
});

test('nenhuma imagem pesada no caminho crítico', async ({ page }) => {
  const pesos = [];
  page.on('response', async (r) => {
    if (!/image\//.test(r.headers()['content-type'] || '')) return;
    const corpo = await r.body().catch(() => null);
    if (corpo) pesos.push({ url: r.url(), kb: Math.round(corpo.length / 1024) });
  });
  await page.goto('/', { waitUntil: 'networkidle' });

  const pesadas = pesos.filter((p) => p.kb > 300);
  expect(pesadas, pesadas.map((p) => `${p.url} — ${p.kb} KB`).join('\n')).toEqual([]);
});

test('o skip link leva ao conteúdo', async ({ page }) => {
  await page.keyboard.press('Tab');
  const skip = page.locator('a.skip');
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('#conteudo')).toBeAttached();
});

test('o rodapé mostra o ano corrente', async ({ page }) => {
  await expect(page.locator('#ano')).toHaveText(String(new Date().getFullYear()));
});

test('remover um elemento opcional não derruba as demais funcionalidades', async ({ page }) => {
  // Isolamento de falhas: hoje todo o comportamento vive num IIFE cuja primeira
  // instrução acessa #ano sem guarda. O script é inline no fim do body e roda
  // durante o parse, antes de DOMContentLoaded — por isso a remoção precisa
  // acontecer no HTML servido, e não em tempo de execução. Isto reproduz o que
  // aconteceria se alguém renomeasse o elemento do rodapé.
  await page.route('**/', async (route) => {
    const resposta = await route.fetch();
    const html = (await resposta.text()).replace('id="ano"', 'id="ano-do-rodape"');
    await route.fulfill({ response: resposta, body: html });
  });
  await page.goto('/');

  const botao = page.locator('#themeToggle');
  const html = page.locator('html');
  const inicial = await html.getAttribute('data-theme');
  await botao.click();
  await expect(html).not.toHaveAttribute('data-theme', inicial ?? '');
});

test('nenhum erro de console na carga', async ({ page }) => {
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(erros).toEqual([]);
});

test('não há rolagem horizontal', async ({ page }) => {
  const estourou = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(estourou, 'a página não deve rolar na horizontal').toBe(false);
});
