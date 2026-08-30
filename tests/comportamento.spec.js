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

test('o modal do diagrama AWS abre e fecha', async ({ page }) => {
  const dialogo = page.locator('#awsArchitectureDialog');
  await expect(dialogo).toBeHidden();

  await page.locator('[data-image-dialog]').click();
  await expect(dialogo).toBeVisible();

  await page.locator('[data-close-image-dialog]').click();
  await expect(dialogo).toBeHidden();
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
