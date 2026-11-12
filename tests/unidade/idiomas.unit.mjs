/**
 * Testes da configuração de idiomas (scripts/idiomas.mjs) e do dicionário dos
 * diagramas, sem navegador.
 *
 * O que se protege: configuração quebrada (código repetido, nenhum ou dois
 * idiomas padrão, arquivo de idioma ausente) para o build com mensagem que
 * diz o problema, e todo idioma tem as mesmas frases fixas de diagrama que o
 * PT-BR. Sem isto, um idioma novo com uma chave a menos imprimiria
 * "undefined" só na página dele.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  lerIdiomas,
  validarIdiomas,
  diferencasDeChaves,
  ErroDeIdiomas,
  BASE
} from '../../scripts/idiomas.mjs';
import { DICIONARIO, conferirDicionario } from '../../scripts/cases.mjs';
import { COLECOES, TECNOLOGIAS, conferirDemos } from '../../scripts/demos.mjs';
import { demonstracoes, montarSitemap, semLastmod } from '../../scripts/sitemap.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const lerArquivo = (caminho) => readFileSync(RAIZ + caminho, 'utf8');

const IDIOMAS = lerIdiomas();
const PADRAO = IDIOMAS.find((idioma) => idioma.padrao);

/** Duas entradas mínimas e válidas, com todos os arquivos "existindo". */
const base = () => [
  {
    codigo: 'pt',
    lang: 'pt-BR',
    ogLocale: 'pt_BR',
    rotulo: 'Português',
    sigla: 'PT',
    caminho: '/',
    padrao: true,
    interface: { escolherIdioma: 'escolher idioma' }
  },
  {
    codigo: 'es',
    lang: 'es',
    ogLocale: 'es_ES',
    rotulo: 'Español',
    sigla: 'ES',
    caminho: '/es/',
    interface: { escolherIdioma: 'elegir idioma' }
  }
];
const tudoExiste = () => true;

function deveFalhar(lista, existe, ...padroes) {
  assert.throws(
    () => validarIdiomas(lista, existe),
    (erro) => {
      assert.ok(erro instanceof ErroDeIdiomas, `esperado ErroDeIdiomas, veio ${erro && erro.name}`);
      for (const p of padroes) assert.match(erro.message, p);
      return true;
    }
  );
}

test('a configuração publicada é válida e tem um único idioma padrão', () => {
  assert.ok(IDIOMAS.length >= 2);
  assert.equal(IDIOMAS.filter((idioma) => idioma.padrao).length, 1);
  assert.equal(PADRAO.caminho, '/');
  assert.equal(PADRAO.arquivo, 'index.html');
  assert.equal(PADRAO.url, BASE);
});

test('os caminhos saem da convenção de nome', () => {
  const [pt, es] = validarIdiomas(base(), tudoExiste);
  assert.deepEqual(
    [pt.template, pt.cases, pt.arquivo, pt.ogImagem, pt.prefixo, pt.url],
    [
      'src/index.template.html',
      'src/data/cases.json',
      'index.html',
      'assets/img/og-image.png',
      '',
      BASE
    ]
  );
  assert.deepEqual(
    [es.template, es.cases, es.arquivo, es.ogImagem, es.prefixo, es.url],
    [
      'src/index.es.template.html',
      'src/data/cases.es.json',
      'es/index.html',
      'assets/img/og-image-es.png',
      '../',
      `${BASE}es/`
    ]
  );
});

test('lista vazia falha', () => {
  deveFalhar([], tudoExiste, /ao menos um idioma/);
  deveFalhar({}, tudoExiste, /ao menos um idioma/);
});

test('código repetido falha', () => {
  const lista = base();
  lista[1].codigo = 'pt';
  lista[1].caminho = '/pt/';
  deveFalhar(lista, tudoExiste, /codigo "pt" repetido \(idiomas 1 e 2\)/);
});

test('nenhum idioma padrão falha', () => {
  const lista = base();
  delete lista[0].padrao;
  deveFalhar(lista, tudoExiste, /exatamente um idioma precisa de "padrao": true; encontrados 0/);
});

test('dois idiomas padrão falham, com os dois nomeados', () => {
  const lista = base();
  lista[1].padrao = true;
  deveFalhar(lista, tudoExiste, /encontrados 2 \(pt, es\)/);
});

test('arquivo de idioma ausente falha, nomeando o arquivo', () => {
  const existe = (caminho) => caminho !== 'src/data/cases.es.json';
  deveFalhar(base(), existe, /idioma "es": arquivo ausente src\/data\/cases\.es\.json/);
  deveFalhar(
    base(),
    (caminho) => !caminho.endsWith('og-image-es.png'),
    /arquivo ausente assets\/img\/og-image-es\.png/
  );
});

test('caminho fora da convenção falha', () => {
  const lista = base();
  lista[1].caminho = '/espanol/';
  deveFalhar(lista, tudoExiste, /caminho "\/espanol\/", esperado "\/es\/"/);
});

test('campo, rótulo de interface ou formato inválido falha', () => {
  const semRotulo = base();
  delete semRotulo[1].rotulo;
  deveFalhar(semRotulo, tudoExiste, /campo "rotulo" ausente/);

  const semInterface = base();
  delete semInterface[1].interface.escolherIdioma;
  deveFalhar(semInterface, tudoExiste, /rótulo de interface "escolherIdioma" ausente/);

  const interfaceAMais = base();
  interfaceAMais[1].interface.fechar = 'cerrar';
  deveFalhar(interfaceAMais, tudoExiste, /rótulo de interface desconhecido "fechar"/);

  const lang = base();
  lang[1].lang = 'es_ES';
  deveFalhar(lang, tudoExiste, /lang "es_ES" não é uma etiqueta BCP 47/);

  const codigo = base();
  codigo[1].codigo = 'ES';
  codigo[1].caminho = '/ES/';
  deveFalhar(codigo, tudoExiste, /código "ES" inválido/);
});

test('diferencasDeChaves acha falta, sobra e formato, em qualquer nível', () => {
  assert.deepEqual(diferencasDeChaves({ a: 1, b: { c: 1 } }, { a: 2, b: { c: 2 } }), []);
  assert.deepEqual(diferencasDeChaves({ a: 1, b: { c: 1, d: 1 } }, { a: 1, b: { c: 1 }, e: 1 }), [
    'falta "b.d"',
    'sobra "e"'
  ]);
  assert.deepEqual(diferencasDeChaves({ a: { x: 1 } }, { a: 'texto' }), [
    '"a" tem formato diferente'
  ]);
});

test('o dicionário dos diagramas tem as mesmas chaves em todos os idiomas', () => {
  const codigos = IDIOMAS.map((idioma) => idioma.codigo);
  for (const codigo of codigos)
    assert.ok(Object.hasOwn(DICIONARIO, codigo), `DICIONARIO sem a entrada "${codigo}"`);
  assert.deepEqual(conferirDicionario(codigos, PADRAO.codigo), []);
});

test('ogLocale repetido falha, com os dois idiomas nomeados', () => {
  const lista = base();
  lista[1].ogLocale = 'pt_BR';
  deveFalhar(lista, tudoExiste, /ogLocale "pt_BR" repetido \(idiomas 1 e 2\)/);
});

/**
 * A imagem de compartilhamento é a única exceção. Quem a gera (gera-icones.mjs)
 * lê a configuração sem exigir o PNG: exigi-lo trancaria o idioma novo, porque
 * sem a entrada o PNG não é gerado, e com a entrada nada roda até o PNG existir.
 * Build, sitemap e lint de HTML continuam exigindo.
 */
test('sem o PNG de compartilhamento, a configuração vale para quem gera a imagem', () => {
  const semPng = (caminho) => !caminho.endsWith('.png');

  const idiomas = validarIdiomas(base(), semPng, { exigirImagem: false });
  assert.deepEqual(
    idiomas.map((idioma) => idioma.ogImagem),
    ['assets/img/og-image.png', 'assets/img/og-image-es.png']
  );

  // Para todos os outros (o padrão das opções) o PNG continua obrigatório.
  deveFalhar(base(), semPng, /idioma "pt": arquivo ausente assets\/img\/og-image\.png/);
  deveFalhar(base(), semPng, /idioma "es": arquivo ausente assets\/img\/og-image-es\.png/);
});

test('dispensar o PNG não dispensa o template nem os cases do idioma', () => {
  const semTemplateENemPng = (caminho) =>
    caminho !== 'src/index.es.template.html' && !caminho.endsWith('.png');
  assert.throws(
    () => validarIdiomas(base(), semTemplateENemPng, { exigirImagem: false }),
    (erro) => {
      assert.ok(erro instanceof ErroDeIdiomas);
      assert.match(erro.message, /idioma "es": arquivo ausente src\/index\.es\.template\.html/);
      assert.doesNotMatch(erro.message, /og-image/);
      return true;
    }
  );
  const semCases = (caminho) => caminho !== 'src/data/cases.es.json';
  deveFalhar(base(), semCases, /idioma "es": arquivo ausente src\/data\/cases\.es\.json/);
});

test('só o gera-icones dispensa o PNG, e valida antes de abrir o navegador', () => {
  for (const script of ['build.mjs', 'sitemap.mjs', 'lint-html.mjs'])
    assert.ok(
      !lerArquivo(`scripts/${script}`).includes('exigirImagem'),
      `${script} não pode dispensar o PNG de compartilhamento`
    );

  const gera = lerArquivo('scripts/gera-icones.mjs');
  const leitura = gera.indexOf('lerIdiomasOuSair({ exigirImagem: false })');
  assert.ok(leitura > 0, 'gera-icones.mjs precisa ler a configuração com exigirImagem: false');
  // Um process.exit depois de abrir o navegador ou criar a pasta temporária
  // deixava um portfolio-og-* no tmpdir a cada tentativa.
  for (const aberto of ['chromium.launch()', 'mkdtemp(']) {
    assert.ok(
      leitura < gera.indexOf(aberto, gera.indexOf('import ') + 1),
      `a configuração tem de ser lida antes de ${aberto}`
    );
  }
  const texto = gera.indexOf('sem texto da imagem de compartilhamento');
  assert.ok(
    texto > 0 && texto < gera.indexOf('chromium.launch()'),
    'TEXTOS conferido antes do navegador'
  );
});

test('o sitemap tem uma <url> por idioma, cada uma com todos os hreflang e o x-default', () => {
  const xml = montarSitemap(IDIOMAS, '2026-01-01');
  assert.equal(xml.match(/<url>/g).length, IDIOMAS.length);
  for (const idioma of IDIOMAS) {
    assert.ok(xml.includes(`<loc>${idioma.url}</loc>`), `${idioma.codigo} fora do sitemap`);
    assert.equal(
      xml.match(new RegExp(`hreflang="${idioma.lang}" href="${idioma.url}"`, 'g')).length,
      IDIOMAS.length,
      `${idioma.codigo}: hreflang ausente em alguma <url>`
    );
  }
  assert.equal(
    xml.match(new RegExp(`hreflang="x-default" href="${PADRAO.url}"`, 'g')).length,
    IDIOMAS.length
  );
});

test('o sitemap publicado está de acordo com a configuração (o lastmod não conta)', () => {
  const esperado = montarSitemap(IDIOMAS, '1999-12-31', demonstracoes());
  assert.equal(
    semLastmod(lerArquivo('sitemap.xml')),
    semLastmod(esperado),
    'sitemap.xml desatualizado em relação a src/idiomas.json ou às demonstrações: rode npm run build'
  );
});

test('o sitemap traz a página de cada app e de cada painel em todos os idiomas, sem redirecionamento nem player', () => {
  const demos = demonstracoes();
  const total = Object.values(COLECOES).reduce((n, col) => n + col.dados.length, 0);
  assert.equal(demos.length, total);
  const xml = montarSitemap(IDIOMAS, '2026-01-01', demos);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, IDIOMAS.length * (1 + total));
  assert.equal(new Set(locs).size, locs.length, 'URL repetida no sitemap');
  for (const col of Object.values(COLECOES)) {
    for (const idioma of IDIOMAS) {
      // A antiga galeria é redirecionamento noindex: fica fora.
      assert.ok(!locs.includes(`${idioma.url}${col.demos}/`), `${idioma.url}${col.demos}/`);
      for (const c of col.dados)
        assert.ok(
          locs.includes(`${idioma.url}${col.demos}/${c.slug}/`),
          `${idioma.codigo} ${c.slug}`
        );
    }
  }
  assert.ok(!locs.some((loc) => /tela-cheia|app\.html/.test(loc)), 'player ou app.html no sitemap');
  // Cada página aponta para ela mesma em cada idioma, e x-default para o padrão.
  const [caminho] = demos;
  for (const idioma of IDIOMAS)
    assert.equal(
      xml.match(new RegExp(`hreflang="${idioma.lang}" href="${idioma.url}${caminho}/"`, 'g'))
        .length,
      IDIOMAS.length
    );
  assert.equal(
    xml.match(new RegExp(`hreflang="x-default" href="${PADRAO.url}${caminho}/"`, 'g')).length,
    IDIOMAS.length
  );
});

test('o --check do sitemap acusa app ou painel novo sem sitemap regenerado', () => {
  const demos = demonstracoes();
  assert.notEqual(
    semLastmod(montarSitemap(IDIOMAS, '2026-01-01', demos)),
    semLastmod(montarSitemap(IDIOMAS, '2026-01-01', [...demos, 'demos/power-apps/app-novo']))
  );
});

/**
 * Textos das demonstrações (scripts/demos.mjs e src/data/mockups-*.json): o
 * mesmo contrato do dicionário dos diagramas. Idioma sem os textos para o
 * build com a mensagem dizendo a chave que falta.
 */
test('os textos das demonstrações existem em todos os idiomas', () => {
  assert.deepEqual(
    conferirDemos(
      IDIOMAS.map((idioma) => idioma.codigo),
      PADRAO.codigo
    ),
    []
  );
});

test('demonstração com idioma, chave, campo ou rótulo faltando é acusada, com a chave', () => {
  const T = () => ({
    pt: { ver: 'Ver', player: { voltar: 'Voltar' }, desc: (t) => t },
    en: { ver: 'View', player: { voltar: 'Back' }, desc: (t) => t }
  });
  const item = () => ({
    slug: 'exemplo',
    empresa: 'Empresa Modelo',
    segmento: { pt: 'Serviços', en: 'Services' },
    titulo: { pt: 'Título', en: 'Title' },
    dor: { pt: 'Dor', en: 'Pain' },
    solucao: { pt: 'Solução', en: 'Solution' },
    tags: ['Power Apps', { tec: 'apis', pt: 'API de teste', en: 'Test API' }],
    passos: { pt: ['um', 'dois'], en: ['one', 'two'] }
  });
  const colecoes = (dado = item(), textos = T()) => ({
    exemplo: { demos: 'demos/exemplo', json: 'mockups-exemplo.json', dados: [dado], T: textos }
  });
  const tecnologias = {
    'power-apps': { nome: 'Power Apps', marca: 'x.svg' },
    apis: { nome: 'APIs', fluent: 'plug-connected' },
    abas: { nome: 'Abas', en: 'Tabs', fluent: 'tabs' }
  };
  const conferir = (codigos, cols) => conferirDemos(codigos, 'pt', { colecoes: cols, tecnologias });

  assert.deepEqual(conferir(['pt', 'en'], colecoes()), []);
  // Entrada de um idioma que ainda não está na configuração não é problema.
  assert.deepEqual(conferir(['pt'], colecoes()), []);

  // Idioma novo sem nada: cada falta com o lugar e a chave.
  assert.deepEqual(conferir(['pt', 'en', 'es'], colecoes()), [
    'textos de "exemplo" (scripts/demos.mjs): sem a entrada "es"',
    'src/data/mockups-exemplo.json: "exemplo", falta "segmento.es"',
    'src/data/mockups-exemplo.json: "exemplo", falta "titulo.es"',
    'src/data/mockups-exemplo.json: "exemplo", falta "dor.es"',
    'src/data/mockups-exemplo.json: "exemplo", falta "solucao.es"',
    'src/data/mockups-exemplo.json: "exemplo", falta "passos.es"',
    'src/data/mockups-exemplo.json: "exemplo", falta "tags[1].es" (tag "apis")',
    'TECNOLOGIAS (scripts/demos.mjs): falta "abas.es" ("Abas" tem tradução em outro idioma)'
  ]);

  // Chave a menos e chave a mais nos textos fixos, em qualquer nível.
  const textos = T();
  delete textos.en.player.voltar;
  textos.en.sobra = 'x';
  assert.deepEqual(conferir(['pt', 'en'], colecoes(item(), textos)), [
    'textos de "exemplo" (scripts/demos.mjs), entrada "en": falta "player.voltar" (comparado a "pt")',
    'textos de "exemplo" (scripts/demos.mjs), entrada "en": sobra "sobra" (comparado a "pt")'
  ]);

  // Passos em quantidade diferente do padrão e texto vazio.
  const dado = item();
  dado.passos.en = ['one'];
  dado.titulo.en = '  ';
  assert.deepEqual(conferir(['pt', 'en'], colecoes(dado)), [
    'src/data/mockups-exemplo.json: "exemplo", falta "titulo.en"',
    'src/data/mockups-exemplo.json: "exemplo", "passos.en" com 1 passos; "passos.pt" tem 2'
  ]);
});

test('no dicionário publicado, tecnologia traduzida para um idioma está traduzida para todos', () => {
  const outros = IDIOMAS.filter((idioma) => !idioma.padrao).map((idioma) => idioma.codigo);
  const estruturais = ['nome', 'marca', 'fluent', 'tambem'];
  for (const [chave, t] of Object.entries(TECNOLOGIAS)) {
    const traducoes = Object.keys(t).filter((campo) => !estruturais.includes(campo));
    if (traducoes.length)
      for (const codigo of outros) assert.ok(t[codigo], `TECNOLOGIAS.${chave} sem "${codigo}"`);
  }
});

test('o --check do sitemap ignora a data e acusa idioma novo sem sitemap regenerado', () => {
  assert.equal(
    semLastmod(montarSitemap(IDIOMAS, '2026-01-01')),
    semLastmod(montarSitemap(IDIOMAS, '2030-12-31')),
    'mudar só a data não pode ser diferença'
  );
  const comEspanhol = validarIdiomas(base(), tudoExiste);
  const semEspanhol = comEspanhol.slice(0, 1);
  assert.notEqual(
    semLastmod(montarSitemap(semEspanhol, '2026-01-01')),
    semLastmod(montarSitemap(comEspanhol, '2026-01-01')),
    'um idioma a mais tem de ser diferença'
  );
  // Fim de linha do Windows não é diferença.
  const xml = montarSitemap(IDIOMAS, '2026-01-01');
  assert.equal(semLastmod(xml.replace(/\n/g, '\r\n')), semLastmod(xml));
});

/**
 * Paridade estrutural dos cases entre os idiomas.
 *
 * O build confere que os `id` e a ordem são os mesmos; este teste vai além:
 * toda chave que existe no JSON do PT-BR existe nos outros (e só ela), e os
 * campos que não são texto traduzido têm o MESMO valor. Texto que cada idioma
 * escreve do seu jeito (título, nota, rótulo) só precisa existir e não estar
 * vazio.
 *
 * Não é texto traduzido: número e booleano (peso, destaque, externo,
 * ligaAoProximo, orquestra), o `id` do case, o link do repositório e as
 * chaves de vocabulário fechado do renderizador: variante do selo, forma e
 * papel da zona, produto (marca), ícone, situação, meio da chamada, número da
 * chamada e sigla da camada. Um ícone trocado por engano em um idioma só (a
 * página dele ganharia outro desenho, ou o fallback) é o que isso pega.
 */
const CAMPOS_ESTRUTURAIS = [
  /\.(id|forma|icone|produto|situacao|meio|numero|sigla|repositorio|variante)$/,
  /^\[\d+\]\.diagrama\.zonas\[\d+\]\.papel$/
];

/** Caminho de cada folha, com índice de lista: `[0].decisoes[2].titulo`. */
function folhas(valor, caminho = '', saida = new Map()) {
  if (Array.isArray(valor)) valor.forEach((item, i) => folhas(item, `${caminho}[${i}]`, saida));
  else if (valor !== null && typeof valor === 'object')
    for (const [chave, item] of Object.entries(valor)) folhas(item, `${caminho}.${chave}`, saida);
  else saida.set(caminho, valor);
  return saida;
}

/** O que difere, na estrutura e nos campos que não são texto, entre dois idiomas. */
function diferencasEstruturais(padrao, outro) {
  const a = folhas(padrao);
  const b = folhas(outro);
  const problemas = [];
  for (const caminho of a.keys()) if (!b.has(caminho)) problemas.push(`falta ${caminho}`);
  for (const caminho of b.keys()) if (!a.has(caminho)) problemas.push(`sobra ${caminho}`);
  for (const [caminho, valor] of a) {
    if (!b.has(caminho)) continue;
    const outroValor = b.get(caminho);
    if (typeof valor !== typeof outroValor)
      problemas.push(`${caminho}: tipo ${typeof valor} × ${typeof outroValor}`);
    else if (typeof valor !== 'string' || CAMPOS_ESTRUTURAIS.some((r) => r.test(caminho))) {
      if (valor !== outroValor)
        problemas.push(`${caminho}: ${JSON.stringify(valor)} × ${JSON.stringify(outroValor)}`);
    } else if (!outroValor.trim()) problemas.push(`${caminho}: texto vazio`);
  }
  return { problemas, caminhos: a.size };
}

for (const idioma of IDIOMAS.filter((outro) => !outro.padrao))
  test(`paridade estrutural dos cases, ${PADRAO.codigo} × ${idioma.codigo}`, () => {
    const { problemas, caminhos } = diferencasEstruturais(
      JSON.parse(lerArquivo(PADRAO.cases)),
      JSON.parse(lerArquivo(idioma.cases))
    );
    assert.ok(caminhos > 100, 'poucos caminhos lidos: o arquivo mudou de formato?');
    assert.deepEqual(problemas, [], `${idioma.cases} diverge de ${PADRAO.cases}`);
  });

test('a paridade estrutural acusa chave a menos, ícone trocado e texto vazio, e aceita texto traduzido', () => {
  const caso = () => [
    {
      id: 'x',
      titulo: 'Um título',
      status: { variante: 'done', rotulo: 'Entregue' },
      tags: ['dbt', 'Power BI'],
      diagrama: {
        zonas: [{ papel: 'fonte', peso: 3, titulo: 'Fontes', nos: [{ icone: 'globe', nota: 'a' }] }]
      }
    }
  ];
  const traduzido = caso();
  traduzido[0].titulo = 'A title';
  traduzido[0].status.rotulo = 'Delivered';
  traduzido[0].diagrama.zonas[0].titulo = 'Sources';
  assert.deepEqual(diferencasEstruturais(caso(), traduzido).problemas, []);
  assert.equal(diferencasEstruturais(caso(), traduzido).caminhos, 11);

  const quebrado = caso();
  quebrado[0].tags.pop();
  quebrado[0].status.variante = 'lab';
  quebrado[0].diagrama.zonas[0].nos[0].icone = 'database';
  quebrado[0].diagrama.zonas[0].peso = 4;
  quebrado[0].diagrama.zonas[0].papel = 'consumo';
  quebrado[0].titulo = '  ';
  assert.deepEqual(
    diferencasEstruturais(caso(), quebrado).problemas.sort(),
    [
      '[0].diagrama.zonas[0].nos[0].icone: "globe" × "database"',
      '[0].diagrama.zonas[0].papel: "fonte" × "consumo"',
      '[0].diagrama.zonas[0].peso: 3 × 4',
      '[0].status.variante: "done" × "lab"',
      'falta [0].tags[1]',
      '[0].titulo: texto vazio'
    ].sort()
  );
});

test('dicionário com idioma ou chave faltando é acusado', () => {
  const dicionario = structuredClone(DICIONARIO);
  delete dicionario.en.legendaSituacao.previsto;
  dicionario.en.sobrando = 'x';
  // "xx" é um código que nunca vira idioma: o teste não pode quebrar no dia em
  // que o "es" real entrar no DICIONARIO (o passo a passo manda acrescentá-lo).
  assert.deepEqual(conferirDicionario(['pt', 'en', 'xx'], 'pt', dicionario), [
    'DICIONARIO.en: falta "legendaSituacao.previsto" (comparado a "pt")',
    'DICIONARIO.en: sobra "sobrando" (comparado a "pt")',
    'DICIONARIO sem a entrada "xx"'
  ]);
});
