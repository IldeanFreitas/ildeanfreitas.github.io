import { existsSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { lerIdiomas } from '../scripts/idiomas.mjs';

/**
 * Referência visual.
 *
 * É o que torna a extração de CSS/JS da etapa 2 verificável: o critério de
 * aceite daquela etapa é diff visual vazio, e sem estas capturas o "vazio"
 * seria opinião.
 *
 * As capturas NÃO são versionadas — veja docs/QUALIDADE.md. Gere-as com
 * `npm run baseline` imediatamente antes de começar uma etapa que mexa em CSS
 * ou marcação, e rode `npm run test:visual` ao terminá-la.
 *
 * Política por idioma (src/idiomas.json): o idioma padrão tem os dois temas;
 * cada outro idioma, só o escuro, nas três larguras. O CSS é o mesmo em
 * todas as páginas, então o tema claro de um idioma traduzido só repetiria o
 * do padrão; o que muda entre idiomas é o comprimento do texto, e isso o
 * escuro já mostra.
 */
const OUTROS = lerIdiomas().filter((idioma) => !idioma.padrao);

/**
 * Prazo das capturas grandes.
 *
 * Comparar contra a referência é rápido: uma captura que bate termina na
 * hora. Gravar a referência é lento: o Playwright só grava uma captura
 * "estável", o que pede pelo menos duas capturas seguidas idênticas da
 * página inteira (mais de 10 mil pixels de altura no celular). Medido em
 * 21/10/2026: com quatro processos disputando a CPU, cada página inteira
 * levou de 22 a 37 s para gravar, e com 15 s de prazo 7 das 15 capturas
 * falhavam; num processo só, de 10 a 19 s.
 *
 * Por isso `npm run baseline` roda em um processo só e, só na gravação, o
 * prazo sobe para 60 s: três vezes o pior caso medido. Na comparação ele fica
 * em 15 s: um prazo longo ali só atrasaria o aviso de cada captura que mudou,
 * porque o Playwright insiste até o fim do prazo antes de declarar a
 * diferença.
 *
 * "Gravação" são dois casos. `all` e `changed` (o baseline) regravam. E o
 * modo `missing`, que é o padrão do Playwright quando nenhuma opção é dada,
 * grava só a captura que ainda não existe: é o que acontece na primeira vez
 * que um idioma novo entra em src/idiomas.json (`pagina-<código>.png`).
 * Neste último o prazo só sobe para a captura que de fato não tem referência
 * (`existsSync`); as que já têm continuam comparando com 15 s, senão toda
 * comparação comum (`npm run test:visual`, que é `missing`) ganharia o prazo
 * longo e demoraria a acusar cada diferença.
 */
function prazoDaCaptura(testInfo, captura) {
  const modo = testInfo.config.updateSnapshots;
  const semReferencia =
    modo === 'missing' && !existsSync(testInfo.snapshotPath(captura, { kind: 'screenshot' }));
  const regravando = ['all', 'changed'].includes(modo) || semReferencia;
  if (!regravando) return 15_000;
  testInfo.setTimeout(150_000);
  return 60_000;
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

/**
 * Deixa a página determinística antes de capturar.
 *
 * Dois motivos de instabilidade, ambos reais neste site:
 *
 * 1. A captura de página inteira rola o documento, e a rolagem dispara o
 *    `loading="lazy"` das imagens dos diagramas. A imagem chegando entre
 *    os dois disparos de comparação impede a estabilização.
 * 2. Trocar `data-theme` depois da carga dispara as transições de 0.3s, e a
 *    captura pega o meio da transição.
 */
async function estabilizar(page, tema) {
  if (tema) {
    // Precisa vir antes da troca de tema, e não pode ser addInitScript: naquele
    // momento o documento ainda não existe, e o data-theme fixo no HTML
    // sobrescreveria o valor. O resultado seriam capturas dark e light
    // byte a byte idênticas.
    await page.addStyleTag({
      content: '*,*::before,*::after{transition:none!important;animation:none!important}'
    });
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), tema);
  }

  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      img.loading = 'eager';
    });
    // Todas, não só as incompletas: imagem já carregada com decoding="async"
    // pode ir para a captura antes de decodificada. Com a seção Cases em abas,
    // o logotipo do dbt da tag de Especialidades saía em branco, porque o do
    // diagrama DataOps (mesmo arquivo), que antes era decodificado aqui, está
    // numa aba fechada.
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    await document.fonts.ready;
  });
}

for (const tema of ['dark', 'light']) {
  test(`página inteira — tema ${tema}`, async ({ page }, testInfo) => {
    await page.goto('/');
    await estabilizar(page, tema);

    // Guarda contra o defeito que já aconteceu aqui: se a troca de tema não
    // pegar, as duas capturas ficam idênticas e a suíte passa sem comparar
    // nada.
    const fundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(fundo, `tema ${tema} não foi aplicado`).toBe(
      tema === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(244, 246, 243)'
    );

    await expect(page).toHaveScreenshot(`pagina-${tema}.png`, {
      fullPage: true,
      animations: 'disabled',
      // Os diagramas ocupam a largura integral da página; a captura completa
      // percorre um documento alto (ver prazoDaCaptura).
      timeout: prazoDaCaptura(testInfo, `pagina-${tema}.png`)
    });
  });
}

// O nome da captura segue o código do idioma: pagina-en.png, pagina-es.png.
for (const idioma of OUTROS) {
  test(`página inteira — idioma ${idioma.codigo}`, async ({ page }, testInfo) => {
    await page.goto(idioma.caminho);
    await estabilizar(page, 'dark');
    await expect(page.locator('html')).toHaveAttribute('lang', idioma.lang);
    await expect(page).toHaveScreenshot(`pagina-${idioma.codigo}.png`, {
      fullPage: true,
      animations: 'disabled',
      timeout: prazoDaCaptura(testInfo, `pagina-${idioma.codigo}.png`)
    });
  });
}

test('seção de cases', async ({ page }, testInfo) => {
  await page.goto('/#cases');
  await estabilizar(page);
  // A seção de cases é quase tão alta quanto a página inteira no desktop; o
  // prazo padrão (5 s) estourava ao gerar a baseline.
  await expect(page.locator('#cases')).toHaveScreenshot('secao-cases.png', {
    animations: 'disabled',
    timeout: prazoDaCaptura(testInfo, 'secao-cases.png')
  });
});

test('404', async ({ page }) => {
  await page.goto('/404.html');
  await estabilizar(page);
  await expect(page).toHaveScreenshot('pagina-404.png', {
    fullPage: true,
    animations: 'disabled'
  });
});
