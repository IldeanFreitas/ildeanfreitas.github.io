# Qualidade e rede de proteção

Como verificar que uma mudança no site não quebrou nada.

## Comandos

```bash
npm install                 # uma vez
npx playwright install chromium

npm run lint                # CSS, JavaScript e HTML
npm test                    # comportamento, acessibilidade e sem-JavaScript
npm run test:visual         # regressão visual (só local — ver abaixo)
npm run serve               # http://localhost:4173
```

## O que cada suíte protege

| Arquivo                            | Protege                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/sem-javascript.spec.js`     | Que o conteúdo continue legível sem JavaScript, e o menu de idiomas abra, em todos os idiomas                                                                                                                                                                                                                                                                          |
| `tests/comportamento.spec.js`      | As funcionalidades inventariadas no diagnóstico                                                                                                                                                                                                                                                                                                                        |
| `tests/acessibilidade.spec.js`     | axe-core nos dois temas (padrão) e no escuro (outros idiomas), menu de idiomas aberto, contraste, piso de fonte                                                                                                                                                                                                                                                        |
| `tests/idiomas.spec.js`            | SEO por idioma (`lang`, canonical, `hreflang` recíproco, `og:locale`), na home e em toda página de app e de painel; menu de idiomas (estado expandido, rótulo longo, página sem o menu, a mesma página em cada idioma nas demonstrações); redirecionamento e player no próprio idioma; paridade com o PT-BR e texto sem letra do idioma errado nem português esquecido |
| `tests/movimento-reduzido.spec.js` | Diagramas e menu de idiomas parados com `prefers-reduced-motion: reduce`, e animando sem ele                                                                                                                                                                                                                                                                           |
| `tests/visual.spec.js`             | Que a refatoração não mude o desenho da página                                                                                                                                                                                                                                                                                                                         |
| `tests/unidade/*.unit.mjs`         | Gerador de cases, configuração de idiomas, sitemap (com as demonstrações), paridade estrutural dos cases, textos das demonstrações em todos os idiomas e nomes de empresa (`node --test`)                                                                                                                                                                              |

Os testes por idioma partem de `src/idiomas.json`: um idioma novo entra
neles ao entrar na configuração. A **paridade** compara cada idioma com o
PT-BR: seções, cases, contagens (`h2`, `h3`, `h4`, tags, cartões de
demonstração, itens de Trajetória e Formação, parágrafos e itens de lista),
links externos e números do texto visível. As normalizações (separador de
milhar e decimal, "10 mil" × "10,000", localidade do Microsoft Learn) estão
documentadas no próprio teste. Com JavaScript a seção Cases mostra uma aba
por vez; a paridade e o teste de texto abrem todos os painéis antes de ler,
para que os apps, os painéis e os cases das quatro abas entrem na conta. A
paridade roda também em cada página de app e de painel (contagens, passos do
roteiro, links e números).

Dois testes completam a paridade, porque o que ela não vê é onde a tradução
costuma falhar:

- **Texto sem o idioma errado** (`tests/idiomas.spec.js`): em cada idioma que
  não é o padrão, o texto visível e o que fica fora da tela (`alt`,
  `aria-label`, `<title>`, descrições, JSON-LD) não pode ter letra que o
  idioma não usa (`ã` em inglês, `ç` em espanhol), mais de duas
  palavras-função do PT-BR ("não", "você", "para o", "de uma") nem frase igual
  à do PT-BR. A tabela `REGRAS_DE_IDIOMA`, no próprio teste, tem uma entrada
  por código de idioma: quem acrescenta um idioma precisa preenchê-la, e o
  teste falha dizendo o que escrever. Nome próprio no meio da frase e os
  nomes dos idiomas no menu (elementos com `lang` próprio) ficam de fora.
  O teste lê a home de cada idioma, com as quatro abas. **Os `app.html` dos
  apps e dos painéis não entram**: são em português por decisão, e as páginas
  dos outros idiomas avisam ("The demo apps are in Portuguese.", "Las
  aplicaciones de demostración están en portugués."). As páginas
  de app e de painel também não: o roteiro de teste de cada uma cita os
  rótulos do app em português, com a tradução entre parênteses.
- **Paridade estrutural dos cases** (`tests/unidade/idiomas.unit.mjs`): os
  JSONs de cases de todos os idiomas têm as mesmas chaves, e os campos que não
  são texto traduzido (variante do selo, ícone, produto, `id`, link, números,
  booleanos) têm o mesmo valor. Hoje são 538 caminhos, os mesmos nos dois.

- **Textos das demonstrações** (`tests/unidade/idiomas.unit.mjs`):
  `conferirDemos` não acha falta nos dados publicados, e acusa, com a chave,
  idioma sem entrada em `T_PA`/`T_BI`, campo de `mockups-*.json` sem o idioma,
  passos em quantidade diferente e termo de `TECNOLOGIAS` sem tradução.

O `sitemap.xml` entra no `npm run build:check` (`node scripts/sitemap.mjs
--check`), comparado sem o `lastmod`; as páginas geradas das demonstrações
também (`node scripts/mockups.mjs --check`). O `lint:html`
(`scripts/lint-html.mjs`) valida a home de cada idioma, a 404 e todo
`index.html` de `demos/` e de `<código>/demos/`.

## Nenhum nome de empresa no repositório

O portfólio não nomeia empresa, nem cliente nem empregador, e o repositório é
público: **a lista dos nomes proibidos não pode estar nele**. O teste
`tests/unidade/nomes.unit.mjs` a lê de um arquivo fora do repositório,
apontado pela variável de ambiente `PORTFOLIO_NOMES_PROIBIDOS` (um nome por
linha; linhas vazias e começadas por `#` são ignoradas):

```bash
PORTFOLIO_NOMES_PROIBIDOS=C:/caminho/fora/do/repositorio/nomes.txt npm run test:unit
```

Sem a variável (o caso do CI) o teste aparece como **ignorado**, com essa
mesma instrução, e não falha. Com ela, varre todo arquivo de texto do
repositório, o que inclui a página gerada, o template e os cases de **cada**
idioma de `src/idiomas.json` (um teste que dispensa a lista confere que cada
idioma da configuração está na varredura) e as demonstrações: os dados
(`src/data/mockups-*.json`), o `app.html` de cada app e de cada painel e as
páginas geradas de cada um em cada idioma (`demos/**` e `<código>/demos/**`;
outro teste sem lista confere arquivo por arquivo). A comparação ignora maiúscula e
acento e exige o nome inteiro. Nome que também é palavra comum do português
vai com um `=` na frente (`=Nome`) e passa a respeitar maiúscula e acento;
sem isso a varredura acusaria o verbo no meio de uma frase. A falha diz o
arquivo e a linha, e a linha da lista, nunca o nome. O teste também falha se
o arquivo da lista estiver dentro do repositório.

## Regressão visual roda só localmente

Duas razões, ambas concretas.

**As capturas dependem do sistema operacional.** O rasterizador de fonte do
Linux produz pixels diferentes dos do Windows, e os arquivos nascem com sufixo
de plataforma (`pagina-dark-desktop-win32.png`). Rodar a suíte no CI compararia
contra outra máquina e falharia sempre, sem apontar defeito algum.

**E são pesadas.** Um conjunto completo passa de 21 MB. Versioná-las faria o
Git guardar cada revisão para sempre, num repositório cujo conteúdo real são
72 KB de HTML.

Por isso `tests/*-snapshots/` está no `.gitignore` e o fluxo é local:

```bash
npm run baseline        # ANTES de começar a etapa — fotografa o estado atual
# ... faz a refatoração ...
npm run test:visual     # AO TERMINAR — compara contra a fotografia
```

A referência é transitória de propósito: ela existe para provar que uma etapa
específica não mudou o desenho, não para descrever o site em definitivo.

**Por idioma:** o idioma padrão tem página inteira nos dois temas; cada outro
idioma de `src/idiomas.json`, só no escuro (`pagina-<código>.png`), nas três
larguras. O CSS é o mesmo em todas as páginas; o que muda entre idiomas é o
comprimento do texto, e o escuro já mostra isso.

**Regravar demora mais que comparar.** O Playwright só grava uma captura
"estável": duas capturas seguidas idênticas da página inteira. Com quatro
processos disputando a CPU, o prazo de 15 s estourava em metade das páginas
inteiras. Por isso `npm run baseline` roda em um processo só e, só na
gravação, o prazo de cada captura sobe para 60 s (`prazoDaCaptura` em
`tests/visual.spec.js`). Gravação é `--update-snapshots=all` ou `changed` (o
baseline) **e** o modo `missing`, que é o padrão do Playwright: na primeira
vez que um idioma novo entra, `npm run test:visual` grava a captura que não
existe, e para essa o prazo também sobe. As que já têm referência continuam
comparando com 15 s, para uma captura que mudou falhar logo.

### A armadilha que já pegou aqui

A primeira versão desta suíte trocava o tema com `addInitScript`. Naquele
momento o documento ainda não existe, e o `data-theme="dark"` fixo no HTML
sobrescrevia o valor — as capturas `dark` e `light` saíam **byte a byte
idênticas**, e a suíte passava sem comparar nada.

Por isso cada teste de tema afirma a cor de fundo antes de capturar. Se a troca
não pegar, o teste falha dizendo o que houve, em vez de aprovar uma referência
vazia.

## Baseline registrada em 2026-08-30

Estado do commit `813fbb5` com o ferramental da etapa 0 instalado:

```
53 passed · 12 failed · 1 skipped
```

As 12 falhas são **quatro defeitos reais, cada um reproduzido nas três
viewports** — não instabilidade de teste. São a prova executável do diagnóstico:

| Teste que falha                                 | Defeito                                 | Etapa que corrige |
| ----------------------------------------------- | --------------------------------------- | ----------------- |
| `o conteúdo revelável está visível`             | `.reveal{opacity:0}` escondia 9 blocos  | 1                 |
| `remover um elemento opcional…`                 | IIFE sem isolamento de falhas           | 1                 |
| `a escolha de tema sobrevive ao recarregamento` | Sem persistência em `localStorage`      | 5                 |
| `index sem violações — tema light`              | `.case-visual{background:#000}` literal | 1                 |

O teste pulado é o do menu compacto em desktop, onde ele não existe.

Um teste desta tabela voltar a falhar depois da sua etapa significa regressão,
não expectativa desatualizada.

## Etapa 1 — resultado

```
53 passed · 0 failed · 1 skipped
```

Os quatro defeitos foram corrigidos. A persistência de tema e o
`aria-current="location"` foram trazidos da etapa 5 porque estavam dentro do
bloco de JavaScript que a etapa 1 já reescrevia por inteiro — adiá-los
significaria editar o mesmo código duas vezes.

Degradação verificada nos três cenários, com 9 blocos `.reveal`:

| Cenário                        | Blocos ocultos      | `js-anima`               |
| ------------------------------ | ------------------- | ------------------------ |
| JavaScript funcionando         | 9 (animam ao rolar) | sim                      |
| JavaScript desativado          | 0                   | não                      |
| Script principal lança exceção | 0                   | não, removida pela trava |

O terceiro cenário é o que a trava de 1,2s no `<head>` existe para cobrir: o
script quebra antes de confirmar `data-revelacao-pronta`, a classe cai sozinha
e o conteúdo aparece.

### O portão visual foi apertado nesta etapa

`maxDiffPixelRatio` estava em `0.01`. Numa captura de página inteira, que tem
milhares de pixels de altura, 1% é área suficiente para esconder a mudança de
cor de um bloco inteiro — e escondeu: a correção de contraste do `figcaption`
passou despercebida na primeira execução.

Agora são duas tolerâncias com papéis separados: `threshold: 0.2` absorve
antialiasing por pixel, e `maxDiffPixelRatio: 0.0005` limita a área. Com o
ajuste, a mesma correção apareceu como 21.264 pixels no tema claro e **zero no
escuro** — que é exatamente onde ela deveria aparecer.

## Regras de lint deliberadamente afrouxadas

`no-inline-style` está em `warn`, não `error`: o site tem 15 atributos `style`
de espaçamento, previstos para sair na etapa 3. Vira `error` quando o último
sair.

As regras cosméticas do stylelint — linha em branco antes de at-rule, tamanho de
hex, caixa de palavra-chave — estão desligadas. O CSS é escrito num estilo
compacto deliberado, e essas regras brigariam com a escolha do autor sem apontar
defeito nenhum.
