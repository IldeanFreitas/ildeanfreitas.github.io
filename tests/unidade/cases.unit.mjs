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
  SEQ_MAX
} from '../../scripts/cases.mjs';

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
  PT.forEach((c, i) => {
    assert.match(figuras[i], /\bdiagram-anima\b/, c.id);
    // Dentro do fade do .reveal a sequência começava com a figura translúcida.
    assert.doesNotMatch(figuras[i], /\breveal\b/, c.id);
  });
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
