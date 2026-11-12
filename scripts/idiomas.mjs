/**
 * Os idiomas do site: lê src/idiomas.json, confere e deriva os caminhos.
 *
 * É a única lista de idiomas do repositório. O build, o sitemap, o lint de
 * HTML, a imagem de compartilhamento e os testes partem dela, e a ordem da
 * lista é a ordem do menu de idiomas. As tabelas por código continuam sendo
 * editadas à mão, uma chave por idioma: DICIONARIO (scripts/cases.mjs, as
 * frases fixas dos diagramas e os rótulos das abas, da busca e dos filtros da
 * seção Cases), os textos das demonstrações (scripts/demos.mjs e
 * src/data/mockups-*.json; ver conferirDemos) e TEXTOS (scripts/gera-icones.mjs,
 * o texto da imagem de compartilhamento). Todas param com mensagem, dizendo a
 * chave, se faltar o idioma.
 *
 * Os arquivos de cada idioma saem por convenção de nome, não por caminho
 * escrito na configuração:
 *
 *   idioma padrão (PT-BR)        outro idioma (código "xx")
 *   src/index.template.html      src/index.xx.template.html
 *   src/data/cases.json          src/data/cases.xx.json
 *   index.html                   xx/index.html            (servido em /xx/)
 *   demos/…/index.html           xx/demos/…/index.html    (scripts/mockups.mjs)
 *   assets/img/og-image.png      assets/img/og-image-xx.png
 *
 * Caminho livre na configuração deixaria o template de um idioma apontar
 * para os cases de outro sem que nada acusasse; com a convenção, o código
 * decide tudo, e o que falta aparece como arquivo ausente.
 *
 * Configuração inválida lança ErroDeIdiomas com todos os problemas de uma
 * vez. Quem chama (build, sitemap, lint) imprime a mensagem e para.
 *
 * A imagem de compartilhamento é a única exceção à regra "arquivo ausente
 * para tudo": quem a gera (gera-icones.mjs) lê a configuração com
 * `exigirImagem: false`, porque exigir o PNG de quem existe para criá-lo
 * trancaria o idioma novo (sem entrada o PNG não sai; com a entrada, nada
 * roda). Build, sitemap e lint de HTML continuam exigindo o arquivo.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

/** Endereço publicado. Canonical, hreflang, og:url e sitemap partem dele. */
export const BASE = 'https://ildeanfreitas.github.io/';

export const ARQUIVO_DE_IDIOMAS = 'src/idiomas.json';

/**
 * Rótulos de interface que os componentes gerados pelo build usam (menu de
 * idiomas). Todo idioma precisa de todos, e de nenhum a mais.
 */
const ROTULOS_DE_INTERFACE = ['escolherIdioma'];

export class ErroDeIdiomas extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroDeIdiomas';
  }
}

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Compara as chaves de dois objetos, recursivamente. Devolve a lista do que
 * falta ou sobra em `outro` em relação a `referencia`, com o caminho de cada
 * chave (`legendaSituacao.previsto`). Serve ao dicionário dos diagramas e aos
 * rótulos de interface: um idioma com chave a menos imprimiria "undefined".
 */
export function diferencasDeChaves(referencia, outro, prefixo = '') {
  const diferencas = [];
  const nomes = new Set([...Object.keys(referencia), ...Object.keys(outro)]);
  for (const nome of nomes) {
    const caminho = prefixo ? `${prefixo}.${nome}` : nome;
    if (!Object.hasOwn(outro, nome)) diferencas.push(`falta "${caminho}"`);
    else if (!Object.hasOwn(referencia, nome)) diferencas.push(`sobra "${caminho}"`);
    else if (ehObjeto(referencia[nome]) !== ehObjeto(outro[nome]))
      diferencas.push(`"${caminho}" tem formato diferente`);
    else if (ehObjeto(referencia[nome]))
      diferencas.push(...diferencasDeChaves(referencia[nome], outro[nome], caminho));
  }
  return diferencas;
}

/** Caminhos de um idioma, pela convenção de nome descrita no topo. */
function caminhosDe(codigo, padrao) {
  const arquivo = padrao ? 'index.html' : `${codigo}/index.html`;
  return {
    template: padrao ? 'src/index.template.html' : `src/index.${codigo}.template.html`,
    cases: padrao ? 'src/data/cases.json' : `src/data/cases.${codigo}.json`,
    arquivo,
    // Pasta das páginas do idioma, com a barra ("" no padrão, "xx/" nos
    // outros): as páginas de demonstração saem em <pasta>demos/…
    pasta: padrao ? '' : `${codigo}/`,
    ogImagem: padrao ? 'assets/img/og-image.png' : `assets/img/og-image-${codigo}.png`,
    // Profundidade da página em relação à raiz: o build troca /assets/ por
    // este prefixo para o site abrir também do disco (file://).
    prefixo: '../'.repeat(arquivo.split('/').length - 1)
  };
}

/**
 * Confere a lista e devolve cada idioma acrescido dos caminhos derivados e da
 * URL publicada. `existe` é injetável para o teste de unidade não depender do
 * disco. `exigirImagem: false` dispensa o PNG de compartilhamento (ver o topo
 * do arquivo); template e cases continuam obrigatórios.
 */
export function validarIdiomas(
  lista,
  existe = (caminho) => existsSync(join(RAIZ, caminho)),
  { exigirImagem = true } = {}
) {
  if (!Array.isArray(lista) || lista.length === 0)
    throw new ErroDeIdiomas(`${ARQUIVO_DE_IDIOMAS} precisa ser uma lista com ao menos um idioma.`);

  const problemas = [];
  const vistos = {
    codigo: new Map(),
    lang: new Map(),
    ogLocale: new Map(),
    sigla: new Map(),
    rotulo: new Map()
  };

  lista.forEach((idioma, i) => {
    const onde = `idioma ${i + 1}${idioma && typeof idioma.codigo === 'string' ? ` ("${idioma.codigo}")` : ''}`;
    if (!ehObjeto(idioma)) {
      problemas.push(`${onde}: esperado um objeto`);
      return;
    }
    for (const campo of ['codigo', 'lang', 'ogLocale', 'rotulo', 'sigla', 'caminho']) {
      if (typeof idioma[campo] !== 'string' || !idioma[campo].trim())
        problemas.push(`${onde}: campo "${campo}" ausente ou vazio`);
    }
    if (typeof idioma.codigo === 'string' && !/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(idioma.codigo))
      problemas.push(
        `${onde}: código "${idioma.codigo}" inválido (minúsculas, como "es" ou "pt-pt"; vira pasta e nome de arquivo)`
      );
    if (typeof idioma.lang === 'string' && !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(idioma.lang))
      problemas.push(`${onde}: lang "${idioma.lang}" não é uma etiqueta BCP 47 (ex.: "pt-BR")`);
    // Região: duas letras (ISO 3166, "pt_BR") ou três dígitos (UN M.49, "es_419":
    // América Latina e Caribe), para idioma que não é de um país só.
    if (
      typeof idioma.ogLocale === 'string' &&
      !/^[a-z]{2,3}_(?:[A-Z]{2}|\d{3})$/.test(idioma.ogLocale)
    )
      problemas.push(
        `${onde}: ogLocale "${idioma.ogLocale}" fora do formato "pt_BR" (ou "es_419", com região numérica)`
      );
    if (idioma.padrao !== undefined && typeof idioma.padrao !== 'boolean')
      problemas.push(`${onde}: "padrao" precisa ser true ou false`);
    if (!ehObjeto(idioma.interface)) problemas.push(`${onde}: bloco "interface" ausente`);
    else {
      for (const rotulo of ROTULOS_DE_INTERFACE)
        if (typeof idioma.interface[rotulo] !== 'string' || !idioma.interface[rotulo].trim())
          problemas.push(`${onde}: rótulo de interface "${rotulo}" ausente ou vazio`);
      for (const rotulo of Object.keys(idioma.interface))
        if (!ROTULOS_DE_INTERFACE.includes(rotulo))
          problemas.push(`${onde}: rótulo de interface desconhecido "${rotulo}"`);
    }
    for (const [campo, mapa] of Object.entries(vistos)) {
      const valor = idioma[campo];
      if (typeof valor !== 'string') continue;
      const chave = valor.toLowerCase();
      if (mapa.has(chave))
        problemas.push(`${campo} "${valor}" repetido (idiomas ${mapa.get(chave)} e ${i + 1})`);
      else mapa.set(chave, i + 1);
    }
  });

  const padroes = lista.filter((idioma) => ehObjeto(idioma) && idioma.padrao === true);
  if (padroes.length !== 1)
    problemas.push(
      `exatamente um idioma precisa de "padrao": true; encontrados ${padroes.length}${
        padroes.length > 1 ? ` (${padroes.map((p) => p.codigo).join(', ')})` : ''
      }`
    );

  if (problemas.length)
    throw new ErroDeIdiomas(`${ARQUIVO_DE_IDIOMAS} inválido:\n  ${problemas.join('\n  ')}`);

  const idiomas = lista.map((idioma) => {
    const padrao = idioma.padrao === true;
    return {
      ...idioma,
      padrao,
      ...caminhosDe(idioma.codigo, padrao),
      url: BASE + idioma.caminho.replace(/^\//, '')
    };
  });

  // O endereço segue a pasta do arquivo gerado; um caminho diferente faria o
  // hreflang e o menu apontarem para uma página que não existe.
  for (const idioma of idiomas) {
    const esperado = idioma.padrao ? '/' : `/${idioma.codigo}/`;
    if (idioma.caminho !== esperado)
      problemas.push(
        `idioma "${idioma.codigo}": caminho "${idioma.caminho}", esperado "${esperado}" (a página é gerada em ${idioma.arquivo})`
      );
    for (const campo of exigirImagem ? ['template', 'cases', 'ogImagem'] : ['template', 'cases'])
      if (!existe(idioma[campo]))
        problemas.push(`idioma "${idioma.codigo}": arquivo ausente ${idioma[campo]}`);
  }

  if (problemas.length)
    throw new ErroDeIdiomas(`${ARQUIVO_DE_IDIOMAS} inválido:\n  ${problemas.join('\n  ')}`);

  return idiomas;
}

/**
 * Lê src/idiomas.json do disco e confere. Síncrono: os testes importam no
 * topo. As opções são as de validarIdiomas (hoje, `exigirImagem`).
 */
export function lerIdiomas(opcoes) {
  const caminho = join(RAIZ, ARQUIVO_DE_IDIOMAS);
  if (!existsSync(caminho))
    throw new ErroDeIdiomas(`${ARQUIVO_DE_IDIOMAS} não encontrado: é a lista de idiomas do site.`);
  let lista;
  try {
    lista = JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    throw new ErroDeIdiomas(`${ARQUIVO_DE_IDIOMAS} não é JSON válido: ${erro.message}`);
  }
  return validarIdiomas(lista, undefined, opcoes);
}

/**
 * Para scripts de linha de comando: lê os idiomas ou encerra com a mensagem,
 * sem pilha (ela já diz o arquivo e o problema).
 */
export function lerIdiomasOuSair(opcoes) {
  try {
    return lerIdiomas(opcoes);
  } catch (erro) {
    if (!(erro instanceof ErroDeIdiomas)) throw erro;
    console.error(erro.message);
    process.exit(1);
  }
}
