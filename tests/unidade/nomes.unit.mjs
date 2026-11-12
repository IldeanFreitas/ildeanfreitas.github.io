/**
 * Nenhum nome de empresa, cliente ou empregador no repositório.
 *
 * Decisão editorial (1/10/2026): o portfólio não nomeia nenhuma empresa, nem
 * cliente nem empregador; fala pelo segmento. O repositório é PÚBLICO, então
 * a lista dos nomes proibidos não pode morar nele (escrever os nomes aqui
 * seria cometer o erro que o teste existe para pegar). Ela vive num arquivo
 * fora do repositório, um nome por linha, e este teste a lê da variável de
 * ambiente PORTFOLIO_NOMES_PROIBIDOS:
 *
 *   PORTFOLIO_NOMES_PROIBIDOS=C:/caminho/fora/do/repo/nomes.txt npm run test:unit
 *
 * Sem a variável (o caso do CI, que não tem a lista) o teste é marcado como
 * ignorado, com esta mesma explicação, e não falha. Linhas vazias e linhas
 * começadas por # são ignoradas. A comparação não distingue maiúscula nem
 * acento e exige o nome inteiro (o nome "Exemplo" não casa com "Exemplos").
 * Nome que também é palavra comum do português (a varredura pegaria o verbo,
 * minúsculo, no meio de uma frase) vai com um = na frente: "=Nome" respeita
 * maiúscula e acento.
 *
 * A varredura cobre todo arquivo de texto do repositório: a página gerada, o
 * template e os cases de CADA idioma de src/idiomas.json (o teste "cobre os
 * arquivos de todos os idiomas" confere isso sem precisar da lista), a 404, os
 * scripts, os testes, a documentação. Entram também as demonstrações: os
 * dados (src/data/mockups-*.json), o app.html de cada app e de cada painel e
 * as páginas geradas de cada um em cada idioma (demos/** e <código>/demos/**;
 * o teste "cobre as demonstrações" confere). Quando um idioma, um app ou um
 * painel novo entra, os arquivos dele entram na varredura sem edição.
 *
 * A mensagem de falha diz o arquivo e a linha do texto e a linha da lista, e
 * nunca o nome: o resultado pode parar num log.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isAbsolute, relative, resolve } from 'node:path';
import { COLECOES } from '../../scripts/demos.mjs';
import { lerIdiomas } from '../../scripts/idiomas.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const VARIAVEL = 'PORTFOLIO_NOMES_PROIBIDOS';

const COMO_HABILITAR =
  `Defina ${VARIAVEL} com o caminho de um arquivo de texto FORA do repositório, ` +
  'com um nome por linha (ver docs/QUALIDADE.md), e rode npm run test:unit.';

const normalizar = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Os nomes da lista, com a linha de cada um: vazias e # ficam de fora, e um =
 * na frente marca o nome que respeita maiúscula e acento (`exato`).
 */
function lerNomes(texto) {
  return texto
    .split(/\r?\n/)
    .map((linha, i) => ({ nome: linha.trim(), linha: i + 1 }))
    .filter(({ nome }) => nome && !nome.startsWith('#'))
    .map(({ nome, linha }) =>
      nome.startsWith('=')
        ? { nome: nome.slice(1).trim(), linha, exato: true }
        : { nome, linha, exato: false }
    );
}

/** Onde os nomes aparecem em `texto`: a linha do texto e a linha da lista. */
function procurarNomes(texto, nomes) {
  const inteiro = (fonte) => `(?<![\\p{L}\\p{N}])${fonte}(?![\\p{L}\\p{N}])`;
  const padroes = nomes.map(({ nome, linha, exato }) => ({
    linha,
    exato,
    regex: new RegExp(inteiro(escaparRegex(exato ? nome : normalizar(nome))), 'u')
  }));
  const achados = [];
  texto.split(/\r?\n/).forEach((conteudo, i) => {
    const normal = normalizar(conteudo);
    for (const { linha, exato, regex } of padroes)
      if (regex.test(exato ? conteudo : normal))
        achados.push({ linhaDoTexto: i + 1, linhaDaLista: linha });
  });
  return achados;
}

const PASTAS_FORA = new Set([
  'node_modules',
  '.git',
  'test-results',
  'playwright-report',
  '.cache'
]);
const EXTENSOES = /\.(html|md|json|js|mjs|css|xml|txt|ya?ml)$/;

/** Todo arquivo de texto do repositório, com caminho relativo e barras normais. */
function arquivosDeTexto(pasta = '') {
  const arquivos = [];
  for (const entrada of readdirSync(resolve(RAIZ, pasta), { withFileTypes: true })) {
    if (PASTAS_FORA.has(entrada.name) || entrada.name.endsWith('-snapshots')) continue;
    const caminho = pasta ? `${pasta}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) arquivos.push(...arquivosDeTexto(caminho));
    else if (EXTENSOES.test(entrada.name) && entrada.name !== 'package-lock.json')
      arquivos.push(caminho);
  }
  return arquivos;
}

test('a varredura cobre os arquivos de todos os idiomas', () => {
  const varridos = new Set(arquivosDeTexto());
  for (const idioma of lerIdiomas())
    for (const arquivo of [idioma.arquivo, idioma.template, idioma.cases])
      assert.ok(varridos.has(arquivo), `${arquivo} (${idioma.codigo}) ficaria fora da varredura`);
  for (const arquivo of ['404.html', 'src/idiomas.json', 'scripts/cases.mjs', 'docs/QUALIDADE.md'])
    assert.ok(varridos.has(arquivo), `${arquivo} ficaria fora da varredura`);
});

test('a varredura cobre as demonstrações, em todos os idiomas', () => {
  // Os mockups são o lugar mais provável de um nome real escapar: têm empresa,
  // pessoa e documento inventados em volume. Dados, app.html e páginas geradas.
  const varridos = new Set(arquivosDeTexto());
  const idiomas = lerIdiomas();
  for (const col of Object.values(COLECOES)) {
    const esperados = [`src/data/${col.json}`];
    for (const c of col.dados) {
      esperados.push(`${col.demos}/${c.slug}/app.html`);
      for (const idioma of idiomas)
        esperados.push(
          `${idioma.pasta}${col.demos}/${c.slug}/index.html`,
          `${idioma.pasta}${col.demos}/${c.slug}/tela-cheia/index.html`
        );
    }
    for (const idioma of idiomas) esperados.push(`${idioma.pasta}${col.demos}/index.html`);
    for (const arquivo of esperados)
      assert.ok(varridos.has(arquivo), `${arquivo} ficaria fora da varredura`);
  }
});

test('a busca ignora maiúscula e acento, exige o nome inteiro e nunca devolve o nome', () => {
  // Nomes inventados: o teste não pode carregar nome de empresa de verdade.
  const nomes = lerNomes('# comentário\n\nAção Exemplo\n  Fulano & Cia  \n=Vento\n');
  assert.deepEqual(nomes, [
    { nome: 'Ação Exemplo', linha: 3, exato: false },
    { nome: 'Fulano & Cia', linha: 4, exato: false },
    { nome: 'Vento', linha: 5, exato: true }
  ]);
  const texto = [
    'nada aqui',
    'trabalhei na ACAO EXEMPLO por anos',
    'a ação exemplos não é o nome',
    'parceria com Fulano & Cia.',
    'prefixoFulano & Cia',
    'o vento sul não é o nome, só o Vento do início é',
    'Ventoso não conta'
  ].join('\n');
  assert.deepEqual(procurarNomes(texto, nomes), [
    { linhaDoTexto: 2, linhaDaLista: 3 },
    { linhaDoTexto: 4, linhaDaLista: 4 },
    { linhaDoTexto: 6, linhaDaLista: 5 }
  ]);
});

test(
  'a lista de nomes não pode estar dentro do repositório',
  { skip: !process.env[VARIAVEL] && `${VARIAVEL} não definida. ${COMO_HABILITAR}` },
  () => {
    const caminho = relative(realpathSync(RAIZ), realpathSync(process.env[VARIAVEL]));
    const dentro = !caminho.startsWith('..') && !isAbsolute(caminho);
    assert.ok(
      !dentro,
      'a lista de nomes proibidos está dentro do repositório, que é público: mova-a para fora'
    );
  }
);

test(
  'nenhum nome de empresa, cliente ou empregador no repositório',
  { skip: !process.env[VARIAVEL] && `${VARIAVEL} não definida. ${COMO_HABILITAR}` },
  () => {
    const arquivoDaLista = process.env[VARIAVEL];
    assert.ok(existsSync(arquivoDaLista), `${VARIAVEL} aponta para um arquivo que não existe`);
    const nomes = lerNomes(readFileSync(arquivoDaLista, 'utf8'));
    assert.ok(nomes.length > 0, `${VARIAVEL}: a lista está vazia`);

    const problemas = [];
    for (const arquivo of arquivosDeTexto())
      for (const { linhaDoTexto, linhaDaLista } of procurarNomes(
        readFileSync(resolve(RAIZ, arquivo), 'utf8'),
        nomes
      ))
        problemas.push(`${arquivo}:${linhaDoTexto} traz o nome da linha ${linhaDaLista} da lista`);
    assert.deepEqual(problemas, [], 'nome proibido encontrado');
  }
);
