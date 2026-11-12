# Painéis de demonstração Power BI

10 painéis navegáveis, em português e inglês. Desde 12/11/2026 a lista dos painéis
vive na **home**, na aba Power BI da seção Cases (`/#cases-power-bi` e
`/en/#cases-power-bi`), em cartões, com busca e filtro por segmento: o mesmo
desenho dos apps de Power Apps na aba Power Platform. Cada painel tem uma página
própria e um player em tela cheia; o painel em si é um HTML único, com dados 100%
fictícios, em `demos/power-bi/<slug>/app.html`.

O mecanismo é o dos apps. **Leia `docs/DEMOS-POWER-APPS.md`**: regra de dados,
regras dos `app.html` e do iframe, sandbox, `noindex`, F2a. Aqui fica só o que é
próprio dos painéis.

As URLs antigas da galeria (`/demos/power-bi/` e `/en/demos/power-bi/`, publicadas
no PR #27) viraram páginas de redirecionamento para a aba da home: `meta refresh`
(vale sem JS), `location.replace`, `noindex`, canonical para a home e um link
visível. Não estão no sitemap; as 20 páginas de painel estão.

## Onde fica cada coisa

| O quê                                                                          | Onde                                                                                                                         |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Texto de cada painel (empresa, segmento, título, dor, solução, 3 passos, tags) | `src/data/mockups-power-bi.json`, com `{ "pt": ..., "en": ... }` por campo                                                   |
| Textos fixos (aviso, botão "Ver o painel", escopo, player, redirecionamento)   | `T_BI` em `scripts/demos.mjs`; a coleção é `COLECOES.paineis` (caminho, separador " \| ", aba da home)                       |
| Cartão, aviso e tags com ícone                                                 | as mesmas funções dos apps em `scripts/demos.mjs` (`cartaoApp`, `avisoApps`, `tagsApp`), com `col: COLECOES.paineis`         |
| Dicionário das tags (tag → ícone, rótulo por idioma)                           | `TECNOLOGIAS` em `scripts/demos.mjs`, bloco "Painéis de Power BI"                                                            |
| Aba Power BI da home (busca, filtro Segmento, bloco "Painéis de demonstração") | `scripts/cases.mjs`: `DEMOS_DA_AREA['power-bi']`, `corpoComDemos`, rótulos em `DICIONARIO.<idioma>.areas['power-bi']`        |
| Busca e filtros no navegador                                                   | `src/js/principal.js`, "busca e filtros dos cases" (um conjunto por aba; os ids levam a área: `cases-busca-power-bi`)        |
| O painel em si (fonte versionada e aprovada)                                   | `demos/power-bi/<slug>/app.html`                                                                                             |
| Páginas geradas (não editar)                                                   | `demos/power-bi/index.html` (redirecionamento), `demos/power-bi/<slug>/index.html`, `.../tela-cheia/index.html` e `en/`      |
| Testes                                                                         | `tests/cases-abas.spec.js` (aba, busca, filtro, cartões), `tests/paineis.spec.js` (página, player, iframe, redirecionamento) |

## O que difere dos apps

- **Filtros.** A aba Power BI tem busca e o filtro Segmento. Não tem o filtro
  Tecnologia (as tags dos painéis são tipo de painel, recurso do relatório e
  visual, não tecnologias) nem o filtro Tipo (a área não tem projeto documentado).
  Quando um case ganhar `"area": "power-bi"`, o bloco "Projetos documentados" e o
  filtro Tipo aparecem sozinhos.
- **Tags.** De 1 a 4 por painel, sempre o `nome` de uma entrada do dicionário
  `TECNOLOGIAS`; tag fora do dicionário **para o build**. São conceitos: ícone
  neutro Fluent com o nome ao lado, nunca logotipo. Tag nova: entrada no
  dicionário (`nome`, uma chave por outro idioma se o termo se traduz, como
  `en: 'Tabs'`, e `fluent`; termo traduzido para um idioma precisa de todos), ícone em
  `assets/icons/neutral/fluent/`, registro em `assets/icons/manifest.json` (grupo
  `fluent-neutral-set-paineis`) e nome na lista `FLUENT` de `scripts/cases.mjs`.
  Ver `docs/ICONOGRAFIA.md`.
- **Separador.** Segmento e empresa separados por " | " (os apps mantêm o ponto
  médio com que foram publicados). O texto das páginas de painel não usa ponto
  médio, travessão nem seta; um teste confere.
- **Aviso.** "Empresas e dados mockados." (EN "Mock companies and data.", com a
  nota "The demo dashboards are in Portuguese." dentro do aviso). O nome da
  empresa aparece sem "(fictícia)". A página mantém o selo, a linha de escopo
  ("Execução no Power BI: nenhuma…") e o título "Cenário fictício".
- **A palavra "case"** não é usada para painel de demonstração, nem na aba nem
  nas páginas; um teste confere.

## Editar, trocar e acrescentar

- **Texto, tag ou passo:** `src/data/mockups-power-bi.json` (todos os idiomas
  de `src/idiomas.json` juntos; campo sem um deles para o build),
  `npm run build`, `npm run check`.
- **Trocar um painel:** substitua `demos/power-bi/<slug>/app.html` (fonte em
  `D:\Portifolio\case-powerbi\mockups\`), mantenha
  `<meta name="robots" content="noindex">` no `<head>`, `npm run build:check` e
  `npm run check`.
- **11º painel:** `app.html` em `demos/power-bi/<novo-slug>/` e um objeto no fim
  do JSON (`slug`, `empresa`, `segmento`, `titulo`, `dor`, `solucao`, `tags`,
  `passos`). Nenhum número fixo para atualizar: contador, segmentos do filtro,
  sitemap e testes leem o JSON.
