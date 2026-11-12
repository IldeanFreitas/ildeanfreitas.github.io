import { test, expect } from '@playwright/test';
import { lerIdiomas, BASE } from '../scripts/idiomas.mjs';
import { COLECOES } from '../scripts/demos.mjs';
import cases from '../src/data/cases.json' with { type: 'json' };

/**
 * Os idiomas do site, todos a partir de src/idiomas.json: nenhum teste daqui
 * cita "pt" ou "en", com uma exceção declarada (REGRAS_DE_IDIOMA, no fim: as
 * letras que cada idioma não usa, uma entrada por código). Um idioma novo
 * entra nestes testes ao entrar na configuração.
 *
 * Cada idioma é outra página, gerada no build — não troca de strings no
 * cliente. O conteúdo precisa estar no HTML servido para o buscador e para
 * uso sem JavaScript.
 */
const IDIOMAS = lerIdiomas();
const PADRAO = IDIOMAS.find((idioma) => idioma.padrao);
const OUTROS = IDIOMAS.filter((idioma) => !idioma.padrao);

/**
 * As páginas de demonstração (uma por app de Power Apps e por painel de Power
 * BI), como caminho sem o idioma: "demos/power-apps/inspecao-via/". Cada uma
 * existe em todos os idiomas, na pasta de cada um.
 */
const DEMOS = Object.values(COLECOES).flatMap((col) =>
  col.dados.map((c) => `${col.demos}/${c.slug}/`)
);
/** Uma de cada coleção, para o que precisa de navegador e não muda de uma para outra. */
const AMOSTRA_DE_DEMOS = Object.values(COLECOES).map((col) => `${col.demos}/${col.dados[0].slug}/`);

/**
 * Com JavaScript a seção Cases mostra uma aba por vez. Para ler o texto de
 * todas (paridade, letra errada, português esquecido) os painéis escondidos
 * voltam a aparecer; os itens que a busca e os filtros esconderiam não
 * existem aqui, porque nada foi filtrado.
 */
const mostrarTodasAsAbas = (page) =>
  page.evaluate(() =>
    document.querySelectorAll('#cases [role="tabpanel"][hidden]').forEach((p) => (p.hidden = false))
  );

for (const idioma of IDIOMAS) {
  test(`a página ${idioma.lang} declara o idioma, o endereço e os outros idiomas`, async ({
    page
  }) => {
    await page.goto(idioma.caminho);
    await expect(page.locator('html')).toHaveAttribute('lang', idioma.lang);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', idioma.url);

    // hreflang recíproco: cada página aponta para todas (inclusive ela
    // mesma) e para o x-default, que é o idioma padrão.
    const alternativas = page.locator('link[rel="alternate"][hreflang]');
    await expect(alternativas).toHaveCount(IDIOMAS.length + 1);
    for (const outro of IDIOMAS)
      await expect(page.locator(`link[rel="alternate"][hreflang="${outro.lang}"]`)).toHaveAttribute(
        'href',
        outro.url
      );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      PADRAO.url
    );

    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      'content',
      idioma.ogLocale
    );
    const alternados = await page
      .locator('meta[property="og:locale:alternate"]')
      .evaluateAll((ms) => ms.map((m) => m.getAttribute('content')));
    expect(alternados).toEqual(
      IDIOMAS.filter((outro) => outro !== idioma).map((outro) => outro.ogLocale)
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', idioma.url);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      BASE + idioma.ogImagem
    );

    await expect(page.locator('.case-card')).toHaveCount(cases.length);
    // O rótulo do menu compacto vem do HTML de cada idioma (data-abrir).
    const navToggle = page.locator('#navToggle');
    await expect(navToggle).toHaveText((await navToggle.getAttribute('data-abrir')) ?? '');

    // Menu: todos os idiomas, na ordem da configuração, nome no próprio
    // idioma, e só o atual com aria-current.
    const links = page.locator('#idiomas .idiomas__link');
    await expect(links).toHaveCount(IDIOMAS.length);
    for (const [i, outro] of IDIOMAS.entries()) {
      const link = links.nth(i);
      await expect(link).toHaveAttribute('href', outro.caminho);
      await expect(link).toHaveAttribute('hreflang', outro.lang);
      await expect(link).toHaveAttribute('lang', outro.lang);
      await expect(link).toHaveText(outro.rotulo);
      if (outro === idioma) await expect(link).toHaveAttribute('aria-current', 'page');
      else await expect(link).not.toHaveAttribute('aria-current');
    }
    // O botão mostra a sigla do idioma atual, e o nome acessível começa por
    // ela (quem comanda por voz diz o que vê) e não leva travessão.
    const botao = page.locator('#idiomas > summary');
    await expect(botao).toHaveText(new RegExp(`^${idioma.sigla}\\b`));
    const nome = (await botao.textContent()).trim();
    expect(nome.startsWith(idioma.sigla), nome).toBe(true);
    expect(nome, 'nome acessível com travessão').not.toMatch(/[—–]/);

    // Rodapé: um link para cada um dos outros idiomas, nenhum para si.
    const rodape = page.locator('.site-footer a[hreflang]');
    await expect(rodape).toHaveCount(IDIOMAS.length - 1);
    for (const outro of IDIOMAS.filter((o) => o !== idioma)) {
      const link = page.locator(`.site-footer a[hreflang="${outro.lang}"]`);
      await expect(link).toHaveAttribute('href', outro.caminho);
      await expect(link).toHaveAttribute('lang', outro.lang);
      await expect(link).toHaveText(outro.rotulo);
    }
  });
}

/**
 * Páginas de app e de painel (scripts/mockups.mjs): reaproveitam o cabeçalho
 * e o rodapé da home do idioma, e o menu de idiomas de cada uma leva à MESMA
 * página nos outros idiomas, não à home. Canonical e hreflang seguem a mesma
 * regra da home. Lido do HTML servido (sem navegador), para cobrir todas.
 */
test('toda página de app e de painel aponta para ela mesma em cada idioma: canonical, hreflang, menu e rodapé', async ({
  request
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'independe da largura');
  expect(DEMOS.length).toBeGreaterThan(0);
  const problemas = [];
  for (const caminho of DEMOS)
    for (const idioma of IDIOMAS) {
      const url = `${idioma.caminho}${caminho}`;
      const resposta = await request.get(url);
      if (!resposta.ok()) {
        problemas.push(`${url}: resposta ${resposta.status()}`);
        continue;
      }
      const html = await resposta.text();
      const head = html.slice(0, html.indexOf('</head>'));
      const tem = (trecho, onde, oQue) => {
        if (!onde.includes(trecho)) problemas.push(`${url}: ${oQue} (esperado ${trecho})`);
      };
      tem(`<html lang="${idioma.lang}"`, html, 'lang da página');
      tem(`<link rel="canonical" href="${idioma.url}${caminho}">`, head, 'canonical');
      for (const outro of IDIOMAS)
        tem(
          `<link rel="alternate" hreflang="${outro.lang}" href="${outro.url}${caminho}">`,
          head,
          `hreflang ${outro.lang}`
        );
      tem(
        `<link rel="alternate" hreflang="x-default" href="${PADRAO.url}${caminho}">`,
        head,
        'x-default'
      );
      const alternativas = head.match(/<link rel="alternate" hreflang=/g) ?? [];
      if (alternativas.length !== IDIOMAS.length + 1)
        problemas.push(`${url}: ${alternativas.length} hreflang, esperados ${IDIOMAS.length + 1}`);
      if (/<meta name="robots" content="noindex">/.test(head))
        problemas.push(`${url}: página de demonstração com noindex`);

      // Menu: um link por idioma, na ordem da configuração, só o atual marcado.
      const menu = html.match(/<details class="idiomas"[\s\S]*?<\/details>/)?.[0] ?? '';
      const doMenu = [...menu.matchAll(/<a class="idiomas__link"([^>]*)>([^<]*)<\/a>/g)];
      if (doMenu.length !== IDIOMAS.length)
        problemas.push(`${url}: ${doMenu.length} links no menu, esperados ${IDIOMAS.length}`);
      IDIOMAS.forEach((outro, i) => {
        const atributos = doMenu[i]?.[1] ?? '';
        const esperado = ` href="${outro.caminho}${caminho}" hreflang="${outro.lang}" lang="${outro.lang}"`;
        if (!atributos.endsWith(esperado))
          problemas.push(`${url}: link ${i + 1} do menu com${atributos} (esperado${esperado})`);
        if (atributos.includes('aria-current="page"') !== (outro === idioma))
          problemas.push(`${url}: aria-current errado no link ${outro.lang} do menu`);
        if (doMenu[i]?.[2] !== outro.rotulo)
          problemas.push(`${url}: rótulo "${doMenu[i]?.[2]}" no menu, esperado "${outro.rotulo}"`);
      });

      // Rodapé: um link para cada outro idioma, para a mesma página.
      const rodape = html.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0] ?? '';
      const doRodape = [...rodape.matchAll(/<a href="([^"]*)" hreflang="([^"]*)"/g)].map(
        (m) => `${m[2]} ${m[1]}`
      );
      const esperados = IDIOMAS.filter((outro) => outro !== idioma).map(
        (outro) => `${outro.lang} ${outro.caminho}${caminho}`
      );
      if (doRodape.join('|') !== esperados.join('|'))
        problemas.push(
          `${url}: rodapé com [${doRodape.join(', ')}], esperado [${esperados.join(', ')}]`
        );
    }
  expect(problemas, problemas.join('\n')).toEqual([]);
});

/**
 * Redirecionamento das antigas galerias e player em tela cheia: noindex, sem
 * hreflang (não são indexados), no idioma da pasta e levando a páginas do
 * mesmo idioma.
 */
test('redirecionamento e player de cada idioma ficam no próprio idioma, sem hreflang', async ({
  request
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'independe da largura');
  const problemas = [];
  for (const idioma of IDIOMAS) {
    for (const col of Object.values(COLECOES)) {
      const paginas = [
        {
          url: `${idioma.caminho}${col.demos}/`,
          leva: `<a href="${idioma.caminho}${col.secao}">`,
          extra: `<link rel="canonical" href="${idioma.url}">`
        },
        ...col.dados.map((c) => ({
          url: `${idioma.caminho}${col.demos}/${c.slug}/tela-cheia/`,
          leva: `<a class="voltar" href="${idioma.caminho}${col.demos}/${c.slug}/">`
        }))
      ];
      for (const { url, leva, extra } of paginas) {
        const resposta = await request.get(url);
        if (!resposta.ok()) {
          problemas.push(`${url}: resposta ${resposta.status()}`);
          continue;
        }
        const html = await resposta.text();
        for (const trecho of [
          `<html lang="${idioma.lang}"`,
          '<meta name="robots" content="noindex">',
          leva,
          ...(extra ? [extra] : [])
        ])
          if (!html.includes(trecho)) problemas.push(`${url}: falta ${trecho}`);
        if (/hreflang=/.test(html)) problemas.push(`${url}: hreflang em página noindex`);
      }
    }
  }
  expect(problemas, problemas.join('\n')).toEqual([]);
});

for (const idioma of IDIOMAS) {
  test(`nas páginas de app e de painel de ${idioma.lang}, o menu abre e leva à mesma página em cada idioma`, async ({
    page
  }) => {
    for (const caminho of AMOSTRA_DE_DEMOS) {
      const url = `${idioma.caminho}${caminho}`;
      for (const destino of IDIOMAS) {
        await page.goto(url);
        const menu = page.locator('#idiomas');
        await expect(menu.locator('summary'), url).toHaveText(new RegExp(`^${idioma.sigla}\\b`));
        await menu.locator('summary').click();
        const painel = menu.locator('.idiomas__lista');
        await expect(painel, url).toBeVisible();
        // O painel cabe na tela também aqui (mesmo cabeçalho da home).
        const medida = await painel.evaluate((p) => {
          const r = p.getBoundingClientRect();
          return {
            esquerda: r.left,
            direita: r.right,
            largura: document.documentElement.clientWidth,
            rolagem: document.documentElement.scrollWidth
          };
        });
        expect(medida.esquerda, `${url}: painel sai pela esquerda`).toBeGreaterThanOrEqual(0);
        expect(medida.direita, `${url}: painel sai pela direita`).toBeLessThanOrEqual(
          medida.largura
        );
        expect(medida.rolagem, `${url}: rolagem lateral`).toBeLessThanOrEqual(medida.largura + 1);
        // Esc fecha e devolve o foco: o script do menu roda nestas páginas.
        await page.keyboard.press('Escape');
        await expect(menu, url).not.toHaveAttribute('open');
        await menu.locator('summary').click();
        await menu.locator(`.idiomas__link[hreflang="${destino.lang}"]`).click();
        await expect(page).toHaveURL(new URL(`${destino.caminho}${caminho}`, page.url()).href);
        await expect(page.locator('html')).toHaveAttribute('lang', destino.lang);
        await expect(page.locator('h1')).toHaveCount(1);
      }
    }
  });
}

test('a 404 leva a cada idioma que não é o padrão', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.locator('html')).toHaveAttribute('lang', PADRAO.lang);
  const links = page.locator('a[hreflang]');
  await expect(links).toHaveCount(OUTROS.length);
  for (const [i, idioma] of OUTROS.entries()) {
    await expect(links.nth(i)).toHaveAttribute('href', idioma.caminho);
    await expect(links.nth(i)).toHaveAttribute('lang', idioma.lang);
    await expect(links.nth(i)).toHaveText(idioma.rotulo);
  }
});

test.describe('menu de idiomas', () => {
  const aberto = (menu) => expect(menu).toHaveAttribute('open');
  const fechado = (menu) => expect(menu).not.toHaveAttribute('open');

  test('abre por clique e fecha com clique fora', async ({ page }) => {
    await page.goto('/');
    const menu = page.locator('#idiomas');
    await fechado(menu);
    await expect(menu.locator('.idiomas__link').first()).toBeHidden();
    await menu.locator('summary').click();
    await aberto(menu);
    await expect(menu.locator('.idiomas__link').first()).toBeVisible();
    await page.locator('h1').click();
    await fechado(menu);
  });

  test('teclado: Enter e Espaço abrem, Esc fecha e devolve o foco', async ({ page }) => {
    await page.goto('/');
    const menu = page.locator('#idiomas');
    const botao = menu.locator('summary');
    const links = menu.locator('.idiomas__link');

    await botao.focus();
    await page.keyboard.press('Enter');
    await aberto(menu);
    await page.keyboard.press('Tab');
    await expect(links.first()).toBeFocused();
    await page.keyboard.press('Escape');
    await fechado(menu);
    await expect(botao).toBeFocused();

    await page.keyboard.press('Space');
    await aberto(menu);
    await page.keyboard.press('Escape');
    await fechado(menu);
    await expect(botao).toBeFocused();
  });

  test('fecha quando o foco sai dele, para não cobrir o elemento focado', async ({ page }) => {
    await page.goto('/');
    const menu = page.locator('#idiomas');
    await menu.locator('summary').focus();
    await page.keyboard.press('Enter');
    await aberto(menu);
    // Percorre os links e sai pelo último.
    for (let i = 0; i < IDIOMAS.length; i++) await page.keyboard.press('Tab');
    await expect(menu.locator('.idiomas__link').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await fechado(menu);
  });

  test('o painel fica dentro da tela, com linhas de pelo menos 24px e sem rolagem lateral', async ({
    page
  }) => {
    for (const idioma of IDIOMAS) {
      await page.goto(idioma.caminho);
      await page.locator('#idiomas > summary').click();
      const painel = page.locator('#idiomas .idiomas__lista');
      await expect(painel).toBeVisible();
      const medida = await painel.evaluate((p) => {
        const r = p.getBoundingClientRect();
        const linhas = [...p.querySelectorAll('.idiomas__link')].map((a) => {
          const l = a.getBoundingClientRect();
          return { w: l.width, h: l.height };
        });
        return {
          esquerda: r.left,
          direita: r.right,
          largura: document.documentElement.clientWidth,
          rolagem: document.documentElement.scrollWidth,
          linhas
        };
      });
      expect(medida.esquerda, `${idioma.codigo}: painel sai pela esquerda`).toBeGreaterThanOrEqual(
        0
      );
      expect(medida.direita, `${idioma.codigo}: painel sai pela direita`).toBeLessThanOrEqual(
        medida.largura
      );
      expect(medida.rolagem, `${idioma.codigo}: rolagem lateral`).toBeLessThanOrEqual(
        medida.largura + 1
      );
      for (const linha of medida.linhas) {
        expect(linha.h).toBeGreaterThanOrEqual(24);
        expect(linha.w).toBeGreaterThanOrEqual(24);
      }
    }
  });

  /**
   * O painel nasce alinhado à direita do botão e cresce para a esquerda; o
   * espaço que ele tem é o que sobra entre a margem da página e o botão. Um
   * rótulo longo ("Español (América Latina)", um nome de variante regional)
   * precisa quebrar em linhas, não sair da tela nem ser cortado. O DOM é
   * alimentado aqui, no navegador: nenhum idioma de verdade tem rótulo assim
   * ainda, e o teste deve valer quando tiver.
   */
  test('rótulos longos quebram em linhas: o painel fica dentro da tela e nenhum texto é cortado, a 320 e 375px', async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'define a própria largura');
    const rotulos = [
      'Português',
      'English',
      'Español (América Latina)',
      'Variante regional do idioma com nome bem', // 40 caracteres
      `Idioma${'x'.repeat(34)}` // 40 caracteres, sem um espaço onde quebrar
    ];
    for (const largura of [320, 375])
      for (const idioma of IDIOMAS) {
        await page.setViewportSize({ width: largura, height: 700 });
        await page.goto(idioma.caminho);
        await page.evaluate((nomes) => {
          const lista = document.querySelector('#idiomas .idiomas__lista');
          lista.replaceChildren(
            ...nomes.map((nome, i) => {
              const li = document.createElement('li');
              const a = document.createElement('a');
              a.className = 'idiomas__link';
              a.href = `/rotulo-${i}/`;
              a.textContent = nome;
              li.append(a);
              return li;
            })
          );
        }, rotulos);
        await page.locator('#idiomas > summary').click();
        const medida = await page.evaluate(() => {
          const painel = document.querySelector('#idiomas .idiomas__lista').getBoundingClientRect();
          return {
            esquerda: painel.left,
            direita: painel.right,
            largura: document.documentElement.clientWidth,
            rolagem: document.documentElement.scrollWidth,
            linhas: [...document.querySelectorAll('#idiomas .idiomas__link')].map((a) => {
              const r = a.getBoundingClientRect();
              return {
                texto: a.textContent,
                esquerda: r.left,
                direita: r.right,
                cortado: a.scrollWidth > a.clientWidth + 1
              };
            })
          };
        });
        const onde = `${idioma.codigo} a ${largura}px`;
        expect(medida.esquerda, `${onde}: painel sai pela esquerda`).toBeGreaterThanOrEqual(0);
        expect(medida.direita, `${onde}: painel sai pela direita`).toBeLessThanOrEqual(
          medida.largura
        );
        expect(medida.rolagem, `${onde}: rolagem lateral`).toBeLessThanOrEqual(medida.largura + 1);
        expect(medida.linhas).toHaveLength(rotulos.length);
        for (const linha of medida.linhas) {
          expect(linha.cortado, `${onde}: "${linha.texto}" cortado`).toBe(false);
          expect(linha.esquerda, `${onde}: "${linha.texto}" fora do painel`).toBeGreaterThanOrEqual(
            medida.esquerda - 0.5
          );
          expect(linha.direita, `${onde}: "${linha.texto}" fora do painel`).toBeLessThanOrEqual(
            medida.direita + 0.5
          );
        }
      }
  });

  test('o botão anuncia o estado expandido na árvore de acessibilidade, fechado e aberto', async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'independe da largura');
    // O <summary> vira um nó DisclosureTriangle no Chromium, com a propriedade
    // "expanded": é o que um leitor de tela recebe, sem aria-expanded escrito.
    const cdp = await page.context().newCDPSession(page);
    for (const idioma of IDIOMAS) {
      await page.goto(idioma.caminho);
      const expandido = async () => {
        const { nodes } = await cdp.send('Accessibility.getFullAXTree');
        const botao = nodes.find(
          (no) => no.role?.value === 'DisclosureTriangle' && no.name?.value.startsWith(idioma.sigla)
        );
        expect(
          botao,
          `${idioma.codigo}: botão do menu fora da árvore de acessibilidade`
        ).toBeTruthy();
        return botao.properties?.find((p) => p.name === 'expanded')?.value.value;
      };
      await expect.poll(expandido, { message: `${idioma.codigo}: fechado` }).toBe(false);
      await page.locator('#idiomas > summary').click();
      await expect.poll(expandido, { message: `${idioma.codigo}: aberto` }).toBe(true);
      await page.keyboard.press('Escape');
      await expect.poll(expandido, { message: `${idioma.codigo}: fechado de novo` }).toBe(false);
    }
    await cdp.detach();
  });

  for (const idioma of IDIOMAS) {
    test(`sem o menu de idiomas, o resto da página de ${idioma.lang} segue funcionando`, async ({
      page
    }, testInfo) => {
      // O script roda durante o parse, antes de DOMContentLoaded: a remoção
      // precisa estar no HTML servido (como no teste do rodapé, em
      // comportamento.spec.js). Cada funcionalidade é isolada em iniciar(), e
      // o menu compacto também olha para #idiomas; nenhuma pode depender dele.
      const erros = [];
      page.on('pageerror', (e) => erros.push(e.message));
      page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
      await page.route(
        (url) => url.pathname === idioma.caminho,
        async (route) => {
          const resposta = await route.fetch();
          const original = await resposta.text();
          const html = original.replace(/<details class="idiomas"[\s\S]*?<\/details>/, '');
          if (html === original)
            throw new Error('o menu de idiomas não foi achado no HTML servido');
          await route.fulfill({ response: resposta, body: html });
        }
      );
      await page.goto(idioma.caminho);
      await expect(page.locator('#idiomas')).toHaveCount(0);

      const html = page.locator('html');
      const inicial = await html.getAttribute('data-theme');
      await page.locator('#themeToggle').click();
      await expect(html).not.toHaveAttribute('data-theme', inicial ?? '');
      await expect(page.locator('#ano')).toHaveText(String(new Date().getFullYear()));

      if (testInfo.project.name !== 'desktop') {
        const navToggle = page.locator('#navToggle');
        await navToggle.click();
        await expect(page.locator('#nav')).toHaveAttribute('data-open', 'true');
        await expect(navToggle).toHaveAttribute('aria-expanded', 'true');
        await page.keyboard.press('Escape');
        await expect(page.locator('#nav')).toHaveAttribute('data-open', 'false');
        await expect(navToggle).toBeFocused();
      }
      expect(erros).toEqual([]);
    });
  }

  test('um painel por vez: o menu de idiomas e o menu compacto se fecham', async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'o menu compacto não aparece em desktop');
    await page.goto('/');
    const menu = page.locator('#idiomas');
    const navToggle = page.locator('#navToggle');

    await navToggle.click();
    await expect(page.locator('#nav')).toHaveAttribute('data-open', 'true');
    await menu.locator('summary').click();
    await aberto(menu);
    await expect(page.locator('#nav')).toHaveAttribute('data-open', 'false');
    await expect(navToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(navToggle).toHaveText((await navToggle.getAttribute('data-abrir')) ?? '');

    await navToggle.click();
    await expect(page.locator('#nav')).toHaveAttribute('data-open', 'true');
    await fechado(menu);
  });

  for (const origem of IDIOMAS) {
    test(`de ${origem.lang}, cada link leva à página do idioma`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'independe da largura');
      for (const destino of IDIOMAS) {
        await page.goto(origem.caminho);
        await page.locator('#idiomas > summary').click();
        await page.locator(`#idiomas .idiomas__link[hreflang="${destino.lang}"]`).click();
        await expect(page).toHaveURL(new URL(destino.caminho, page.url()).href);
        await expect(page.locator('html')).toHaveAttribute('lang', destino.lang);
      }
    });
  }
});

/**
 * Paridade de conteúdo entre o PT-BR (fonte da verdade) e cada idioma.
 *
 * O build compara o esqueleto da marcação; o conteúdo, não. Este teste pega
 * o que uma tradução costuma perder ou inventar: número, link e item de
 * lista. Normalizações, cada uma com o motivo:
 *
 * - Números: o separador sai ("10.000", "10,000" e "1,5" × "1.5" viram
 *   dígitos corridos), porque cada idioma escreve milhar e decimal à sua
 *   maneira. O valor e a quantidade de números têm de bater.
 * - Milhar por extenso: "10 mil" (PT, ES), "10k" e "10 thousand" (EN) viram
 *   10000 antes da extração. O PT-BR diz "mais de 10 mil colaboradores" e o
 *   EN "more than 10,000 employees": mesmo número, notação de cada idioma.
 *   Só vale para inteiro ("1,5 mil" sairia errado; não existe no site).
 * - Links: o Microsoft Learn serve a verificação da credencial no idioma do
 *   visitante, com a localidade no caminho (/pt-br/ × /en-us/); o segmento
 *   de localidade é trocado por um marcador antes de comparar.
 * - Abas: com JavaScript a seção Cases mostra uma por vez. Os painéis
 *   escondidos são abertos antes da leitura, para o texto das quatro abas
 *   (apps, painéis e cases) entrar nos números.
 * - Nota de idioma das demonstrações (.mock-nota): existe só fora do idioma
 *   padrão e fica fora da contagem de parágrafos.
 */
const normalizarLink = (href) =>
  href.replace(/^(https:\/\/learn\.microsoft\.com\/.*?\/)[a-z]{2}-[a-z]{2}\//, '$1{localidade}/');

async function retrato(page, caminho) {
  await page.goto(caminho);
  await mostrarTodasAsAbas(page);
  return page.evaluate(() => {
    const conta = (seletor) => document.querySelectorAll(seletor).length;
    return {
      numeros: (
        document.body.innerText
          .replace(/\b(\d+)\s?(?:mil|k|thousand)\b/gi, '$1000')
          .match(/\d+(?:[.,]\d+)*/g) || []
      )
        .map((n) => n.replace(/[.,]/g, ''))
        .sort(),
      links: [...document.querySelectorAll('a[href^="http"]')].map((a) => a.href),
      secoes: [...document.querySelectorAll('main section')].map((s) => s.id),
      cases: [...document.querySelectorAll('.case-card')].map((c) => c.id),
      contagens: {
        secoes: conta('main section'),
        h2: conta('h2'),
        h3: conta('h3'),
        h4: conta('h4'),
        cases: conta('.case-card'),
        // Demonstrações: os cartões de app e de painel das abas (na home) e os
        // passos do roteiro (na página de cada um).
        demos: conta('.mock-card'),
        passos: conta('.mock-passos > li'),
        tags: conta('.tag'),
        trajetoria: conta('#trajetoria .timeline > li'),
        formacao: conta('#formacao li'),
        // A nota "os apps estão em português" (.mock-nota) só existe fora do
        // idioma padrão, por decisão: não é parágrafo esquecido nem inventado.
        paragrafos: conta('main p:not(.mock-nota)'),
        itens: conta('main li')
      }
    };
  });
}

/** Multiconjunto: o que um lado tem a mais que o outro, com repetição. */
function sobra(a, b) {
  const resto = [...b];
  return a.filter((x) => {
    const i = resto.indexOf(x);
    if (i < 0) return true;
    resto.splice(i, 1);
    return false;
  });
}

for (const idioma of OUTROS) {
  test(`paridade de conteúdo ${PADRAO.lang} × ${idioma.lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'independe da largura');
    const fonte = await retrato(page, PADRAO.caminho);
    const traducao = await retrato(page, idioma.caminho);

    expect.soft(traducao.secoes, 'seções diferentes ou fora de ordem').toEqual(fonte.secoes);
    expect.soft(traducao.cases, 'cases diferentes ou fora de ordem').toEqual(fonte.cases);
    expect.soft(traducao.contagens).toEqual(fonte.contagens);
    expect
      .soft(traducao.links.map(normalizarLink), 'links externos diferentes')
      .toEqual(fonte.links.map(normalizarLink));
    const faltam = sobra(fonte.numeros, traducao.numeros);
    const sobram = sobra(traducao.numeros, fonte.numeros);
    expect
      .soft(
        { faltam, sobram },
        `números de ${PADRAO.lang} ausentes em ${idioma.lang}: ${faltam.join(', ') || 'nenhum'}; a mais: ${sobram.join(', ') || 'nenhum'}`
      )
      .toEqual({ faltam: [], sobram: [] });
  });

  test(`paridade das páginas de app e de painel ${PADRAO.lang} × ${idioma.lang}`, async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'independe da largura');
    test.slow();
    // As mesmas contagens, links e números da home, página por página. O
    // roteiro de cada idioma cita os mesmos passos, na mesma quantidade.
    for (const caminho of DEMOS) {
      const fonte = await retrato(page, `${PADRAO.caminho}${caminho}`);
      const traducao = await retrato(page, `${idioma.caminho}${caminho}`);
      expect.soft(traducao.contagens, caminho).toEqual(fonte.contagens);
      expect
        .soft(traducao.links.map(normalizarLink), `${caminho}: links externos diferentes`)
        .toEqual(fonte.links.map(normalizarLink));
      const faltam = sobra(fonte.numeros, traducao.numeros);
      const sobram = sobra(traducao.numeros, fonte.numeros);
      expect
        .soft({ faltam, sobram }, `${caminho}: números diferentes de ${PADRAO.lang}`)
        .toEqual({ faltam: [], sobram: [] });
    }
  });
}

/**
 * Letras do idioma errado e português esquecido nas páginas traduzidas.
 *
 * O erro mais comum de uma tradução é sobrar texto em português: um aria-label,
 * um alt, uma frase de case. O build não vê (só compara o esqueleto) e a
 * paridade acima só conta números e links. Três verificações, em cada idioma
 * que não é o padrão, sobre o texto visível e o que a página declara fora da
 * tela (alt, aria-label, title, data-abrir/data-fechar, <title>, descrições e
 * JSON-LD):
 *
 * 1. letras que o idioma não usa (ã em inglês, ç em espanhol);
 * 2. palavras-função do PT-BR (não, você, "para o", "de uma"), acima de um
 *    piso (`maximo`, 2 por padrão) para sobrar espaço a um nome próprio;
 * 3. frase idêntica à da página do PT-BR: trecho com três ou mais palavras
 *    minúsculas de três letras ou mais. Nome de tecnologia, sigla e título de
 *    credencial não têm isso e passam; um parágrafo esquecido tem.
 *
 * O teste lê a home de cada idioma com as quatro abas da seção Cases abertas
 * (apps e painéis de demonstração inclusive). Não lê os app.html nem as
 * páginas de app e de painel: os mockups são em português por decisão (a
 * página avisa: "The demo apps are in Portuguese.") e o roteiro de cada
 * página cita os rótulos do app em português, com a tradução entre parênteses.
 *
 * Fora da conta, de propósito: elementos com `lang` próprio (os nomes dos
 * idiomas no menu e no rodapé, cada um no seu idioma), `code`, SVG e o que
 * não é letra (· – — ↗ ©). Nome próprio no meio de uma frase (capitalizado e
 * precedido por outra palavra do mesmo trecho: cidade, escola, produto) não
 * conta como letra errada; no início do trecho, só o que estiver em `lugares`.
 * Cabeçalho esquecido ("Formação" sozinho) continua sendo pego.
 *
 * REGRAS_DE_IDIOMA é a tabela que cada idioma novo precisa preencher, uma
 * entrada por `codigo` de src/idiomas.json. Sem entrada, o teste falha dizendo
 * o que escrever.
 *
 *   letras     RegExp das letras que o idioma não usa (obrigatório)
 *   lugares    topônimos aceitos como estão, mesmo no início do trecho
 *   portugues  true se o idioma é uma variante do português: as verificações 2
 *              e 3 não se aplicam (o texto É português); troque-as por
 *              vocabulário só do Brasil quando a variante entrar
 *   maximo     piso da verificação 2 (padrão 2)
 *
 * Exemplos para os próximos: es -> { letras: /[ãõçâêôà]/i } ;
 * pt-pt -> { letras: /ñ/i, portugues: true }.
 */
const REGRAS_DE_IDIOMA = {
  // Inglês não usa nenhuma letra acentuada.
  en: { letras: /[À-ÖØ-öø-ÿ]/, lugares: ['Marabá', 'Pará', 'Brasília'] }
};

const PALAVRAS_DO_PT_BR =
  /(?<!\p{L})(?:não|você|vocês|também|estão|uma|pelo|pela|isso|ainda|onde|para o|para a|de uma|em uma|com o|com a)(?!\p{L})/giu;

/** Todo o texto de uma página que um leitor (ou um buscador) recebe. */
async function trechosDaPagina(page, caminho) {
  await page.goto(caminho);
  await mostrarTodasAsAbas(page);
  return page.evaluate(() => {
    const saida = [];
    const juntar = (onde, texto) => {
      const limpo = (texto ?? '').replace(/\s+/g, ' ').trim();
      if (limpo) saida.push({ onde, texto: limpo });
    };
    const ignorar = '[lang]:not(html), code, script, style, noscript, svg, template';
    const andador = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (andador.nextNode()) {
      const no = andador.currentNode;
      const pai = no.parentElement;
      if (!pai || pai.closest(ignorar) || !pai.checkVisibility()) continue;
      juntar(`<${pai.tagName.toLowerCase()}>`, no.textContent);
    }
    const atributos = ['alt', 'aria-label', 'title', 'data-abrir', 'data-fechar'];
    for (const el of document.querySelectorAll(atributos.map((a) => `[${a}]`).join(',')))
      for (const a of atributos) juntar(`[${a}]`, el.getAttribute(a));
    juntar('<title>', document.title);
    const metas =
      'meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[property="og:image:alt"]';
    for (const meta of document.querySelectorAll(metas))
      juntar(`meta ${meta.getAttribute('name') ?? meta.getAttribute('property')}`, meta.content);
    // As páginas de app e de painel não têm JSON-LD.
    const bloco = document.querySelector('script[type="application/ld+json"]');
    const ld = bloco ? JSON.parse(bloco.textContent) : {};
    for (const campo of ['jobTitle', 'description']) juntar(`JSON-LD ${campo}`, ld[campo]);
    for (const item of ld.knowsAbout ?? []) juntar('JSON-LD knowsAbout', item);
    return saida;
  });
}

/** O que há de errado no texto de um idioma, em frases para a mensagem do teste. */
function problemasDeIdioma(trechos, referencia, regra) {
  const problemas = [];
  const lugares = new Set(regra.lugares ?? []);

  for (const { onde, texto } of trechos)
    for (const m of texto.matchAll(/[\p{L}'’]+/gu)) {
      const palavra = m[0];
      if (!regra.letras.test(palavra) || lugares.has(palavra)) continue;
      const nomeProprio = /^\p{Lu}/u.test(palavra) && /\p{L}/u.test(texto.slice(0, m.index));
      if (!nomeProprio)
        problemas.push(`letra de outro idioma em "${palavra}" (${onde}: "${texto.slice(0, 80)}")`);
    }

  if (!regra.portugues) {
    const achadas = trechos.flatMap(({ texto }) => texto.match(PALAVRAS_DO_PT_BR) ?? []);
    const maximo = regra.maximo ?? 2;
    if (achadas.length > maximo)
      problemas.push(
        `${achadas.length} palavras do PT-BR (piso ${maximo}): ${[...new Set(achadas)].join(', ')}`
      );

    const doPadrao = new Set(referencia.map(({ texto }) => texto));
    for (const { onde, texto } of trechos) {
      const minusculas = texto.split(/[^\p{L}]+/u).filter((p) => /^\p{Ll}{3,}$/u.test(p));
      if (minusculas.length >= 3 && doPadrao.has(texto))
        problemas.push(`frase igual à do PT-BR (${onde}): "${texto.slice(0, 80)}"`);
    }
  }
  return problemas;
}

test('o verificador de idioma acusa o que deve e deixa passar o que é nome próprio', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'independe da largura');
  const regra = { letras: /[À-ÖØ-öø-ÿ]/, lugares: ['Marabá'] };
  const referencia = [{ onde: '<p>', texto: 'gestão de dados para o time inteiro' }];
  const limpo = [
    // Nome próprio no meio da frase (organização fictícia e cidade) passa.
    { onde: '<p>', texto: 'Built with Ação Exemplo, in Brasília and Pará' },
    { onde: '<li>', texto: 'Marabá, Pará, Brazil' },
    { onde: '<span>', texto: 'Power Automate Desktop' }
  ];
  expect(problemasDeIdioma(limpo, referencia, { ...regra, lugares: ['Marabá', 'Pará'] })).toEqual(
    []
  );

  const sujo = [
    { onde: '<h2>', texto: 'Formação' },
    { onde: '<p>', texto: 'a gestão de dados para o time inteiro' },
    { onde: '<p>', texto: 'gestão de dados para o time inteiro' },
    { onde: '<p>', texto: 'Não use para o que você quiser, de uma vez' }
  ];
  const problemas = problemasDeIdioma(sujo, referencia, regra);
  expect(
    problemas.filter((p) => p.startsWith('letra de outro idioma')).length
  ).toBeGreaterThanOrEqual(3);
  expect(problemas.some((p) => p.includes('palavras do PT-BR'))).toBe(true);
  expect(problemas.some((p) => p.startsWith('frase igual à do PT-BR'))).toBe(true);
  // Variante do português: as duas verificações de PT-BR não se aplicam.
  expect(problemasDeIdioma(sujo, referencia, { ...regra, letras: /ñ/i, portugues: true })).toEqual(
    []
  );
});

for (const idioma of OUTROS) {
  test(`o texto de ${idioma.lang} não traz letras de outro idioma nem português do Brasil`, async ({
    page
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'independe da largura');
    const regra = REGRAS_DE_IDIOMA[idioma.codigo];
    if (!regra)
      throw new Error(
        `O idioma "${idioma.codigo}" não tem regra em REGRAS_DE_IDIOMA (tests/idiomas.spec.js). ` +
          'Acrescente { letras: /.../ } com as letras que ele NÃO usa (para es: /[ãõçâêôà]/i; ' +
          'para pt-pt: /ñ/i com portugues: true), mais lugares: [...] para os topônimos que a página cita.'
      );
    const referencia = await trechosDaPagina(page, PADRAO.caminho);
    const trechos = await trechosDaPagina(page, idioma.caminho);
    expect(trechos.length, `${idioma.codigo}: nenhum texto lido`).toBeGreaterThan(100);
    const problemas = problemasDeIdioma(trechos, referencia, regra);
    expect(problemas, problemas.join('\n')).toEqual([]);
  });
}
