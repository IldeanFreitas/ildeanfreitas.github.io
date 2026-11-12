/**
 * Testes do gerador de cases (scripts/cases.mjs), sem navegador.
 *
 * Roda com o test runner nativo do Node (`node --test`), sem dependência nova.
 * A extensão .unit.mjs é deliberada: o Playwright recolhe *.spec.* e *.test.*
 * dentro de tests/, e este arquivo não é teste de página.
 *
 * O que se protege aqui é a regra "dado errado para o build": ícone ou marca
 * desconhecida e formato de diagrama inválido não podem mais cair num
 * fallback silencioso nem imprimir "undefined" na página.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  renderizarCases,
  ErroDeCase,
  MARCAS,
  SELOS,
  FLUENT,
  SEQ_MAX,
  AREAS,
  iconesDasAreas
} from '../../scripts/cases.mjs';
import { PAINEIS, TECNOLOGIAS, dados as APPS, tagsApp } from '../../scripts/demos.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const ler = (arquivo) => JSON.parse(readFileSync(RAIZ + arquivo, 'utf8'));
const PT = ler('src/data/cases.json');
const EN = ler('src/data/cases.en.json');

const doCase = (id, fonte = PT) => structuredClone(fonte.find((c) => c.id === id));

/** Espera que renderizar `caso` falhe com ErroDeCase cuja mensagem casa com `padroes`. */
function deveFalhar(caso, ...padroes) {
  assert.throws(
    () => renderizarCases([caso], 'pt'),
    (erro) => {
      assert.ok(erro instanceof ErroDeCase, `esperado ErroDeCase, veio ${erro && erro.name}`);
      for (const p of padroes) assert.match(erro.message, p);
      return true;
    }
  );
}

test('os dados publicados (PT e EN) renderizam sem erro', () => {
  assert.ok(renderizarCases(PT, 'pt').length > 0);
  assert.ok(renderizarCases(EN, 'en').length > 0);
});

test('todo selo usado nos dados é conhecido e tem regra CSS', () => {
  const css = readFileSync(RAIZ + 'src/css/componentes/cartoes.css', 'utf8');
  for (const c of [...PT, ...EN]) {
    assert.ok(SELOS.includes(c.status.variante), `${c.id}: ${c.status.variante}`);
    assert.ok(css.includes(`.status--${c.status.variante}{`), `sem CSS para ${c.status.variante}`);
  }
});

test('todo arquivo de marca registrado existe no disco', () => {
  for (const [nome, caminho] of Object.entries(MARCAS))
    assert.ok(existsSync(RAIZ + caminho), `${nome}: ${caminho}`);
});

test('todo ícone Fluent registrado existe no disco', () => {
  for (const nome of FLUENT) {
    const caminho = `assets/icons/neutral/fluent/${nome}.svg`;
    assert.ok(existsSync(RAIZ + caminho), caminho);
  }
});

test('ícone desconhecido falha com case, bloco e nome', () => {
  const c = doCase('case-fiscal-orchestration');
  c.diagrama.zonas[3].nos[0].icone = 'robo-inexistente';
  deveFalhar(c, /case-fiscal-orchestration/, /diagrama\.zonas\[3\]\.nos\[0\]/, /robo-inexistente/);
});

test('bloco sem marca nem ícone falha (sem fallback genérico)', () => {
  const c = doCase('case-camara-lakehouse');
  delete c.diagrama.zonas[0].nos[0].icone;
  deveFalhar(c, /diagrama\.zonas\[0\]\.nos\[0\]/, /sem ícone/);
});

test('item de faixa sem marca nem ícone falha', () => {
  const c = doCase('plataforma-dados-aws');
  delete c.diagrama.governanca.itens[0].produto;
  deveFalhar(c, /plataforma-dados-aws/, /diagrama\.governanca\.itens\[0\]/, /sem ícone/);
});

test('a forma "zonas" (herdada do AWS antigo) não existe mais', () => {
  const c = doCase('plataforma-dados-aws');
  c.diagrama.forma = 'zonas';
  deveFalhar(c, /forma desconhecida "zonas"/);
});

test('trilha com zona empilhada alinha os nós pelo topo; sem ela, não', () => {
  const html = (id) => renderizarCases([doCase(id)], 'pt');
  assert.match(html('plataforma-dados-aws'), /class="diagram-track diagram-track--topo"/);
  assert.doesNotMatch(html('case-camara-lakehouse'), /diagram-track--topo/);
});

test('ícone neutro desconhecido falha', () => {
  const c = doCase('case-dataops');
  c.diagrama.governanca.itens[1].icone = 'catalogo-errado';
  deveFalhar(
    c,
    /case-dataops/,
    /diagrama\.governanca\.itens\[1\]/,
    /ícone neutro desconhecido "catalogo-errado"/
  );
});

test('marca desconhecida falha', () => {
  const c = doCase('case-camara-lakehouse');
  c.diagrama.zonas[1].nos[0].produto = 'tableau';
  deveFalhar(
    c,
    /case-camara-lakehouse/,
    /diagrama\.zonas\[1\]\.nos\[0\]/,
    /marca desconhecida "tableau"/
  );
});

test('a marca vem do dado, não do título do bloco', () => {
  const c = doCase('case-dataops');
  c.diagrama.zonas[0].nos[0].titulo = 'Banco de origem';
  c.diagrama.zonas[2].nos[0].titulo = 'Camada bruta';
  const html = renderizarCases([c], 'pt');
  assert.match(html, /vendor\/postgresql\//);
  assert.match(html, /vendor\/snowflake\//);
});

test('forma de diagrama desconhecida falha', () => {
  const c = doCase('case-dataops');
  c.diagrama.forma = 'financial';
  deveFalhar(c, /case-dataops/, /forma desconhecida "financial"/);
});

test('diagrama com número errado de blocos falha', () => {
  const c = doCase('case-fiscal-orchestration');
  c.diagrama.retorno.nos.splice(1);
  deveFalhar(c, /diagrama\.retorno/, /esperados 2 a 4 itens, encontrados 1/);
});

test('campo de texto ausente falha em vez de imprimir "undefined"', () => {
  const c = doCase('case-camara-lakehouse');
  delete c.diagrama.zonas[2].nos[0].nota;
  deveFalhar(c, /diagrama\.zonas\[2\]\.nos\[0\]/, /campo "nota" ausente/);
});

test('diagrama com dois destaques lime falha', () => {
  const c = doCase('case-dataops');
  c.diagrama.zonas[3].nos[0].destaque = true;
  deveFalhar(c, /case-dataops/, /exatamente um destaque/, /encontrados 2/);
});

test('diagrama sem destaque falha', () => {
  const c = doCase('case-camara-lakehouse');
  delete c.diagrama.zonas[2].nos[1].etapas[0].destaque;
  deveFalhar(c, /exatamente um destaque/, /encontrados 0/);
});

test('zona com papel desconhecido falha', () => {
  const c = doCase('case-fiscal-orchestration');
  c.diagrama.zonas[0].papel = 'entrada';
  deveFalhar(c, /diagrama\.zonas\[0\]/, /papel desconhecido "entrada"/);
});

test('diagrama sem frase de legenda (figcaption) falha', () => {
  const c = doCase('case-rpa-oidc');
  delete c.diagrama.resumo;
  deveFalhar(c, /case-rpa-oidc/, /campo "resumo" ausente/);
});

test('todos os diagramas são animados (fora do .reveal)', () => {
  const html = renderizarCases(PT, 'pt');
  const figuras = [...html.matchAll(/<figure class="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(figuras.length, PT.length);
  figuras.forEach((classes, i) => {
    assert.match(classes, /\bdiagram-anima\b/, `figura ${i}`);
    // Dentro do fade do .reveal a sequência começava com a figura translúcida.
    assert.doesNotMatch(classes, /\breveal\b/, `figura ${i}`);
  });
});

test('case sem "area" falha', () => {
  const c = doCase('case-dataops');
  delete c.area;
  deveFalhar(c, /case-dataops/, /campo "area" ausente/);
});

test('case com "area" desconhecida falha', () => {
  const c = doCase('case-rpa-oidc');
  c.area = 'automacao';
  deveFalhar(c, /case-rpa-oidc/, /bloco area/, /área desconhecida "automacao"/);
});

test('os cases saem em sessões por área, na ordem de AREAS, com a ordem do JSON dentro', () => {
  for (const [dados, idioma] of [
    [PT, 'pt'],
    [EN, 'en']
  ]) {
    const html = renderizarCases(dados, idioma);
    const sessoes = [...html.matchAll(/<section class="cases-area" id="cases-([\w-]+)">/g)].map(
      (m) => m[1]
    );
    assert.deepEqual(sessoes, AREAS, idioma);
    // Cada case dentro da sessão da sua área: o trecho entre duas aberturas de
    // sessão contém exatamente os ids daquela área, na ordem do JSON.
    const trechos = html.split(/<section class="cases-area" id="cases-[\w-]+">/).slice(1);
    AREAS.forEach((area, i) => {
      const ids = [
        ...trechos[i].matchAll(/<article class="card case-card[^"]*" id="([^"]+)"/g)
      ].map((m) => m[1]);
      assert.deepEqual(
        ids,
        dados.filter((c) => c.area === area).map((c) => c.id),
        `${idioma}, ${area}`
      );
    });
  }
});

const sessao = (html, id) =>
  html.match(new RegExp(`<section class="cases-area" id="${id}">([\\s\\S]*?)</section>`));

test('sessão vazia mostra só título e "Em preparação", sem selo, grade nem botão', () => {
  const ia = sessao(renderizarCases(PT, 'pt'), 'cases-ia');
  assert.ok(ia, 'sem a sessão IA aplicada');
  assert.match(ia[1], /<h3 class="cases-area__titulo">IA aplicada<\/h3>/);
  assert.match(ia[1], /<p class="cases-area__abertura">Em preparação: /);
  assert.doesNotMatch(ia[1], /status|case-grid|demos-mais/);
  const en = sessao(renderizarCases(EN, 'en'), 'cases-ia');
  assert.ok(en, 'en: sem a sessão IA aplicada');
  assert.match(en[1], /<h3 class="cases-area__titulo">Applied AI<\/h3>/);
  assert.match(en[1], /<p class="cases-area__abertura">In preparation: /);
});

test('a sessão Power BI: busca e filtro de segmento num <template>, os painéis num bloco, sem o botão da galeria', () => {
  for (const [dados, idioma, t] of [
    [
      PT,
      'pt',
      {
        base: '/',
        bloco: 'Painéis de demonstração',
        segmento: 'Segmento',
        aviso: 'Empresas e dados mockados.',
        ver: 'Ver o painel',
        fora: ['Tecnologia', 'Tipo']
      }
    ],
    [
      EN,
      'en',
      {
        base: '/en/',
        bloco: 'Demo dashboards',
        segmento: 'Segment',
        aviso: 'Mock companies and data.',
        ver: 'View the dashboard',
        fora: ['Technology', 'Type']
      }
    ]
  ]) {
    const bi = sessao(renderizarCases(dados, idioma), 'cases-power-bi');
    assert.ok(bi, `${idioma}: sem a sessão Power BI`);
    assert.match(bi[1], /<h3 class="cases-area__titulo">Power BI<\/h3>/);
    assert.match(bi[1], /<p class="cases-area__abertura">/);
    assert.doesNotMatch(
      bi[1],
      /Em preparação|In preparation|demos-mais|\(fictícia\)|\(fictitious\)|Não é trabalho entregue|not delivered work/,
      idioma
    );
    // Busca e um filtro só (Segmento): as tags dos painéis não são tecnologia
    // e a área não tem projeto documentado para o filtro Tipo.
    const modelo = bi[1].match(/<template class="cases-filtros-modelo">([\s\S]*?)<\/template>/);
    assert.ok(modelo, `${idioma}: sem o template de busca e filtros`);
    assert.match(modelo[1], /<input [^>]*type="search" id="cases-busca-power-bi"/);
    assert.deepEqual(
      [...modelo[1].matchAll(/data-filtro="(\w+)"/g)].map((m) => m[1]),
      ['segmento'],
      idioma
    );
    assert.ok(modelo[1].includes(`id="cases-filtro-power-bi-segmento">${t.segmento}</p>`), idioma);
    for (const r of t.fora) assert.ok(!modelo[1].includes(`>${r}</p>`), `${idioma}: ${r}`);
    const segmentos = [...new Set(PAINEIS.map((c) => c.segmento[idioma]))];
    assert.deepEqual(
      [...modelo[1].matchAll(/data-valor="([^"]+)"/g)].map((m) => m[1]),
      segmentos,
      idioma
    );
    // Um bloco só, com o aviso e um cartão por painel (título em h5 sob o h4).
    assert.deepEqual(
      [...bi[1].matchAll(/<div class="cases-bloco" data-bloco="(\w+)">/g)].map((m) => m[1]),
      ['demo']
    );
    assert.ok(bi[1].includes(`<h4 class="cases-bloco__titulo">${t.bloco}</h4>`), idioma);
    assert.ok(bi[1].includes(`<p>${t.aviso}</p>`), `${idioma}: aviso`);
    assert.equal(
      [...bi[1].matchAll(/<article class="card mock-card" data-filtro-item data-tipo="demo"/g)]
        .length,
      PAINEIS.length
    );
    assert.equal([...bi[1].matchAll(/<h5 class="mock-card__titulo">/g)].length, PAINEIS.length);
    for (const c of PAINEIS) {
      assert.ok(
        bi[1].includes(
          `<a class="btn btn--ghost" href="${t.base}demos/power-bi/${c.slug}/">${t.ver}<span class="sr-only">`
        ),
        `${idioma}: botão de ${c.slug}`
      );
      assert.ok(bi[1].includes(`>${c.segmento[idioma]} | ${c.empresa}</p>`), c.slug);
    }
    assert.doesNotMatch(bi[1], /case-grid|data-tecs/);
  }
});

test('busca e filtros das duas abas não repetem id', () => {
  for (const [dados, idioma] of [
    [PT, 'pt'],
    [EN, 'en']
  ]) {
    const ids = [...renderizarCases(dados, idioma).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(repetidos, [], idioma);
  }
});

test('níveis de título: sessão h3, case h4 e fatos h5; na sessão Power Platform, bloco h4, case e app h5, fatos h6', () => {
  const html = renderizarCases([doCase('case-dataops'), doCase('case-fiscal-orchestration')], 'pt');
  assert.match(html, /<h3 class="cases-area__titulo">Engenharia de Dados<\/h3>/);
  assert.match(html, /<h4 class="case-card__titulo">Laboratório DataOps/);
  assert.match(html, /<h5>Decisões técnicas<\/h5>/);
  const pp = html.match(/id="cases-power-platform">([\s\S]*?)<\/section>\n\n/)[1];
  assert.match(pp, /<h4 class="cases-bloco__titulo">Apps de demonstração<\/h4>/);
  assert.match(pp, /<h4 class="cases-bloco__titulo">Projetos documentados<\/h4>/);
  assert.match(pp, /<h5 class="case-card__titulo">Orquestração de Processamento Fiscal/);
  assert.match(pp, /<h6>Decisões técnicas<\/h6>/);
  assert.equal([...pp.matchAll(/<h5 class="mock-card__titulo">/g)].length, APPS.length);
  assert.doesNotMatch(html, /<h3>|<h4>(Meu papel|Decisões|Resultado|Aprendizados)/);
});

test('a sessão Power Platform: busca e filtros num <template>, apps e projetos em blocos, sem o botão da galeria', () => {
  for (const [dados, idioma, rotulos] of [
    [PT, 'pt', ['Tecnologia', 'Tipo', 'Segmento dos apps', 'Empresas e dados mockados.']],
    [EN, 'en', ['Technology', 'Type', 'App segment', 'Mock companies and data.']]
  ]) {
    const html = renderizarCases(dados, idioma);
    const pp = html.match(/id="cases-power-platform">([\s\S]*?)<\/section>\n\n/)[1];
    const modelo = pp.match(/<template class="cases-filtros-modelo">([\s\S]*?)<\/template>/);
    assert.ok(modelo, `${idioma}: sem o template de busca e filtros`);
    for (const r of rotulos.slice(0, 3))
      assert.ok(modelo[1].includes(`>${r}</p>`), `${idioma}: ${r}`);
    assert.ok(pp.includes(rotulos[3]), `${idioma}: aviso`);
    assert.doesNotMatch(pp, /demos-mais|fictícia|fictitious/);
    // Nenhum hidden no HTML: esconder é só do JS.
    assert.doesNotMatch(html, /\shidden[\s>=]/);
    const blocos = [...pp.matchAll(/<div class="cases-bloco" data-bloco="(\w+)">/g)].map(
      (m) => m[1]
    );
    assert.deepEqual(blocos, ['demo', 'projeto']);
    assert.equal(
      [...pp.matchAll(/<article class="card mock-card" data-filtro-item data-tipo="demo"/g)].length,
      APPS.length
    );
    assert.equal(
      [
        ...pp.matchAll(
          /<article class="card case-card[^"]*" id="[^"]+" data-filtro-item data-tipo="projeto"/g
        )
      ].length,
      dados.filter((c) => c.area === 'power-platform').length
    );
  }
});

test('as abas saem num <template>, com o ícone do cartão de Especialidades de cada área', () => {
  const template = readFileSync(RAIZ + 'src/index.template.html', 'utf8');
  const icones = iconesDasAreas(template);
  assert.deepEqual(Object.keys(icones).sort(), ['engenharia-dados', 'ia', 'power-platform']);
  const html = renderizarCases(PT, 'pt', { iconesArea: icones });
  const modelo = html.match(/<template class="cases-abas-modelo">([\s\S]*?)<\/template>/);
  assert.ok(modelo, 'sem o template das abas');
  const abas = [
    ...modelo[1].matchAll(
      /<button [^>]*role="tab" id="aba-([\w-]+)" aria-controls="cases-([\w-]+)"[^>]*>(.*?)<\/button>/g
    )
  ];
  assert.deepEqual(
    abas.map((m) => m[1]),
    AREAS
  );
  assert.deepEqual(
    abas.map((m) => m[2]),
    AREAS
  );
  for (const [, area, , corpo] of abas)
    assert.match(
      corpo,
      area === 'power-bi'
        ? /<img class="cases-aba__icone" src="\/assets\/icons\/vendor\/power-bi\//
        : /<svg class="cases-aba__icone" aria-hidden="true"/,
      area
    );
  // Sem cartão de Especialidades para uma área, o build para.
  assert.throws(
    () => renderizarCases(PT, 'pt', { iconesArea: { 'power-platform': '<svg></svg>' } }),
    /sem ícone para a aba "engenharia-dados"/
  );
});

test('toda tag de app e de painel tem ícone do dicionário; Canvas não é tag', () => {
  for (const c of [...APPS, ...PAINEIS])
    for (const idioma of ['pt', 'en']) {
      const html = tagsApp(idioma, c);
      const tags = [
        ...html.matchAll(
          /<li class="tag">(<img [^>]*>|<svg [^>]*><use href="#i-[\w-]+"><\/use><\/svg>)([^<]+)<\/li>/g
        )
      ];
      assert.equal(tags.length, c.tags.length, `${c.slug} (${idioma})`);
      assert.ok(!c.tags.includes('Canvas'), c.slug);
    }
  // As tags dos painéis são conceitos: ícone neutro com o nome, nunca logotipo;
  // em inglês sai o rótulo traduzido do dicionário.
  for (const c of PAINEIS) assert.doesNotMatch(tagsApp('pt', c), /<img/, c.slug);
  assert.match(tagsApp('pt', PAINEIS[0]), />Executiva<\/li>/);
  assert.match(tagsApp('en', PAINEIS[0]), />Executive<\/li>/);
  // Todo ícone neutro do dicionário está na lista do sprite.
  for (const [chave, t] of Object.entries(TECNOLOGIAS))
    if (t.fluent) assert.ok(FLUENT.includes(t.fluent), chave);
});

test('bloco com "produto" e "icone" ao mesmo tempo falha', () => {
  const c = doCase('case-dataops');
  c.diagrama.zonas[0].nos[0].icone = 'database';
  deveFalhar(
    c,
    /case-dataops/,
    /diagrama\.zonas\[0\]\.nos\[0\]/,
    /"produto" \("postgresql"\) e "icone" \("database"\) ao mesmo tempo/
  );
});

test('a sequência de animação não é achatada: cada bloco tem posição própria', () => {
  const html = renderizarCases(
    PT.filter((c) => c.id === 'case-rpa-oidc'),
    'pt'
  );
  const seqs = [...html.matchAll(/diagram-seq-(\d+)/g)].map((m) => Number(m[1]));
  assert.equal(new Set(seqs).size, seqs.length, 'duas posições iguais na sequência do RPA');
  assert.ok(Math.max(...seqs) <= SEQ_MAX, `posição acima de SEQ_MAX (${SEQ_MAX})`);
});

test('diagrama longo demais para 1,5 s de animação falha', () => {
  const c = doCase('case-rpa-oidc');
  for (let i = 0; i < SEQ_MAX; i++)
    c.diagrama.chamadas.push({
      ...c.diagrama.chamadas[0],
      destaque: false,
      numero: String(20 + i)
    });
  deveFalhar(c, /case-rpa-oidc/, /sequência de animação com \d+ posições/);
});

test('plano de controle ligado a zona inexistente falha', () => {
  const c = doCase('case-dataops');
  c.diagrama.controle.orquestra = [0, 9];
  deveFalhar(c, /diagrama\.controle\.orquestra/, /índice de zona inválido 9/);
});

test('o Airflow liga por pontilhado só as zonas que orquestra', () => {
  const html = renderizarCases([doCase('case-dataops')], 'pt');
  const controle = html.match(/<div class="diagram-ties diagram-ties--controle"[^>]*>(.*?)<\/div>/);
  assert.ok(controle, 'sem pontilhados do plano de controle');
  const tracos = [...controle[1].matchAll(/<i([^>]*)>/g)].map(
    (m) => !/diagram-ties__vazio/.test(m[1])
  );
  assert.deepEqual(tracos, [true, true, true, false]);
});

test('a governança mantém os pontilhados em diagrama com faixa de retorno', () => {
  const html = renderizarCases([doCase('case-fiscal-orchestration')], 'pt');
  assert.match(html, /diagram-return/);
  assert.match(html, /diagram-ties diagram-ties--governanca/);
});

test('chamada do RPA com meio desconhecido falha', () => {
  const c = doCase('case-rpa-oidc');
  c.diagrama.chamadas[0].meio = 'fax';
  deveFalhar(c, /case-rpa-oidc/, /diagrama\.chamadas\[0\]/, /meio desconhecido "fax"/);
});

test('selo desconhecido falha', () => {
  const c = doCase('case-dataops');
  c.status.variante = 'quase-pronto';
  deveFalhar(c, /bloco status/, /selo desconhecido "quase-pronto"/);
});

test('case sem decisões falha', () => {
  const c = doCase('case-dataops');
  c.decisoes = [];
  deveFalhar(c, /bloco decisoes/, /esperados ao menos 1 itens/);
});

test('situação desconhecida falha; conhecida vira etiqueta e item de legenda', () => {
  const c = doCase('plataforma-dados-aws');
  const html = renderizarCases([c], 'pt');
  assert.match(html, /diagram-legend__box/);
  assert.match(html, /<span class="diagram-tag">Documentado<\/span>/);
  c.diagrama.zonas[4].nos[1].situacao = 'talvez';
  deveFalhar(c, /diagrama\.zonas\[4\]\.nos\[1\]/, /situação desconhecida "talvez"/);
});

test('peso de zona fora de 1..12 falha', () => {
  const c = doCase('plataforma-dados-aws');
  c.diagrama.zonas[0].peso = 13;
  deveFalhar(c, /diagrama\.zonas\[0\]/, /peso inválido 13/);
});

test('"ligaAoProximo" só vale numa zona empilhada, fora do último nó', () => {
  const c = doCase('plataforma-dados-aws');
  c.diagrama.zonas[4].nos[2].ligaAoProximo = true;
  deveFalhar(c, /diagrama\.zonas\[4\]\.nos\[2\]/, /ligaAoProximo/);
  const d = doCase('plataforma-dados-aws');
  d.diagrama.zonas[2].nos[0].ligaAoProximo = true;
  deveFalhar(d, /diagrama\.zonas\[2\]\.nos\[0\]/, /ligaAoProximo/);
});
