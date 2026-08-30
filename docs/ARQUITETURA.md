# Arquitetura

Site estático, sem framework e sem dependência de runtime. O que existe de
ferramental serve para desenvolver e verificar — nada disso chega ao navegador.

## A decisão que explica o resto

**Separado na origem, junto na entrega.**

O reflexo, ao encontrar 1.200 linhas num arquivo, é mover CSS e JavaScript para
arquivos externos. Isso melhoraria o cache em visitas repetidas e _pioraria_ a
primeira visita — que aqui é a única que importa. Um portfólio é aberto uma vez,
por alguém avaliando, e um `<link rel="stylesheet">` custa um round trip
bloqueante antes da primeira pintura.

Então o código-fonte fica em módulos legíveis, e `npm run build` os concatena de
volta para dentro de um `index.html` único. Manutenibilidade na origem,
desempenho na entrega, sem escolher entre as duas.

`index.html` passa a ser **artefato gerado**. Editá-lo funciona até o próximo
build. O CI roda `npm run build:check` e falha se o gerado divergir da fonte.

## E por que não um framework

React, Vue ou Astro resolveriam a duplicação dos cases. Nenhum se justifica: uma
página, sem estado, sem rota, sem dado remoto. O custo seria trocar zero
dependência de runtime por dezenas, mais um `node_modules` a manter e uma
superfície de segurança nova — num site que hoje não faz uma única requisição a
terceiros.

Se o portfólio virar multipágina com blog, a decisão merece nova avaliação. Hoje
seria regressão vestida de modernização.

## Estrutura

```text
src/                        fonte — é aqui que se edita
├─ index.template.html      estrutura, com marcadores <!--{{ ... }}-->
├─ 404.template.html        página de erro
├─ css/
│  ├─ ordem.json            ordem de concatenação e camada de cada arquivo
│  ├─ base/                 fonte, tokens, elementos, utilitários
│  └─ componentes/          cabeçalho, hero, cartões, diagrama, rodapé…
├─ data/
│  └─ cases.json            os seis cases
└─ js/
   ├─ inicializacao.js      roda no <head>, antes da primeira pintura
   └─ principal.js          roda no fim do <body>

scripts/
├─ build.mjs                monta index.html e 404.html
├─ cases.mjs                renderiza os cases a partir do JSON
├─ sitemap.mjs              lastmod a partir do último commit
├─ serve.mjs                servidor local para auditoria
├─ extrair.mjs              a separação de CSS/JS (etapa 2), como registro
└─ extrair-cases.mjs        a extração dos cases (etapa 3b), como registro

index.html                  GERADO — não editar
404.html                    GERADO — não editar
sitemap.xml                 GERADO — não editar
```

## Os dois scripts do site

A divisão não é organizacional, é temporal.

**`inicializacao.js`** roda no `<head>`, síncrono, antes de qualquer pintura.
Só cabe ali o que produziria um defeito visível se esperasse: restaurar o tema
salvo (senão pisca o tema errado) e habilitar a animação de entrada (senão o
conteúdo pisca de visível para oculto).

**`principal.js`** roda no fim do `<body>`, com o DOM pronto. Cada
funcionalidade é uma chamada isolada de `iniciar(nome, fn)`, com guarda de
existência. Uma exceção é registrada no console e não alcança as demais — antes,
tudo vivia num escopo só e um `TypeError` na primeira linha derrubava tema,
menu, navegação, revelação e modal de uma vez.

## A trava da animação

O conteúdo nasce visível. `inicializacao.js` adiciona `.js-anima` na raiz, o que
liga a animação de entrada, e arma um temporizador de 1,2s. Se `principal.js`
não marcar `data-revelacao-pronta` nesse intervalo — porque falhou, foi
bloqueado ou nunca chegou —, a classe é removida e tudo reaparece.

Cobre os três cenários:

| Cenário                | Resultado                       |
| ---------------------- | ------------------------------- |
| JavaScript funcionando | anima ao rolar                  |
| JavaScript desativado  | tudo visível, sem animação      |
| Script lança exceção   | a trava dispara, tudo reaparece |

## Os cases vêm de dados

Os seis cases moram em `src/data/cases.json` e o HTML sai de
`scripts/cases.mjs` **em tempo de build**. Montá-los no navegador resolveria a
duplicação e destruiria o SEO: o conteúdo precisa estar no HTML que o servidor
entrega, que é o que o buscador lê e o que aparece sem JavaScript.

O que a conversão evita não é hipotético. Enquanto os seis eram blocos quase
iguais mantidos à mão, um deles tinha divergido: usava
`class="button button--secondary"`, que **não existe no CSS**. O link do
repositório renderizava como texto simples — `display:inline`, sem borda, sem
padding — enquanto os outros quatro eram pílulas. Ninguém percebeu porque o
HTML era válido e nada quebrava.

O diagrama tem duas formas, ambas no esquema:

| Forma     | Usada por | Estrutura                               |
| --------- | --------- | --------------------------------------- |
| `fluxo`   | 5 cases   | uma sequência de etapas                 |
| `camadas` | DataOps   | zonas, uma delas com camadas empilhadas |

Case novo é um objeto no JSON. Mudança na anatomia do cartão é uma edição em
`cases.mjs`, não seis.

### O rótulo do escopo é dado, não constante

Cinco cases abrem o parágrafo com **Declaração de escopo:** e o da Câmara com
**Evidências:**. A primeira versão do renderizador fixava o texto e apagava o
do case divergente — o que foi pego comparando o DOM antes e depois, nó a nó,
e não teria aparecido em nenhum teste de comportamento.

## Cascata: camadas e ordem

O build declara `@layer base, componentes, utilitarios` e envolve cada arquivo
na sua camada. A camada decide quem vence, **independentemente de
especificidade**.

Isso resolveu um problema concreto. Ao trocar os atributos `style` por classes,
os utilitários passaram a perder para regras de componente — `.card
p:last-of-type` vale 0,2,1 e `.texto-miudo` vale 0,1,0 — e o texto voltava ao
tamanho do cartão sem nada quebrar visivelmente. As alternativas seriam
duplicar seletores até vencer, que vira corrida armamentista, ou `!important`,
que ninguém desfaz depois.

`fonte.css` e `tokens.css` ficam fora de camada: `@font-face` e `:root` não
participam de conflito de cascata.

Dentro de cada camada a ordem ainda importa, e quem a define é
`src/css/ordem.json`. Arquivo novo precisa ser declarado ali. O build não varre
diretório de propósito — descoberta automática por nome tornaria a cascata
dependente de ordenação alfabética, que é uma forma silenciosa de quebrar
estilo.

## Fim de linha

`.gitattributes` normaliza para LF. Antes da etapa 2 havia CRLF e LF misturados
no mesmo arquivo, e o build gerava um `index.html` diferente do versionado sem
nenhuma mudança de conteúdo — o `build:check` acusaria diferença para sempre.
