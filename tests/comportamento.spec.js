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

test('os cases seguem a ordem editorial: dados primeiro', async ({ page }) => {
  const ids = await page.locator('.case-card').evaluateAll((els) => els.map((e) => e.id));
  expect(ids).toEqual([
    'case-dataops',
    'case-camara-lakehouse',
    'plataforma-dados-aws',
    'case-fiscal-orchestration',
    'case-rpa-oidc'
  ]);
});

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
  const pequenas = await page
    .locator('.architecture-diagram img.diagram-node__logo')
    .evaluateAll((imgs) =>
      imgs
        .map((i) => {
          i.scrollIntoView();
          const r = i.getBoundingClientRect();
          return { src: i.getAttribute('src'), w: r.width, h: r.height };
        })
        .filter((r) => Math.max(r.w, r.h) < 20)
        .map((r) => `${r.src} ${r.w.toFixed(1)}×${r.h.toFixed(1)}`)
    );
  expect(pequenas, pequenas.join('\n')).toEqual([]);
});

test('no celular o nó empilha: rótulo acima do título, uma coluna', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'só faz sentido na largura de celular');
  const erros = await page.locator('.architecture-diagram .diagram-node').evaluateAll((nos) =>
    nos
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
  expect(erros, erros.join('\n')).toEqual([]);
});

test('o bloco dbt do DataOps não estoura a largura no celular', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'só faz sentido na largura de celular');
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
