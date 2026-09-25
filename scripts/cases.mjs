/**
 * Renderiza os cases a partir de src/data/cases.json (ou cases.en.json).
 *
 * Roda em TEMPO DE BUILD, não no navegador. Montar os cases no cliente
 * resolveria a duplicação e destruiria o SEO: o conteúdo precisa estar no HTML
 * que o servidor entrega, que é o que o buscador lê e o que aparece com
 * JavaScript desativado.
 *
 * O texto dos cases vem do JSON; as poucas frases fixas dos diagramas (rótulos
 * de legenda, "Plano de controle", títulos de bloco) vêm do dicionário abaixo,
 * escolhido pelo idioma que o build passa. Assim a versão em inglês usa o
 * mesmo renderizador — e qualquer divergência estrutural entre as duas
 * páginas é impossível por construção.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DICIONARIO = {
  pt: {
    verRepositorio: 'Ver repositório e evidências',
    novaAba: '(abre em nova aba)',
    papel: 'Meu papel',
    decisoes: 'Decisões técnicas',
    resultado: 'Resultado',
    aprendizados: 'Aprendizados',
    fluxoDeDados: 'Fluxo de dados',
    controleEGovernanca: 'Controle e governança (sem dado)',
    planoDeControle: 'Plano de controle',
    subfluxos: 'Subfluxos',
    operacao: 'Operação',
    chamadasHttp: 'Chamadas HTTP',
    interacoesNavegador: 'Interações no navegador',
    http: 'HTTP',
    navegador: 'Navegador',
    passo6: 'O passo 6 só ocorre após o login',
    porQueNaoPost: 'Por que não é só um',
    porQueNaoPostAria: 'Por que não é só um POST de token',
    janelas: 'Janelas que governam o desenho',
    situacao: { documentado: 'Documentado', previsto: 'Previsto no contrato' },
    legendaSituacao: {
      documentado: 'Documentado, sem execução',
      previsto: 'Previsto no contrato, ainda não feito'
    }
  },
  en: {
    verRepositorio: 'See repository and evidence',
    novaAba: '(opens in a new tab)',
    papel: 'My role',
    decisoes: 'Technical decisions',
    resultado: 'Outcome',
    aprendizados: 'Lessons learned',
    fluxoDeDados: 'Data flow',
    controleEGovernanca: 'Control and governance (no data)',
    planoDeControle: 'Control plane',
    subfluxos: 'Subflows',
    operacao: 'Operation',
    chamadasHttp: 'HTTP calls',
    interacoesNavegador: 'Browser interactions',
    http: 'HTTP',
    navegador: 'Browser',
    passo6: 'Step 6 only happens after login',
    porQueNaoPost: 'Why it is not just a',
    porQueNaoPostAria: 'Why it is not just a token POST',
    janelas: 'Time windows that shape the design',
    situacao: { documentado: 'Documented', previsto: 'Planned in the contract' },
    legendaSituacao: {
      documentado: 'Documented, not run',
      previsto: 'Planned in the contract, not built yet'
    }
  }
};

let T = DICIONARIO.pt;

/** Escapa o que vai para dentro de um atributo HTML. */
const attr = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * O texto dos cases vem do JSON e é conteúdo de autor, com entidades já
 * escritas à mão (&amp;, &nbsp;). Reescapar transformaria "&amp;" em
 * "&amp;amp;" na página. Então só os caracteres que quebrariam a marcação, e
 * apenas quando não fazem parte de uma entidade existente.
 */
const texto = (s) =>
  String(s)
    .replace(/&(?!#?\w+;)/g, '&amp;')
    .replace(/</g, '&lt;');

/* ---------------------------------------------------------------------------
 * Validação
 *
 * O gerador lê o JSON por posição e por nome de campo. Antes, um ícone com
 * nome errado virava o ícone genérico, uma marca desconhecida virava o ícone
 * de conceito e um campo ausente virava a palavra "undefined" na página — e o
 * build passava. Agora qualquer um desses para o build com o case, o bloco e
 * o valor recusado, que é o que quem corrige precisa saber.
 * ------------------------------------------------------------------------- */

/** Erro de dado de case. O build o captura e imprime só a mensagem. */
export class ErroDeCase extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroDeCase';
  }
}

let caseAtual = '(fora de um case)';

const falhar = (onde, mensagem) => {
  throw new ErroDeCase(`case "${caseAtual}", bloco ${onde}: ${mensagem}`);
};
const exigir = (condicao, onde, mensagem) => {
  if (!condicao) falhar(onde, mensagem);
};

/** Nome legível do bloco na mensagem de erro: caminho no JSON + título. */
const bloco = (caminho, obj) => {
  const nome = obj && (obj.titulo || obj.nome || obj.rotulo);
  return nome ? `${caminho} ("${nome}")` : caminho;
};

const preenchido = (v) =>
  (typeof v === 'string' && v.trim() !== '') || (typeof v === 'number' && Number.isFinite(v));

/** Exige que `obj` seja objeto e que cada campo listado tenha texto. */
function campos(obj, onde, nomes) {
  exigir(obj && typeof obj === 'object' && !Array.isArray(obj), onde, 'esperado um objeto');
  for (const nome of nomes) exigir(preenchido(obj[nome]), onde, `campo "${nome}" ausente ou vazio`);
  return obj;
}

/** Exige uma lista com `min`..`max` itens (max omitido = exatamente min). */
function lista(valor, onde, min, max = min) {
  exigir(Array.isArray(valor), onde, 'esperada uma lista');
  const faixa = min === max ? `${min}` : max === Infinity ? `ao menos ${min}` : `${min} a ${max}`;
  exigir(
    valor.length >= min && valor.length <= max,
    onde,
    `esperados ${faixa} itens, encontrados ${valor.length}`
  );
  return valor;
}

/* ---------------------------------------------------------------------------
 * Ícones de conceito — Fluent System Icons
 *
 * Uma família só para todos os diagramas refeitos (X3). O nome do ícone no
 * dado é o nome do arquivo em assets/icons/neutral/fluent/, e cada um precisa
 * estar registrado no manifesto (conferido ao carregar o módulo). O desenho
 * entra por máscara CSS, então herda a cor da zona pelo currentColor.
 * ------------------------------------------------------------------------- */
export const FLUENT = [
  'archive',
  'arrow-clockwise',
  'arrow-sync',
  'arrow-sync-checkmark',
  'beaker',
  'branch',
  'chart-multiple',
  'clock',
  'cloud',
  'cube',
  'cursor-click',
  'database',
  'database-arrow-right',
  'database-checkmark',
  'database-multiple',
  'database-search',
  'dialpad',
  'document-lock',
  'document-text',
  'eye-off',
  'filter',
  'flow',
  'folder',
  'globe',
  'history',
  'key',
  'laptop',
  'lock-closed',
  'merge',
  'password',
  'plug-connected',
  'server',
  'shield-dismiss',
  'shield-lock',
  'storage',
  'table',
  'table-search',
  'timer',
  'window'
];

function iconeNeutro(nome, onde) {
  exigir(nome !== undefined, onde, 'bloco sem ícone (campo "icone" ausente)');
  exigir(
    FLUENT.includes(nome),
    onde,
    `ícone neutro desconhecido "${nome}". Disponíveis: ${FLUENT.join(', ')}`
  );
  return `<span class="diagram-icon diagram-icon--${nome}"></span>`;
}

/* ---------------------------------------------------------------------------
 * Marcas de produto — registro único
 *
 * Uma entrada por produto, com o arquivo original do fornecedor. Todo arquivo
 * daqui precisa estar registrado em assets/icons/manifest.json (fonte, termos,
 * data, SHA-256); o módulo confere isso ao carregar e falha se não estiver.
 *
 * A marca de um bloco vem do campo `produto` do dado, nunca do título: um
 * título traduzido ou reescrito não pode trocar o logotipo em silêncio.
 * ------------------------------------------------------------------------- */

/* Caminhos absolutos: a mesma marcação é servida em / e em /en/, e um caminho
 * relativo resolveria para /en/assets/... na segunda. */
const VENDOR = 'assets/icons/vendor';

export const MARCAS = {
  postgresql: `${VENDOR}/postgresql/PostgreSQL_logo.3colors.svg`,
  airbyte: `${VENDOR}/airbyte/Airbyte_icon_color.svg`,
  snowflake: `${VENDOR}/snowflake/bug-sno-blue.png`,
  dbt: `${VENDOR}/dbt/dbt-bit-standalone.png`,
  airflow: `${VENDOR}/airflow/airflow-icon.svg`,
  'power-bi': `${VENDOR}/power-bi/power_bi_48_color.svg`,
  dataverse: `${VENDOR}/dataverse/Dataverse_scalable.svg`,
  'power-apps': `${VENDOR}/power-apps/PowerApps_scalable.svg`,
  'power-automate': `${VENDOR}/power-automate/PowerAutomate_scalable.svg`,
  databricks: `${VENDOR}/databricks/databricks-symbol-color.svg`,
  python: `${VENDOR}/python/python-logo-only.svg`,
  'aws-s3': `${VENDOR}/aws/Arch_Amazon-Simple-Storage-Service_48.svg`,
  'aws-glue': `${VENDOR}/aws/Arch_AWS-Glue_48.svg`,
  'aws-athena': `${VENDOR}/aws/Arch_Amazon-Athena_48.svg`,
  'aws-redshift': `${VENDOR}/aws/Arch_Amazon-Redshift_48.svg`,
  'aws-step-functions': `${VENDOR}/aws/Arch_AWS-Step-Functions_48.svg`,
  'aws-lake-formation': `${VENDOR}/aws/Arch_AWS-Lake-Formation_48.svg`,
  'aws-cloudwatch': `${VENDOR}/aws/Arch_Amazon-CloudWatch_48.svg`,
  'aws-iam': `${VENDOR}/aws/Arch_AWS-Identity-and-Access-Management_48.svg`
};

{
  const manifesto = JSON.parse(
    readFileSync(fileURLToPath(new URL('../assets/icons/manifest.json', import.meta.url)), 'utf8')
  );
  const registrados = new Set(
    (manifesto.assets || []).flatMap((a) => [a.path, ...(a.files || []).map((f) => f.path)])
  );
  const faltando = [
    ...Object.entries(MARCAS),
    ...FLUENT.map((nome) => [`neutro:${nome}`, `assets/icons/neutral/fluent/${nome}.svg`])
  ].filter(([, caminho]) => !registrados.has(caminho));
  if (faltando.length)
    throw new ErroDeCase(
      `ícones sem registro em assets/icons/manifest.json: ${faltando
        .map(([nome, caminho]) => `${nome} (${caminho})`)
        .join(', ')}`
    );
}

/* A marca é decorativa porque o nome do produto permanece no mesmo bloco, de
 * modo que leitores de tela não recebem texto duplicado. Os diagramas ficam
 * abaixo da dobra; `loading="lazy"` adia os PNGs maiores (Snowflake, dbt) sem
 * tocar nos arquivos originais do catálogo. */
function marca(produto, onde) {
  exigir(
    Object.hasOwn(MARCAS, produto),
    onde,
    `marca desconhecida "${produto}". Registradas: ${Object.keys(MARCAS).join(', ')}`
  );
  return `<img class="diagram-node__logo" src="/${MARCAS[produto]}" alt="" loading="lazy" decoding="async">`;
}

/* ---------------------------------------------------------------------------
 * Componente único de nó
 *
 * Antes eram cinco sistemas paralelos (dataflow-node, async-job-node,
 * lakehouse-node, rpa-detailed-*, diagram-stage/layer), cada um com sombra,
 * cor literal e regra de celular próprias. Agora todo bloco de todo diagrama
 * é um `.diagram-node`, e o que muda entre eles é modificador:
 *
 *   --accent     o destaque do case (um só por diagrama, conferido abaixo)
 *   --external   sistema mantido por outra equipe (faixa cinza, fundo
 *                listrado e rótulo; o tracejado de linha é do meio
 *                "navegador" do RPA)
 *   --planned    só documentado ou só previsto (`situacao`): contorno
 *                tracejado e etiqueta de texto; a legenda do diagrama explica
 *   --compact    nó da faixa de retorno
 *
 * A cor vem da zona (papel), por custom property herdada.
 * ------------------------------------------------------------------------- */

const PAPEIS = ['fonte', 'ingestao', 'processamento', 'armazenamento', 'consumo', 'externo'];

/** Contexto de um diagrama em construção: família de ícones e sequência da animação. */
function contexto(animado) {
  return {
    animado,
    icone: iconeNeutro,
    seq: 0,
    destaques: 0,
    /** Situações (documentado, previsto) usadas: viram itens de legenda. */
    situacoes: new Set(),
    /** Próxima posição na sequência de entrada. */
    proxima() {
      return this.animado ? ` diagram-seq-${this.seq++}` : '';
    }
  };
}
/* Posições de sequência que o CSS declara (diagram-seq-0..SEQ_MAX, 50 ms
 * entre elas). Com a última entrando em 750 ms e durando 450 ms, a entrada
 * inteira cabe em 1,5 s. Diagrama com mais blocos que isso falha no build em
 * vez de achatar o fim da sequência num passo só, como fazia o teto de 11. */
export const SEQ_MAX = 15;

/**
 * Símbolo do bloco: marca quando declara `produto`, ícone de conceito senão.
 * Os dois ao mesmo tempo é erro: um deles seria descartado em silêncio, e
 * quem escreveu o dado não saberia qual aparece.
 */
function simbolo(obj, onde, ctx) {
  exigir(
    obj.produto === undefined || obj.icone === undefined,
    onde,
    `bloco com "produto" ("${obj.produto}") e "icone" ("${obj.icone}") ao mesmo tempo; use um só`
  );
  return `<span class="diagram-node__icon" aria-hidden="true">${
    obj.produto !== undefined ? marca(obj.produto, onde) : ctx.icone(obj.icone, onde)
  }</span>`;
}

/* ---------------------------------------------------------------------------
 * Situação de um bloco que não está em produção ou não foi executado
 *
 * Um estudo documentado mostra no mesmo desenho o que rodou e o que só está
 * nos guias; um contrato entre times pode prever um passo que o outro lado
 * ainda não fez. O campo `situacao` marca o bloco com contorno tracejado e
 * uma etiqueta de texto (a cor nunca é o único canal), e a legenda do
 * diagrama ganha o item correspondente.
 * ------------------------------------------------------------------------- */
const SITUACOES = ['documentado', 'previsto'];

/** Valida `obj.situacao` e a registra no contexto; devolve o nome ou ''. */
function situacaoDe(obj, onde, ctx) {
  if (obj.situacao === undefined) return '';
  exigir(
    SITUACOES.includes(obj.situacao),
    onde,
    `situação desconhecida "${obj.situacao}". Conhecidas: ${SITUACOES.join(', ')}`
  );
  ctx.situacoes.add(obj.situacao);
  return obj.situacao;
}
const etiquetaSituacao = (s) => (s ? `<span class="diagram-tag">${T.situacao[s]}</span>` : '');

const LINK = {
  desce: '<span class="diagram-link diagram-link--down" aria-hidden="true"><i></i></span>',
  frente: '<span class="diagram-link" aria-hidden="true"><i></i></span>',
  zona: '<span class="diagram-link diagram-link--zone" aria-hidden="true"><i></i></span>',
  retorno: '<span class="diagram-link diagram-link--reverse" aria-hidden="true"><i></i></span>',
  ida: '<span class="diagram-link diagram-link--both" aria-hidden="true"></span>',
  idaTracejada:
    '<span class="diagram-link diagram-link--both diagram-link--dashed" aria-hidden="true"></span>'
};

/**
 * Peso de um nó na largura da trilha: um nó simples vale 1; um grupo, suas
 * etapas mais uma (o próprio cartão do grupo gasta padding e vãos entre as
 * etapas; com peso igual ao número delas, o texto encostava na borda).
 */
const pesoDe = (n) => Math.min(Array.isArray(n.etapas) ? n.etapas.length + 1 : 1, 6);

function etapaDeGrupo(e, onde, ctx) {
  campos(e, onde, ['sigla', 'titulo', 'nota']);
  if (e.destaque) ctx.destaques++;
  const s = situacaoDe(e, onde, ctx);
  return (
    `<li class="diagram-step${e.destaque ? ' diagram-step--accent' : ''}${s ? ' diagram-step--planned' : ''}${ctx.proxima()}">` +
    `<span class="diagram-step__head">${simbolo(e, onde, ctx)}<span class="diagram-node__mark">${texto(e.sigla)}</span></span>` +
    `<b>${texto(e.titulo)}</b><small>${texto(e.nota)}</small>${etiquetaSituacao(s)}</li>`
  );
}

/**
 * Um nó. `link` diz qual conexão sai dele (nenhuma, para a frente, de volta).
 * `extra` é marcação interna que só alguns diagramas têm (listas do RPA).
 */
function no(n, onde, ctx, { link = '', compacto = false, extra = '' } = {}) {
  campos(n, onde, ['titulo', 'nota']);
  const classes = ['diagram-node'];
  if (n.destaque) {
    classes.push('diagram-node--accent');
    ctx.destaques++;
  }
  if (n.externo) classes.push('diagram-node--external');
  const s = situacaoDe(n, onde, ctx);
  if (s) classes.push('diagram-node--planned');
  if (compacto) classes.push('diagram-node--compact');
  if (link === LINK.desce) classes.push('diagram-node--flows-down');
  if (Array.isArray(n.etapas)) classes.push('diagram-node--group');
  const peso = pesoDe(n);
  if (peso > 1) classes.push(`diagram-w${peso}`);
  const seq = ctx.proxima();

  const etapas = Array.isArray(n.etapas)
    ? `<ol class="diagram-steps">${lista(n.etapas, `${onde}.etapas`, 2, 6)
        .map((e, i) => etapaDeGrupo(e, bloco(`${onde}.etapas[${i}]`, e), ctx))
        .join('')}</ol>`
    : '';

  return (
    `<article class="${classes.join(' ')}${seq}">` +
    `<div class="diagram-node__head">${simbolo(n, onde, ctx)}` +
    (preenchido(n.sigla) ? `<span class="diagram-node__mark">${texto(n.sigla)}</span>` : '') +
    `</div>` +
    /* Rótulo acima do título, em linha própria: cabe em qualquer largura. */
    (preenchido(n.tipo) ? `<span class="diagram-node__kind">${texto(n.tipo)}</span>` : '') +
    `<b class="diagram-node__title">${texto(n.titulo)}</b>` +
    `<span class="diagram-node__note">${texto(n.nota)}</span>` +
    etiquetaSituacao(s) +
    etapas +
    extra +
    link +
    `</article>`
  );
}

/** Lista de itens `{ titulo|nome, nota|valor, icone|produto }` com ícone, em `<li>`. */
function itensComIcone(itens, caminho, ctx, classe) {
  return `<ul class="${classe}">${lista(itens, caminho, 1, Infinity)
    .map((item, i) => {
      const onde = bloco(`${caminho}[${i}]`, item);
      const titulo = item.titulo ?? item.nome;
      const nota = item.nota ?? item.valor;
      exigir(preenchido(titulo), onde, 'campo "titulo" (ou "nome") ausente ou vazio');
      exigir(preenchido(nota), onde, 'campo "nota" (ou "valor") ausente ou vazio');
      const s = situacaoDe(item, onde, ctx);
      return `<li${s ? ' class="diagram-item--planned"' : ''}>${simbolo(item, onde, ctx)}<div><b>${texto(titulo)}</b><small>${texto(nota)}</small>${etiquetaSituacao(s)}</div></li>`;
    })
    .join('')}</ul>`;
}

/** Faixa de itens (governança, ambientes, restrições, janelas). */
function faixa(
  dados,
  caminho,
  ctx,
  { borda = '', papel = 'governanca', tituloHtml, caminhoItens = `${caminho}.itens` } = {}
) {
  campos(dados, caminho, ['titulo']);
  const classes = `diagram-band diagram-band--${papel}${borda ? ` diagram-band--${borda}` : ''}${ctx.proxima()}`;
  return `<section class="${classes}"><p class="diagram-zone__title">${tituloHtml || texto(dados.titulo)}</p>${itensComIcone(dados.itens, caminhoItens, ctx, 'diagram-band__items')}</section>`;
}

function legenda(itens) {
  return `<div class="diagram-legend">${itens.join('')}</div>`;
}
/** Item de legenda de linha. `estilo`: '' (contínua), 'dashed' (tracejada, só o
 * meio "navegador" do RPA) ou 'dotted' (pontilhada, controle e governança). */
const itemLegenda = (rotulo, estilo = '') =>
  `<span><i class="diagram-legend__line${estilo ? ` diagram-legend__line--${estilo}` : ''}" aria-hidden="true"></i>${rotulo}</span>`;
/** Item de legenda de situação: caixa tracejada, como o bloco que ela explica. */
const itemSituacao = (s) =>
  `<span><i class="diagram-legend__box" aria-hidden="true"></i>${T.legendaSituacao[s]}</span>`;

function cabecalho(d) {
  return `<div class="diagram-header"><p class="diagram-kicker">${texto(d.etiqueta)}</p><b>${texto(d.titulo)}</b></div>`;
}

/**
 * Abre a figura. Diagrama animado leva `.diagram-anima`, que o script
 * principal observa à parte do `.reveal`: dentro do fade, a sequência começava
 * com a figura ainda a 0-60% de opacidade e o início do fluxo se perdia. Agora
 * ela só dispara depois que o fade do cartão terminou.
 */
function figura(d, forma, ctx, corpo) {
  campos(d, 'diagrama', ['resumo']);
  exigir(
    ctx.destaques === 1,
    'diagrama',
    `um diagrama tem exatamente um destaque (campo "destaque"); encontrados ${ctx.destaques}`
  );
  exigir(
    ctx.seq <= SEQ_MAX + 1,
    'diagrama',
    `sequência de animação com ${ctx.seq} posições; o máximo é ${SEQ_MAX + 1}, para caber em 1,5 s. Agrupe blocos ou suba SEQ_MAX junto com o CSS`
  );
  return (
    `          <figure class="architecture-diagram architecture-diagram--${forma}${ctx.animado ? ' diagram-anima' : ''}" aria-label="${attr(d.alt)}">\n` +
    corpo.map((linha) => `            ${linha}`).join('\n') +
    `\n            <figcaption class="diagram-caption">${texto(d.resumo)}</figcaption>\n` +
    `          </figure>`
  );
}

/* ---------------------------------------------------------------------------
 * Trilha: fontes → ingestão → armazenamento/processamento → consumo
 *
 * Forma única dos diagramas de dados e de fila (DataOps, Lakehouse, AWS, Fiscal).
 * O caminho do dado fica numa linha só, em zonas; o plano de controle fica
 * acima, pontilhado, porque não transporta dado; a governança fica abaixo,
 * ligada por pontilhado às zonas, porque é condição de todas elas e não
 * etapa. Um retorno (o worker gravando na fila que o app lê) tem faixa
 * própria, no sentido contrário — seta nenhuma aponta para onde o dado não vai.
 * ------------------------------------------------------------------------- */

/* Pesos de largura declarados no CSS (.diagram-w2 … .diagram-w12). */
const PESO_MAX = 12;

function zonaDaTrilha(z, i, total, ctx, topo) {
  const onde = bloco(`diagrama.zonas[${i}]`, z);
  campos(z, onde, ['titulo', 'papel']);
  exigir(
    PAPEIS.includes(z.papel),
    onde,
    `papel desconhecido "${z.papel}". Conhecidos: ${PAPEIS.join(', ')}`
  );
  const nos = lista(z.nos, `${onde}.nos`, 1, 6);
  const ultima = i === total - 1;
  const empilhada = z.empilhada === true;
  /* `peso` explícito: quando a soma automática deixa uma zona estreita
   * demais para o próprio texto (o AWS, com cinco zonas, a 1101 px). */
  if (z.peso !== undefined)
    exigir(
      Number.isInteger(z.peso) && z.peso >= 1 && z.peso <= PESO_MAX,
      onde,
      `peso inválido ${JSON.stringify(z.peso)}; use um inteiro de 1 a ${PESO_MAX}`
    );
  const peso = z.peso ?? (empilhada ? 1 : nos.reduce((s, n) => s + pesoDe(n), 0));

  const html = nos.map((n, j) => {
    const ondeNo = bloco(`diagrama.zonas[${i}].nos[${j}]`, n);
    /* Numa zona empilhada, os nós não se ligam por padrão (Athena e Redshift
     * são consumos paralelos); `ligaAoProximo` desenha a seta para baixo
     * quando o dado passa de um para o outro (Redshift → Power BI). */
    if (n.ligaAoProximo !== undefined)
      exigir(
        n.ligaAoProximo === true && empilhada && j < nos.length - 1,
        ondeNo,
        '"ligaAoProximo" só vale como true, numa zona empilhada, fora do último nó'
      );
    return no(n, ondeNo, ctx, {
      link: n.ligaAoProximo
        ? LINK.desce
        : !empilhada && !(ultima && j === nos.length - 1)
          ? LINK.frente
          : ''
    });
  });
  return {
    peso,
    html:
      `<section class="diagram-zone diagram-zone--${z.papel}${empilhada ? ' diagram-zone--stack' : ''}${peso > 1 ? ` diagram-w${peso}` : ''}">` +
      `<p class="diagram-zone__title">${texto(z.titulo)}</p>` +
      `<div class="diagram-zone__nodes">${html.join('')}</div>` +
      (empilhada && !ultima ? LINK.zona : '') +
      /* Trilha alinhada pelo topo: o pontilhado da governança sobe pela
       * própria zona até a base dos nós, em vez de parar no fim da coluna
       * mais alta e deixar o vão vazio. */
      (topo ? '<i class="diagram-zone__tie" aria-hidden="true"></i>' : '') +
      `</section>`
  };
}

function controle(c, ctx) {
  const onde = bloco('diagrama.controle', c);
  campos(c, onde, ['titulo', 'nota', 'resumo']);
  const s = situacaoDe(c, onde, ctx);
  /* Rótulo e nome em spans próprios: no celular o separador some e cada um
   * ocupa a sua linha, em vez de o rótulo inteiro quebrar em cinco. */
  return (
    `<div class="diagram-control${s ? ' diagram-control--planned' : ''}${ctx.proxima()}">${simbolo(c, onde, ctx)}` +
    `<div><span class="diagram-control__label"><span>${T.planoDeControle}</span><span class="diagram-control__sep"> · </span><span>${texto(c.titulo)}</span></span><b>${texto(c.nota)}</b>${etiquetaSituacao(s)}</div>` +
    `<small>${texto(c.resumo)}</small></div>`
  );
}

function retorno(r, ctx) {
  const onde = bloco('diagrama.retorno', r);
  campos(r, onde, ['titulo']);
  const nos = lista(r.nos, `${onde}.nos`, 2, 4);
  /* A faixa inteira pode ser só prevista (o retorno que o contrato de status
   * combina e o outro time ainda não fez): marca a faixa, não cada nó. */
  const s = situacaoDe(r, onde, ctx);
  return (
    `<section class="diagram-return${s ? ' diagram-return--planned' : ''}"><p class="diagram-zone__title">${texto(r.titulo)}${etiquetaSituacao(s)}</p>` +
    `<div class="diagram-return__nodes">${nos
      .map((n, j) =>
        no(n, bloco(`diagrama.retorno.nos[${j}]`, n), ctx, {
          compacto: true,
          link: j < nos.length - 1 ? LINK.retorno : ''
        })
      )
      .join('')}</div></section>`
  );
}

/**
 * Linha de pontilhados alinhada às zonas da trilha (mesmos pesos, então cada
 * traço cai no centro da sua zona). Zona não ligada guarda o lugar sem traço.
 */
function amarrasPontilhadas(zonas, ligadas, papel) {
  return `<div class="diagram-ties diagram-ties--${papel}" aria-hidden="true">${zonas
    .map((z, i) => {
      const classes = [
        z.peso > 1 ? `diagram-w${z.peso}` : '',
        ligadas[i] ? '' : 'diagram-ties__vazio'
      ]
        .filter(Boolean)
        .join(' ');
      return `<i${classes ? ` class="${classes}"` : ''}></i>`;
    })
    .join('')}</div>`;
}

/** `controle.orquestra`: índices das zonas que o plano de controle aciona. */
function orquestradas(indices, total) {
  const onde = 'diagrama.controle.orquestra';
  lista(indices, onde, 1, total);
  const ligadas = Array(total).fill(false);
  indices.forEach((i) => {
    exigir(
      Number.isInteger(i) && i >= 0 && i < total,
      onde,
      `índice de zona inválido ${JSON.stringify(i)}; zonas vão de 0 a ${total - 1}`
    );
    exigir(!ligadas[i], onde, `zona ${i} repetida`);
    ligadas[i] = true;
  });
  return ligadas;
}

function trilha(d) {
  const ctx = contexto(true);
  campos(d, 'diagrama', ['alt', 'etiqueta', 'titulo']);
  const zonasDados = lista(d.zonas, 'diagrama.zonas', 2, 6);

  /* Zona empilhada (vários nós em coluna) é mais alta que as vizinhas: sem
   * isto, os nós simples esticavam até a altura dela, caixas quase vazias. No
   * desktop, --topo alinha os nós pelo topo e põe as setas na linha dos ícones. */
  const empilhada = zonasDados.some((z) => z.empilhada === true);
  const topo = d.controle ? controle(d.controle, ctx) : '';
  const zonas = zonasDados.map((z, i) => zonaDaTrilha(z, i, zonasDados.length, ctx, empilhada));
  const volta = d.retorno ? retorno(d.retorno, ctx) : '';
  campos(d.governanca, 'diagrama.governanca', ['titulo']);
  const governanca = faixa(d.governanca, 'diagrama.governanca', ctx, { borda: 'dotted' });
  const ambientes = d.ambientes
    ? faixa(d.ambientes, 'diagrama.ambientes', ctx, { papel: 'ambiente' })
    : '';

  /* Pontilhados (nunca setas: não transportam dado). Os da governança sobem
   * até o bloco imediatamente acima — a trilha ou, quando há, a faixa de
   * retorno, que é o fim do mesmo fluxo; antes, com retorno, eles sumiam. Os do
   * plano de controle descem só até as zonas que ele de fato orquestra. */
  const governados = zonas.map(() => true);
  const amarras = amarrasPontilhadas(zonas, governados, 'governanca');
  const amarrasControle =
    d.controle && d.controle.orquestra !== undefined
      ? amarrasPontilhadas(zonas, orquestradas(d.controle.orquestra, zonas.length), 'controle')
      : '';

  return figura(
    d,
    d.forma,
    ctx,
    [
      cabecalho(d),
      legenda([
        itemLegenda(T.fluxoDeDados),
        itemLegenda(T.controleEGovernanca, 'dotted'),
        ...SITUACOES.filter((s) => ctx.situacoes.has(s)).map(itemSituacao)
      ]),
      topo,
      amarrasControle,
      `<section class="diagram-track${empilhada ? ' diagram-track--topo' : ''}">${zonas.map((z) => z.html).join('')}</section>`,
      volta,
      amarras,
      governanca,
      ambientes
    ].filter(Boolean)
  );
}

/* ---------------------------------------------------------------------------
 * RPA OIDC
 *
 * O RPA alterna HTTP e navegador porque há três limites técnicos verificados.
 * A versão pública deixa portal, domínios, seletores, contas e segredos fora
 * do desenho, mas mantém o caminho de uma conta e a razão de cada fronteira.
 * O serviço de tokens é de outra equipe: aparece como sistema externo, sem
 * marca de produto.
 * ------------------------------------------------------------------------- */
const MEIOS_RPA = ['http', 'navegador'];

function anatomiaRpa(d) {
  const ctx = contexto(true);
  campos(d, 'diagrama', ['alt', 'etiqueta', 'titulo', 'subtitulo']);
  exigir(d.zonas && typeof d.zonas === 'object', 'diagrama.zonas', 'esperado um objeto');

  const zonaExterna = (z, caminho, papel, link) => {
    const onde = bloco(caminho, z);
    campos(z, onde, ['subtitulo']);
    return (
      `<section class="diagram-zone diagram-zone--${papel}"><p class="diagram-zone__title">${texto(z.subtitulo)}</p>` +
      `<div class="diagram-zone__nodes">${no(z, onde, ctx, {
        link,
        extra: itensComIcone(z.itens, `${caminho}.itens`, ctx, 'diagram-node__list')
      })}</div></section>`
    );
  };

  const robo = d.robo;
  const ondeRobo = bloco('diagrama.robo', robo);
  campos(robo, ondeRobo, ['subtitulo', 'rodape']);
  const subfluxos = lista(robo.subfluxos, `${ondeRobo}.subfluxos`, 1, Infinity);
  const extraRobo =
    `<p class="diagram-node__subtitle">${T.subfluxos}</p>` +
    `<ol class="diagram-node__subflows">${subfluxos.map((s) => `<li>${texto(s)}</li>`).join('')}</ol>` +
    `<p class="diagram-node__subtitle">${T.operacao}</p>` +
    itensComIcone(robo.operacao, `${ondeRobo}.operacao`, ctx, 'diagram-node__list') +
    `<p class="diagram-node__foot">${texto(robo.rodape)}</p>`;

  const zonas =
    zonaExterna(d.zonas.servico, 'diagrama.zonas.servico', 'externo', LINK.ida) +
    `<section class="diagram-zone diagram-zone--processamento diagram-w2"><p class="diagram-zone__title">${texto(robo.subtitulo)}</p>` +
    `<div class="diagram-zone__nodes">${no(robo, ondeRobo, ctx, { link: LINK.idaTracejada, extra: extraRobo })}</div></section>` +
    zonaExterna(d.zonas.portal, 'diagrama.zonas.portal', 'fonte', '');

  /* A sequência de entrada segue o número da chamada, não a raia: as dez
   * etapas acendem na ordem em que acontecem, alternando HTTP e navegador. */
  const base = ctx.seq;
  const chamadas = lista(d.chamadas, 'diagrama.chamadas', 1, Infinity).map((c, i) => {
    const onde = bloco(`diagrama.chamadas[${i}]`, c);
    campos(c, onde, ['numero', 'meio', 'rotulo', 'nota']);
    exigir(
      MEIOS_RPA.includes(c.meio),
      onde,
      `meio desconhecido "${c.meio}". Conhecidos: ${MEIOS_RPA.join(', ')}`
    );
    if (c.destaque) ctx.destaques++;
    const seq = ctx.animado ? ` diagram-seq-${base + i}` : '';
    return {
      meio: c.meio,
      html: `<li class="diagram-call${c.destaque ? ' diagram-call--accent' : ''}${seq}"><span class="diagram-call__num">${texto(c.numero)}</span><div><b>${texto(c.rotulo)}</b><small>${texto(c.nota)}</small></div></li>`
    };
  });
  ctx.seq = base + chamadas.length;
  const raia = (meio, titulo, classe) =>
    `<div class="diagram-calls__lane${classe}"><p class="diagram-zone__title">${titulo}</p><ol>${chamadas
      .filter((c) => c.meio === meio)
      .map((c) => c.html)
      .join('')}</ol></div>`;

  const restricoes = faixa(
    { titulo: T.porQueNaoPostAria, itens: d.restricoes },
    'diagrama.restricoes',
    ctx,
    {
      tituloHtml: `${T.porQueNaoPost} <code>POST /token</code>`,
      caminhoItens: 'diagrama.restricoes'
    }
  );
  const janelas = faixa({ titulo: T.janelas, itens: d.janelas }, 'diagrama.janelas', ctx, {
    caminhoItens: 'diagrama.janelas'
  });

  return figura(d, 'rpa', ctx, [
    cabecalho(d),
    legenda([
      itemLegenda(T.http),
      itemLegenda(T.navegador, 'dashed'),
      `<span class="diagram-legend__note">${texto(d.subtitulo)} · ${T.passo6}</span>`
    ]),
    `<section class="diagram-track diagram-track--rpa">${zonas}</section>`,
    `<section class="diagram-calls">${raia('http', T.chamadasHttp, '')}${raia('navegador', T.interacoesNavegador, ' diagram-calls__lane--browser')}</section>`,
    restricoes,
    janelas
  ]);
}

const FORMAS = {
  trilha: (d) => trilha(d),
  'rpa-detailed': (d) => anatomiaRpa(d)
};

function diagrama(d) {
  campos(d, 'diagrama', ['forma', 'alt', 'etiqueta', 'titulo']);
  exigir(
    Object.hasOwn(FORMAS, d.forma),
    'diagrama',
    `forma desconhecida "${d.forma}". Conhecidas: ${Object.keys(FORMAS).join(', ')}`
  );
  return FORMAS[d.forma](d);
}

/**
 * Bloco de fatos do case: papel, decisões, resultado e aprendizados. `papel`
 * e `aprendizados` são opcionais — o que o autor não documentou simplesmente
 * não aparece, em vez de virar um "a definir" publicado. `decisoes` e
 * `resultado` são obrigatórios (conferidos em validarCase).
 */
function fatos(c) {
  const blocos = [];
  if (c.papel) blocos.push(`<div><h4>${T.papel}</h4><p>${texto(c.papel)}</p></div>`);
  if (c.decisoes && c.decisoes.length)
    blocos.push(
      `<div><h4>${T.decisoes}</h4><ul>${c.decisoes
        .map((d) => `<li><b>${texto(d.titulo)}</b> ${texto(d.texto)}</li>`)
        .join('')}</ul></div>`
    );
  if (c.resultado) blocos.push(`<div><h4>${T.resultado}</h4><p>${texto(c.resultado)}</p></div>`);
  if (c.aprendizados && c.aprendizados.length)
    blocos.push(
      `<div><h4>${T.aprendizados}</h4><ul>${c.aprendizados.map((a) => `<li>${texto(a)}</li>`).join('')}</ul></div>`
    );
  if (!blocos.length) return [];
  return [
    `          <div class="case-facts">`,
    ...blocos.map((b) => `            ${b}`),
    `          </div>`
  ];
}

/**
 * Selos aceitos. Cada um precisa de regra `.status--<variante>` em
 * src/css/componentes/cartoes.css e de item na legenda dos dois templates
 * quando estiver em uso (o teste de comportamento cobra a legenda).
 */
export const SELOS = ['done', 'lab', 'staging', 'designed', 'evolving', 'soon'];

function validarCase(c) {
  campos(c, 'raiz', ['id', 'titulo', 'descricao', 'escopoRotulo', 'escopo', 'resultado']);
  campos(c.status, 'status', ['variante', 'rotulo']);
  exigir(
    SELOS.includes(c.status.variante),
    'status',
    `selo desconhecido "${c.status.variante}". Conhecidos: ${SELOS.join(', ')}`
  );
  lista(c.tags, 'tags', 1, Infinity).forEach((t, i) =>
    exigir(preenchido(t), `tags[${i}]`, 'tag vazia')
  );
  lista(c.decisoes, 'decisoes', 1, Infinity).forEach((d, i) =>
    campos(d, bloco(`decisoes[${i}]`, d), ['titulo', 'texto'])
  );
}

/**
 * Um case. A ordem e as classes do envoltório existem em UM lugar só — era
 * esse o ponto da conversão. Antes, seis blocos quase iguais divergiam sem
 * ninguém notar: um deles usava class="button button--secondary", que não
 * existe no CSS, e o link do repositório renderizava como texto simples
 * enquanto os outros cinco eram pílulas.
 */
export function renderizarCase(c) {
  caseAtual = (c && c.id) || '(sem id)';
  validarCase(c);
  const classes = `card case-card case-card--feature case-card--${attr(c.id.replace(/^case-/, ''))} reveal`;
  const partes = [
    `        <article class="${classes}" id="${attr(c.id)}">`,
    `          <div class="case-card__content">`,
    /* Narrativa (selo, título, descrição, escopo) e fatos em .case-card__cols:
     * no desktop são duas colunas, e a narrativa acompanha a rolagem ao lado
     * dos fatos sem invadir as tecnologias, que ficam fora do par. */
    `          <div class="case-card__cols">`,
    `          <div class="case-card__intro">`,
    `          <p class="case-card__status"><span class="status status--${attr(c.status.variante)} sem-margem">${texto(c.status.rotulo)}</span>${c.natureza ? `<span class="status-natureza">${texto(c.natureza)}</span>` : ''}</p>`,
    `          <h3>${texto(c.titulo)}</h3>`,
    `          <p>${texto(c.descricao)}</p>`,
    `          <p class="scope"><b>${texto(c.escopoRotulo)}</b> ${texto(c.escopo)}</p>`,
    `          </div>`,
    ...fatos(c),
    `          </div>`,
    `          <div class="case-card__foot">`,
    `          <ul class="taglist">`,
    ...c.tags.map((t) => `            <li class="tag">${texto(t)}</li>`),
    `          </ul>`
  ];

  if (c.repositorio) {
    partes.push(
      `          <a class="btn btn--ghost mt-6" href="${attr(c.repositorio)}" target="_blank" rel="noopener">${T.verRepositorio} <span aria-hidden="true">↗</span><span class="sr-only"> ${T.novaAba}</span></a>`
    );
  }

  partes.push(`          </div>`, `          </div>`, diagrama(c.diagrama), `        </article>`);
  return partes.join('\n');
}

export function renderizarCases(cases, idioma = 'pt') {
  exigir(Object.hasOwn(DICIONARIO, idioma), 'renderizarCases', `idioma desconhecido "${idioma}"`);
  T = DICIONARIO[idioma];
  exigir(Array.isArray(cases), 'renderizarCases', 'esperada uma lista de cases');
  try {
    return cases.map(renderizarCase).join('\n\n');
  } finally {
    caseAtual = '(fora de um case)';
  }
}
