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
├─ css/
│  ├─ ordem.json            ordem de concatenação (a cascata depende dela)
│  ├─ base/                 fonte, tokens, elementos, utilitários
│  └─ componentes/          cabeçalho, hero, cartões, diagrama, rodapé…
└─ js/
   ├─ inicializacao.js      roda no <head>, antes da primeira pintura
   └─ principal.js          roda no fim do <body>

scripts/
├─ build.mjs                monta o index.html
├─ extrair.mjs              a separação original (etapa 2), como registro
└─ serve.mjs                servidor local para auditoria

index.html                  GERADO — não editar
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

## Ordem do CSS

`src/css/ordem.json` define a sequência de concatenação, e ela importa: o CSS
não tem camadas nem escopo, então a cascata depende da ordem dos arquivos.
`base/` vem antes de `componentes/`; dentro de cada um, a ordem é a do arquivo.

Arquivo novo precisa ser declarado ali. O build não varre diretório de
propósito — descoberta automática por nome tornaria a cascata dependente de
ordenação alfabética, que é uma forma silenciosa de quebrar estilo.

## Fim de linha

`.gitattributes` normaliza para LF. Antes da etapa 2 havia CRLF e LF misturados
no mesmo arquivo, e o build gerava um `index.html` diferente do versionado sem
nenhuma mudança de conteúdo — o `build:check` acusaria diferença para sempre.
