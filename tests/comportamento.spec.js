import { test, expect } from '@playwright/test';

/**
 * As funcionalidades inventariadas no diagnóstico. Este arquivo é o contrato
 * que a refatoração precisa preservar: se um teste daqui quebrar numa etapa
 * posterior, a etapa alterou comportamento — não apenas estrutura.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
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
  await botao.click();
  await expect(botao).toHaveAttribute('aria-expanded', 'true');
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

test('o diagrama da AWS é conteúdo legível, não imagem', async ({ page }) => {
  // Substitui o antigo teste do modal de ampliação. Aquele modal existia só
  // para dar zoom num PNG de 1,3 MB com texto dentro; com o diagrama montado
  // nos mesmos componentes dos outros seis cases, ele deixou de ter função.
  // O que precisa ser garantido agora é o que a troca entregou: texto de
  // verdade, que se seleciona, se busca e acompanha o tema.
  const diagrama = page.locator('#plataforma-dados-aws .architecture-diagram');
  await expect(diagrama).toBeVisible();
  await expect(diagrama).toContainText('Bronze');
  await expect(diagrama).toContainText('Silver');
  await expect(diagrama).toContainText('Gold');
  await expect(diagrama).toHaveAttribute('role', 'img');
  await expect(diagrama).toHaveAttribute('aria-label', /.{60,}/);
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
