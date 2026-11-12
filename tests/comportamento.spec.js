import { test, expect } from '@playwright/test';
import cases from '../src/data/cases.json' with { type: 'json' };
import apps from '../src/data/mockups-power-apps.json' with { type: 'json' };
import paineis from '../src/data/mockups-power-bi.json' with { type: 'json' };
import { abrirAbaDe, emCadaAba } from './apoio-abas.js';
import { lerIdiomas } from '../scripts/idiomas.mjs';

/** Os idiomas de src/idiomas.json; os testes por idioma partem desta lista. */
const IDIOMAS = lerIdiomas();

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

test('no topo da página nenhum item do menu fica ativo', async ({ page }, testInfo) => {
  // Voltar ao topo de uma vez deixava "Contato" com aria-current: o hero não
  // tem link, então nenhuma seção entrava na faixa para substituí-lo.
  if (testInfo.project.name !== 'desktop') await page.locator('#navToggle').click();
  await page.locator('a.nav__link[href="#contato"]').click();
  await expect(page.locator('.nav__link[href="#contato"]')).toHaveAttribute(
    'aria-current',
    'location'
  );
  await page.keyboard.press('Home');
  await expect(page.locator('.nav__link[aria-current]')).toHaveCount(0);
});

// A versão de cada idioma (lang, canonical, hreflang recíproco, menu,
// rodapé e mesmos cases) é coberta em tests/idiomas.spec.js, a partir da
// configuração.

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

test('os cases seguem a ordem editorial: por área, Power Platform primeiro', async ({ page }) => {
  // Desde 11/11/2026 a seção Cases é dividida em sessões por área, na ordem
  // dos cartões de Especialidades; dentro da sessão vale a ordem do JSON.
  const ids = await page.locator('.case-card').evaluateAll((els) => els.map((e) => e.id));
  expect(ids).toEqual([
    'case-fiscal-orchestration',
    'case-rpa-oidc',
    'case-dataops',
    'case-camara-lakehouse',
    'plataforma-dados-aws'
  ]);
});

/** Ordem das sessões da seção Cases (AREAS em scripts/cases.mjs). */
const AREAS = ['power-platform', 'power-bi', 'engenharia-dados', 'ia'];

for (const [pagina, rota, botoes, emPreparacao] of [
  [
    'pt',
    '/',
    ['Ver cases de Power Platform', 'Ver cases de Engenharia de Dados', 'Ver cases de IA aplicada'],
    /^Em preparação: /
  ],
  [
    'en',
    '/en/',
    ['See Power Platform cases', 'See Data Engineering cases', 'See applied AI cases'],
    /^In preparation: /
  ]
]) {
  test(`${pagina}: a seção Cases tem as quatro sessões, cada case na da sua área`, async ({
    page
  }) => {
    await page.goto(rota);
    const sessoes = page.locator('#cases .cases-area');
    await expect(sessoes).toHaveCount(AREAS.length);
    for (const [i, area] of AREAS.entries()) {
      const sessao = sessoes.nth(i);
      await expect(sessao).toHaveAttribute('id', `cases-${area}`);
      // O título da sessão é o primeiro filho e é h3; o do case desce para h4.
      await expect(sessao.locator(':scope > :first-child')).toHaveJSProperty('tagName', 'H3');
      const ids = await sessao.locator('.case-card').evaluateAll((els) => els.map((e) => e.id));
      expect(ids, area).toEqual(cases.filter((c) => c.area === area).map((c) => c.id));
      if (!ids.length && !(await sessao.locator('.mock-card').count())) {
        // Sessão vazia e sem demonstrações: só título e a linha "Em preparação",
        // sem selo (a legenda de selos do Sobre lista só os selos dos cases).
        await expect(sessao.locator('.cases-area__abertura')).toHaveText(emPreparacao);
        await expect(sessao.locator('.status')).toHaveCount(0);
      }
    }
    // As sessões Power Platform e Power BI reúnem as demonstrações (apps e
    // painéis) em cartões; a Power Platform tem também o bloco dos projetos.
    // Os antigos botões para as galerias avulsas saíram da home.
    const pp = page.locator('#cases-power-platform');
    await expect(pp.locator(':scope > .cases-bloco')).toHaveCount(2);
    await expect(pp.locator('.cases-bloco').nth(0).locator('.mock-card')).toHaveCount(apps.length);
    await expect(pp.locator('.cases-bloco').nth(1).locator('.case-card')).toHaveCount(
      cases.filter((c) => c.area === 'power-platform').length
    );
    const bi = page.locator('#cases-power-bi');
    await expect(bi.locator(':scope > .cases-bloco')).toHaveCount(1);
    await expect(bi.locator('.cases-bloco .mock-card')).toHaveCount(paineis.length);
    await expect(bi.locator('.cases-area__abertura')).not.toHaveText(emPreparacao);
    await expect(page.locator('.demos-mais')).toHaveCount(0);
  });

  test(`${pagina}: cada cartão de Especialidades leva à sua sessão de Cases`, async ({ page }) => {
    await page.goto(rota);
    const cartoes = page.locator('#servicos .card');
    await expect(cartoes).toHaveCount(3);
    const alvos = ['#cases-power-platform', '#cases-engenharia-dados', '#cases-ia'];
    for (const [i, alvo] of alvos.entries()) {
      const botao = cartoes.nth(i).locator('a.card__acao');
      await expect(botao).toHaveText(botoes[i]);
      await expect(botao).toHaveAttribute('href', alvo);
      await expect(page.locator(alvo)).toHaveCount(1);
      // Discreto (secundário, não o lima cheio do primário) e com alvo de 24 px.
      await expect(botao).toHaveClass(/\bbtn--secondary\b/);
      await expect(botao).not.toHaveClass(/\bbtn--primary\b/);
      const caixa = await botao.boundingBox();
      expect(caixa.height, botoes[i]).toBeGreaterThanOrEqual(24);
      expect(caixa.width, botoes[i]).toBeGreaterThanOrEqual(24);
    }
  });
}

test('o botão de Especialidades rola até a sessão e o menu marca Cases', async ({ page }) => {
  // A âncora é de uma sessão dentro de #cases: o scroll-spy (que só observa as
  // seções do menu) continua marcando "Cases", e o foco vai para a sessão.
  const botao = page.locator('#servicos a[href="#cases-engenharia-dados"]');
  await botao.click();
  const sessao = page.locator('#cases-engenharia-dados');
  // Com JS a sessão é uma aba: o clique a abre e a rolagem deixa as abas à vista.
  await expect(page.locator('#aba-engenharia-dados')).toHaveAttribute('aria-selected', 'true');
  await expect(sessao).toBeVisible();
  await expect(sessao).toBeInViewport();
  await expect(page.locator('#cases [role="tablist"]')).toBeInViewport();
  await expect(sessao).toBeFocused();
  // O título da sessão fica abaixo do cabeçalho fixo, não atrás dele.
  const cabecalho = await page.locator('.site-header').boundingBox();
  const titulo = await sessao.locator('h3').boundingBox();
  expect(titulo.y).toBeGreaterThanOrEqual(cabecalho.y + cabecalho.height);
  await expect(page.locator('.nav__link[href="#cases"]')).toHaveAttribute(
    'aria-current',
    'location'
  );
});

for (const [pagina, rota] of [
  ['pt', '/'],
  ['en', '/en/']
]) {
  test(`${pagina}: a hierarquia de títulos não salta nível`, async ({ page }) => {
    // h1 → h2 (seção) → h3 (cartão; sessão de Cases) → h4 (case) → h5 (fatos);
    // nas sessões com demonstrações (Power Platform, Power BI): h4 (bloco) →
    // h5 (app, painel; case) → h6 (fatos).
    await page.goto(rota);
    const niveis = await page
      .locator('h1, h2, h3, h4, h5, h6')
      .evaluateAll((els) => els.map((e) => [Number(e.tagName[1]), e.textContent.trim()]));
    const saltos = niveis
      .filter(([nivel], i) => i > 0 && nivel > niveis[i - 1][0] + 1)
      .map(([nivel, texto]) => `h${nivel} "${texto.slice(0, 40)}"`);
    expect(niveis[0][0]).toBe(1);
    expect(saltos).toEqual([]);
  });
}

test('todo diagrama é figure com aria-label, figcaption de uma frase e um único destaque', async ({
  page
}) => {
  const figuras = page.locator('.case-card figure.architecture-diagram');
  await expect(figuras).toHaveCount(cases.length);
  for (let i = 0; i < cases.length; i++) {
    const f = figuras.nth(i);
    await expect(f).toHaveAttribute('aria-label', /.{60,}/);
    const legenda = f.locator('figcaption');
    await expect(legenda).toHaveCount(1);
    const texto = (await legenda.textContent()).trim();
    // Uma frase: termina em ponto e não tem outro ponto final no meio.
    expect(texto.split(/[.!?](\s|$)/).filter((s) => s && s.trim()).length, texto).toBe(1);
    await expect(
      f.locator('.diagram-node--accent, .diagram-step--accent, .diagram-call--accent')
    ).toHaveCount(1);
  }
});

test('todo bloco de diagrama tem ícone', async ({ page }) => {
  const semIcone = await page
    .locator(
      '.architecture-diagram :is(.diagram-node, .diagram-step, .diagram-band__items li, .diagram-node__list li, .diagram-control)'
    )
    .evaluateAll(
      (els) =>
        els.filter((el) => {
          const icone = el.querySelector(
            ':scope > .diagram-node__icon, :scope > * > .diagram-node__icon'
          );
          return !icone || !icone.querySelector('img, svg, .diagram-icon');
        }).length
    );
  expect(semIcone).toBe(0);
});

test('o diagrama da AWS mostra o estudo documentado, com marcas oficiais e destaque na Gold', async ({
  page
}) => {
  const card = page.locator('#plataforma-dados-aws');
  const diagrama = card.locator('.architecture-diagram');
  await expect(card.locator('.status')).toHaveText('Arquitetura documentada');
  await expect(diagrama).toHaveClass(/architecture-diagram--trilha/);
  await expect(diagrama).toHaveClass(/diagram-anima/);
  await expect(diagrama).not.toHaveClass(/reveal/);
  await expect(diagrama).toHaveAttribute('aria-label', /.{60,}/);
  // Cada serviço AWS nomeado entra com o ícone oficial registrado no manifesto.
  for (const arquivo of [
    'Simple-Storage-Service',
    'AWS-Glue',
    'Amazon-Athena',
    'Amazon-Redshift',
    'AWS-Step-Functions',
    'AWS-Lake-Formation',
    'Amazon-CloudWatch',
    'Identity-and-Access-Management'
  ])
    await expect(
      diagrama.locator(`img[src*="vendor/aws/"][src*="${arquivo}"]`).first()
    ).toBeAttached();
  await expect(diagrama.locator('img[src*="vendor/power-bi"]')).toHaveCount(1);
  // O destaque é a Gold em Iceberg, que é o que faz do lake um lakehouse.
  await expect(diagrama.locator('.diagram-step--accent')).toContainText('Gold');
  await expect(diagrama.locator('.diagram-step--accent')).toContainText('MERGE');
  // Step Functions é plano de controle: pontilhado só até a zona dos jobs Glue.
  await expect(diagrama.locator('.diagram-control')).toContainText('Step Functions');
  const tracos = await diagrama
    .locator('.diagram-ties--controle i')
    .evaluateAll((els) => els.map((e) => !e.classList.contains('diagram-ties__vazio')));
  expect(tracos).toEqual([false, false, true, false, false]);
  await expect(diagrama.locator('.diagram-control')).toContainText('job Bronze, depois job Silver');
  // Consumo em coluna: Athena à parte; uma seta só, do Redshift para o Power BI.
  const consumo = diagrama.locator('.diagram-zone--consumo');
  await expect(consumo).toHaveClass(/diagram-zone--stack/);
  await expect(consumo.locator('.diagram-link')).toHaveCount(1);
  await expect(consumo.locator('.diagram-node--flows-down')).toContainText('Redshift');
  // O que é só documentado leva etiqueta de texto e item de legenda.
  for (const nome of [
    'Step Functions',
    'Gold',
    'Redshift',
    'Power BI',
    'Lake Formation',
    'CloudWatch'
  ])
    await expect(
      diagrama
        .locator(':is(.diagram-control,.diagram-step,.diagram-node:not(.diagram-node--group),li)', {
          hasText: nome
        })
        .locator('.diagram-tag')
        .first()
    ).toHaveText('Documentado');
  await expect(diagrama.locator('.diagram-tag')).toHaveCount(6);
  await expect(diagrama.locator('.diagram-legend')).toContainText('Documentado, sem execução');
});

test('o DataOps separa caminho de dados, controle e capacidades transversais', async ({ page }) => {
  await abrirAbaDe(page, '#case-dataops');
  const diagrama = page.locator('#case-dataops .architecture-diagram');
  await diagrama.scrollIntoViewIfNeeded();

  await expect(page.locator('#case-dataops .status')).toHaveText('Laboratório concluído');
  await expect(page.locator('#case-dataops .status')).toHaveClass(/status--lab/);

  await expect(diagrama).toHaveAttribute('aria-label', /Visão lógica do laboratório DataOps/);
  const zonas = diagrama.locator('.diagram-track > .diagram-zone');
  await expect(zonas.locator('> .diagram-zone__title')).toHaveText([
    'Fontes',
    'Ingestão',
    'Armazenamento e transformação',
    'Consumo'
  ]);
  // Airbyte é ingestão, não fonte.
  await expect(zonas.nth(1)).toContainText('Airbyte');
  await expect(zonas.nth(0)).not.toContainText('Airbyte');
  await expect(diagrama.locator('.diagram-steps > li')).toHaveCount(3);
  await expect(diagrama.locator('.diagram-steps .diagram-icon')).toHaveCount(3);
  await expect(diagrama.locator('.diagram-step--accent')).toContainText('STAGING');
  await expect(diagrama.locator('.diagram-control')).toContainText('Plano de controle · Airflow');
  await expect(diagrama.locator('.diagram-control')).toContainText('a transformação é do dbt');
  // Governança ligada por pontilhado, sem "Orquestração" repetida na faixa.
  const faixa = diagrama.locator('.diagram-band--governanca');
  await expect(faixa).toHaveClass(/diagram-band--dotted/);
  await expect(faixa).not.toContainText('Orquestração');
  await expect(faixa.locator('li')).toHaveCount(3);
  await expect(diagrama.locator('.diagram-ties--governanca i')).toHaveCount(4);
  // O Airflow liga por pontilhado fonte, ingestão e armazenamento; o consumo
  // (Power BI) não é acionado pela DAG.
  await expect(diagrama.locator('.diagram-ties--controle i:not(.diagram-ties__vazio)')).toHaveCount(
    3
  );
  // A legenda descreve o pontilhado; o tracejado é só do meio navegador do RPA.
  await expect(diagrama.locator('.diagram-legend__line--dotted')).toHaveCount(1);
  await expect(diagrama.locator('.diagram-legend__line--dashed')).toHaveCount(0);
  for (const marca of ['postgresql', 'airbyte', 'snowflake', 'dbt', 'airflow', 'power-bi'])
    await expect(diagrama.locator(`img[src*="vendor/${marca}"]`)).toHaveCount(1);
});

test('as marcas de produto têm ao menos 20px em qualquer largura', async ({ page }) => {
  // Uma aba por vez: mede as marcas visíveis em cada uma e confere que todas
  // foram medidas.
  const logos = page.locator('.architecture-diagram img.diagram-node__logo');
  const pequenas = [];
  let medidas = 0;
  await emCadaAba(page, async () => {
    const r = await logos.evaluateAll((imgs) =>
      imgs
        .filter((i) => i.offsetParent !== null)
        .map((i) => {
          i.scrollIntoView();
          const r = i.getBoundingClientRect();
          return { src: i.getAttribute('src'), w: r.width, h: r.height };
        })
    );
    medidas += r.length;
    pequenas.push(
      ...r
        .filter((x) => Math.max(x.w, x.h) < 20)
        .map((x) => `${x.src} ${x.w.toFixed(1)}×${x.h.toFixed(1)}`)
    );
  });
  expect(medidas).toBe(await logos.count());
  expect(pequenas, pequenas.join('\n')).toEqual([]);
});

test('no celular o nó empilha: rótulo acima do título, uma coluna', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'só faz sentido na largura de celular');
  const erros = [];
  let medidos = 0;
  await emCadaAba(page, async () => {
    medidos += await page
      .locator('.architecture-diagram .diagram-node')
      .evaluateAll((nos) => nos.filter((no) => no.offsetParent !== null).length);
    erros.push(...(await nosLadoALado(page)));
  });
  expect(medidos).toBe(await page.locator('.architecture-diagram .diagram-node').count());
  expect(erros, erros.join('\n')).toEqual([]);
});

/** Nós visíveis com rótulo ou nota ao lado do título (no celular, devem empilhar). */
function nosLadoALado(page) {
  return page.locator('.architecture-diagram .diagram-node').evaluateAll((nos) =>
    nos
      .filter((no) => no.offsetParent !== null)
      .map((no) => {
        const rotulo = no.querySelector(':scope > .diagram-node__kind');
        const titulo = no.querySelector(':scope > .diagram-node__title');
        const nota = no.querySelector(':scope > .diagram-node__note');
        if (!titulo || !nota) return 'nó sem título ou nota';
        const t = titulo.getBoundingClientRect();
        const n = nota.getBoundingClientRect();
        if (rotulo && rotulo.getBoundingClientRect().bottom > t.top + 1)
          return `rótulo ao lado do título: ${titulo.textContent}`;
        if (n.top < t.bottom - 1) return `nota ao lado do título: ${titulo.textContent}`;
        return null;
      })
      .filter(Boolean)
  );
}

test('o bloco dbt do DataOps não estoura a largura no celular', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'só faz sentido na largura de celular');
  await abrirAbaDe(page, '#case-dataops');
  const painel = page.locator('#case-dataops .diagram-node--group');
  await painel.scrollIntoViewIfNeeded();
  const estouro = await painel.evaluate((el) => {
    const limite = el.getBoundingClientRect().right;
    return [...el.querySelectorAll('li b, li small')].some(
      (t) => t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().right > limite
    );
  });
  expect(estouro, 'texto das camadas dbt cortado ou fora do painel').toBe(false);
});

test('a operação fiscal: o app deixa o lote pronto, o orquestrador o seleciona e o retorno do robô é só previsto', async ({
  page
}) => {
  const diagrama = page.locator('#case-fiscal-orchestration .architecture-diagram');
  await diagrama.scrollIntoViewIfNeeded();

  await expect(diagrama).toHaveAttribute('aria-label', /previsto no contrato de status/);
  const trilha = diagrama.locator('.diagram-track');
  await expect(trilha.locator('.diagram-node')).toHaveCount(4);
  await expect(trilha).toContainText('Power Apps');
  await expect(trilha).toContainText('Portal nacional de NFS-e');
  // O que é arquitetura-alvo não entra no fluxo em produção.
  await expect(trilha).not.toContainText(/Evidências protegidas|categoria/);
  await expect(diagrama.locator('.diagram-node--accent')).toContainText('Lotes e notas');
  // Robô e portal são de outra equipe / externos; o app e o Dataverse, não.
  await expect(trilha.locator('.diagram-node--external')).toHaveCount(2);
  await expect(trilha.locator('.diagram-node--external').first()).toContainText('Robô');
  await expect(diagrama.locator('.diagram-control')).toContainText('Plano de controle');
  await expect(diagrama.locator('.diagram-control')).toContainText('disparo manual');
  // Sem reserva com prazo nem worker por categoria no que está em produção.
  await expect(diagrama).not.toContainText(/expira|expires|reserva/);
  // O papel separa o que foi do autor e o que foi do time de automação.
  await expect(page.locator('#case-fiscal-orchestration .case-facts')).toContainText(
    'time de automação'
  );
  // Retorno no sentido contrário (robô → lote → Power Apps), marcado como
  // previsto no contrato: o robô em produção só lê o lote.
  const faixaRetorno = diagrama.locator('.diagram-return');
  await expect(faixaRetorno).toHaveClass(/diagram-return--planned/);
  await expect(faixaRetorno.locator('.diagram-zone__title .diagram-tag')).toHaveText(
    'Previsto no contrato'
  );
  await expect(diagrama.locator('.diagram-legend')).toContainText('Previsto no contrato');
  const retorno = faixaRetorno.locator('.diagram-node');
  await expect(retorno).toHaveCount(3);
  await expect(retorno.nth(0)).toContainText('Devolve o resultado');
  await expect(retorno.nth(2)).toContainText('Operador vê o resultado');
  await expect(diagrama).not.toContainText(/credencial em coluna|avisa por e-mail/);
  await expect(diagrama.locator('.diagram-return .diagram-link--reverse')).toHaveCount(2);
  await expect(diagrama.locator('.diagram-band--governanca li')).toHaveCount(4);
});

test('o Lakehouse da Câmara termina em tabelas Gold, sem Power BI', async ({ page }) => {
  await abrirAbaDe(page, '#case-camara-lakehouse');
  const card = page.locator('#case-camara-lakehouse');
  const diagrama = card.locator('.architecture-diagram');
  await diagrama.scrollIntoViewIfNeeded();

  await expect(card).not.toContainText('Power BI');
  await expect(diagrama.locator('img[src*="vendor/power-bi"]')).toHaveCount(0);
  await expect(diagrama).toHaveAttribute('aria-label', /coletor Python/);
  await expect(diagrama.locator('.diagram-steps > li')).toHaveCount(3);
  await expect(diagrama.locator('.diagram-step--accent')).toContainText('Bronze');
  await expect(diagrama.locator('.diagram-zone--consumo')).toContainText('Tabelas Gold');
  await expect(diagrama.locator('.diagram-zone--consumo')).toContainText('BI e SQL');
  await expect(diagrama.locator('img[src*="vendor/python"]')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="vendor/databricks"]')).toHaveCount(2);
  const ambientes = diagrama.locator('.diagram-band--ambiente li');
  await expect(ambientes).toHaveCount(2);
  await expect(ambientes.nth(0)).toContainText('Desenvolvimento local');
  await expect(ambientes.nth(0).locator('.diagram-icon--laptop')).toHaveCount(1);
  await expect(diagrama.locator('.diagram-band--governanca li')).toHaveCount(4);
  await expect(diagrama).toContainText('48 testes pytest');
});

test('o RPA OIDC entrega o token ao serviço da equipe, sem Redis e sem expor o portal', async ({
  page
}) => {
  const card = page.locator('#case-rpa-oidc');
  const diagrama = card.locator('.architecture-diagram');
  await diagrama.scrollIntoViewIfNeeded();

  await expect(card.locator('.status')).toHaveText('Entregue');
  await expect(card.locator('.status')).toHaveClass(/status--done/);
  await expect(card).toContainText('Power Automate Desktop');
  await expect(card).not.toContainText('Redis');
  await expect(card).toContainText('serviço de tokens de outra equipe');
  await expect(card.locator('a')).toHaveCount(0);

  const servico = diagrama.locator('.diagram-node--external').first();
  await expect(servico).toContainText('Serviço de tokens de outra equipe');
  await expect(servico.locator('img')).toHaveCount(0);
  await expect(servico.locator('> .diagram-node__head .diagram-icon--cloud')).toHaveCount(1);
  await expect(diagrama.locator('img[src*="PowerAutomate_scalable.svg"]')).toHaveCount(1);
  await expect(diagrama).toContainText('Disparo manual');
  await expect(diagrama).toContainText('Log por execução');
  await expect(diagrama).toContainText('Segredo em variável sensível');
  await expect(diagrama).toContainText('localStorage');
  await expect(diagrama.locator('.diagram-call')).toHaveCount(10);
  await expect(diagrama.locator('.diagram-call--accent')).toContainText(
    'OTP preenchido após o desafio'
  );
  await expect(diagrama.locator('.diagram-band').nth(0).locator('li')).toHaveCount(3);
  await expect(diagrama.locator('.diagram-band').nth(1).locator('li')).toHaveCount(3);
  await expect(diagrama.locator('.diagram-legend')).toContainText('HTTP');
  await expect(diagrama.locator('.diagram-legend')).toContainText('Navegador');
});

test('cada case traz decisões técnicas e resultado', async ({ page }) => {
  // Blocos que respondem ao que um avaliador pergunta: por que assim, e deu
  // em quê. Papel e aprendizados são opcionais; decisões e resultado, não.
  const cards = page.locator('.case-card');
  const total = await cards.count();
  for (let i = 0; i < total; i++) {
    const fatos = cards.nth(i).locator('.case-facts');
    await expect(fatos, `case ${i} sem bloco de fatos`).toHaveCount(1);
    // Fatos um nível abaixo do título do case: h5 (case em h4) ou, na sessão
    // Power Platform, h6 (case em h5, sob o bloco "Projetos documentados").
    await expect(fatos.locator(':is(h5, h6)', { hasText: 'Decisões técnicas' })).toHaveCount(1);
    await expect(fatos.locator(':is(h5, h6)', { hasText: 'Resultado' })).toHaveCount(1);
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

for (const idioma of IDIOMAS) {
  test(`nenhum erro de console na carga, ${idioma.lang}`, async ({ page }) => {
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
    await page.goto(idioma.caminho, { waitUntil: 'networkidle' });
    expect(erros).toEqual([]);
  });

  test(`não há rolagem horizontal, ${idioma.lang}`, async ({ page }) => {
    await page.goto(idioma.caminho);
    // Em cada aba da seção Cases: cada uma muda o conteúdo da página.
    await emCadaAba(page, async (painel) => {
      const estourou = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(estourou, `a página não deve rolar na horizontal (aba ${painel})`).toBe(false);
    });
  });
}

/**
 * Aberto direto do disco (file://) o site precisa aparecer inteiro. Duas
 * armadilhas já pegaram aqui: caminho /assets/ absoluto (aponta para a raiz
 * do drive; o build agora o reescreve como relativo) e ícone por máscara CSS
 * (o Chromium bloqueia mask: url() em file://, origem opaca). Por isso o teste
 * confere a RENDERIZAÇÃO — <use> apontando para um <symbol> com desenho na
 * própria página, imagem decodificada depois de rolar até cada figura — e não
 * só se a URL existe.
 */
for (const { codigo: pagina, arquivo } of IDIOMAS) {
  test(`aberto do disco (file://), ${pagina}: ícones, imagens e fonte aparecem`, async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'independe da largura');
    await page.goto(new URL(`../${arquivo}`, import.meta.url).href);

    const icones = await page.evaluate(() => {
      const todos = [...document.querySelectorAll('.diagram-icon')];
      const ruins = todos
        .filter((icone) => {
          const use = icone.querySelector('use');
          const id = use?.getAttribute('href')?.replace(/^#/, '');
          const simbolo = id && document.getElementById(id);
          return !(simbolo?.tagName === 'symbol' && simbolo.querySelector('path'));
        })
        .map((icone) => icone.getAttribute('class'));
      return { total: todos.length, ruins };
    });
    expect(icones.total).toBeGreaterThan(0);
    expect(icones.ruins).toEqual([]);

    // As imagens dos diagramas são lazy: rola até cada figura e espera a carga,
    // aba por aba (só a aba aberta fica visível).
    await emCadaAba(page, async () => {
      for (const figura of await page.locator('figure:visible').all()) {
        await figura.scrollIntoViewIfNeeded();
        await figura.evaluate((f) =>
          Promise.all([...f.querySelectorAll('img')].map((i) => i.decode().catch(() => {})))
        );
      }
    });
    const quebradas = await page.evaluate(() =>
      [...document.querySelectorAll('figure img')]
        .filter((i) => !i.complete || i.naturalWidth === 0)
        .map((i) => i.getAttribute('src'))
    );
    expect(quebradas).toEqual([]);

    const fonte = await page.evaluate(() =>
      document.fonts
        .load('600 16px "Mona Sans"')
        .then((faces) => faces.length > 0 && faces.every((f) => f.status === 'loaded'))
        .catch(() => false)
    );
    expect(fonte).toBe(true);
  });
}

/**
 * Toda tag de Especialidades tem um ícone, e ele aparece de fato: logotipo
 * decodificado (naturalWidth maior que zero) ou <use> que resolve para um
 * <symbol> com desenho. Os logotipos são lazy, então rola até cada lista antes
 * de conferir. Sem este teste, um ícone sumido na tag passaria no CI.
 */
async function iconesDasTags(page) {
  for (const lista of await page.locator('#servicos .taglist').all()) {
    await lista.scrollIntoViewIfNeeded();
    await lista.evaluate((l) =>
      Promise.all([...l.querySelectorAll('img')].map((i) => i.decode().catch(() => {})))
    );
  }
  return page.evaluate(() => {
    const tags = [...document.querySelectorAll('#servicos .tag')];
    const ruins = tags
      .filter((tag) => {
        const icones = tag.querySelectorAll('.tag__icon');
        if (icones.length !== 1) return true;
        const [icone] = icones;
        if (icone.tagName === 'IMG') return !icone.complete || icone.naturalWidth === 0;
        const id = icone.querySelector('use')?.getAttribute('href')?.replace(/^#/, '');
        const simbolo = id && document.getElementById(id);
        return !(simbolo?.tagName === 'symbol' && simbolo.querySelector('path'));
      })
      .map((tag) => tag.textContent.trim());
    return { total: tags.length, ruins };
  });
}

for (const { codigo: pagina, caminho: rota, arquivo } of IDIOMAS) {
  test(`toda tag de Especialidades tem ícone renderizado, ${pagina}`, async ({ page }) => {
    await page.goto(rota);
    const { total, ruins } = await iconesDasTags(page);
    expect(total).toBeGreaterThan(0);
    expect(ruins, 'tags sem ícone ou com ícone quebrado').toEqual([]);
  });

  test(`aberto do disco (file://), ${pagina}: toda tag tem ícone renderizado`, async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'independe da largura');
    await page.goto(new URL(`../${arquivo}`, import.meta.url).href);
    const { total, ruins } = await iconesDasTags(page);
    expect(total).toBeGreaterThan(0);
    expect(ruins, 'tags sem ícone ou com ícone quebrado').toEqual([]);
  });
}
