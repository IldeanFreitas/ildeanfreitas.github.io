# Apps de demonstração Power Apps

12 apps navegáveis, em português e inglês. Desde 11/11/2026 a lista dos apps vive
na **home**, na aba Power Platform da seção Cases (`/#cases-power-platform` e
`/en/#cases-power-platform`), junto com os projetos documentados da área, com
busca e filtros. Cada app tem uma página própria e um player em tela cheia; o app
em si é um HTML único, com dados 100% fictícios, guardado em
`demos/power-apps/<slug>/app.html`. Nada disso faz requisição externa.

As URLs antigas da galeria (`/demos/power-apps/` e `/en/demos/power-apps/`) viraram
páginas de redirecionamento para a aba da home: `meta refresh` (vale sem JS),
`location.replace`, `noindex`, canonical para a home e um link visível. Não estão
no sitemap.

## Onde fica cada coisa

| O quê                                                                                                | Onde                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Texto de cada app (empresa fictícia, segmento, título, dor, solução, 3 passos, tags)                 | `src/data/mockups-power-apps.json`, com um texto por idioma em cada campo (`{ "pt": ..., "en": ... }`)                                                                                                                       |
| Cartão do app, aviso, tags com ícone e textos fixos das páginas (botões, aviso, escopo)              | `scripts/demos.mjs` (tabela `T_PA`, `cartaoApp`, `avisoApps`, `tagsApp`); fonte única para a home e para a página de cada app                                                                                                |
| Dicionário de tecnologias (tag → ícone; opções do filtro Tecnologia)                                 | `TECNOLOGIAS` em `scripts/demos.mjs`                                                                                                                                                                                         |
| Aba Power Platform da home (busca, filtros, blocos "Apps de demonstração" e "Projetos documentados") | `scripts/cases.mjs` (`corpoComDemos`, `DEMOS_DA_AREA`, rótulos em `DICIONARIO.<idioma>`); comportamento em `src/js/principal.js` ("busca e filtros dos cases", "abas dos cases")                                             |
| O app em si (fonte versionada)                                                                       | `demos/power-apps/<slug>/app.html`                                                                                                                                                                                           |
| Estilo                                                                                               | `src/css/componentes/mockups.css` (cartão, filtros, aviso, página do app) e `src/css/componentes/cases-abas.css` (abas, busca, blocos)                                                                                       |
| Páginas geradas (não editar)                                                                         | `demos/power-apps/index.html` (redirecionamento), `demos/power-apps/<slug>/index.html`, `.../tela-cheia/index.html` e as equivalentes na pasta de cada idioma (`en/demos/…`)                                                 |
| Testes                                                                                               | `tests/cases-abas.spec.js` (aba, busca, filtros, cartões), `tests/mockups.spec.js` (página do app, player, redirecionamento, sandbox) e `tests/idiomas.spec.js` (menu, canonical e `hreflang` de cada página em cada idioma) |

`scripts/mockups.mjs` lê a home já gerada de cada idioma de `src/idiomas.json`
(`index.html`, `en/index.html`) para reaproveitar CSS, cabeçalho, rodapé e
scripts. Por isso roda depois de
`scripts/build.mjs` (o `npm run build` já encadeia os dois e o sitemap).
`scripts/demos.mjs` não grava nada: pode ser importado pelo build e pelos testes.

Os painéis de demonstração de Power BI usam o mesmo mecanismo (coleção `paineis`
de `COLECOES`, em `scripts/demos.mjs`) e vivem na aba Power BI: o que é próprio
deles está em `docs/DEMOS-POWER-BI.md`.

## Editar o texto de um app

1. Edite `src/data/mockups-power-apps.json` (todos os idiomas juntos, mesmos
   fatos; campo sem um dos idiomas de `src/idiomas.json` para o build).
2. `npm run build`.
3. `npm run check`.

## Tags de tecnologia

- Cada app tem de 1 a 4 tags. Tag é o nome de uma tecnologia do dicionário
  `TECNOLOGIAS` (ex.: `"Power Apps"`, `"SQL Server"`) ou, quando o rótulo é próprio
  do app, `{ "tec": "apis", "pt": "API de CEP", "en": "Postal code API" }`, com uma
  chave por idioma.
- Tag fora do dicionário **para o build**: todo cartão mostra ícone, e ícone
  desconhecido não cai num genérico. Tecnologia nova entra no dicionário com
  `marca` (logotipo registrado em `assets/icons/manifest.json`) ou `fluent` (ícone
  neutro que também precisa estar em `FLUENT`, em `scripts/cases.mjs`). Ver
  `docs/ICONOGRAFIA.md`.
- O filtro Tecnologia mostra, na ordem do dicionário, as tecnologias usadas por
  algum app ou projeto. Os projetos entram pelas tags do case (`tambem` no
  dicionário: "Power Apps Canvas" conta como Power Apps, "Power Automate Desktop"
  como Power Automate, "REST" como APIs).
- Regra de coerência (decisão de 11/11/2026): toda tag precisa estar sustentada
  pelo painel "Como seria na Power Platform" do app; o que o app não sustenta não
  vira tag.

## Substituir um `app.html`

1. Troque o arquivo em `demos/power-apps/<slug>/app.html`.
2. `npm run build:check` (confere que as páginas geradas continuam em dia e que
   o arquivo existe) e depois `npm run check`.

O `app.html` não passa pelo gerador: o que está nele é o que o visitante vê no
iframe. Confira a varredura de dados abaixo antes de commitar.

## Acrescentar um 13º app

1. Crie `demos/power-apps/<novo-slug>/app.html` (o slug vira parte da URL).
2. Acrescente um objeto no fim de `src/data/mockups-power-apps.json`, com todos os
   campos dos outros: `slug`, `empresa`, `segmento`, `titulo`, `dor`, `solucao`,
   `tags`, `passos` (um texto por idioma em cada campo, 3 passos em cada idioma).
3. Nada de número fixo para atualizar: a contagem do filtro Tipo ("Apps de
   demonstração (12)"), o contador "N de 14 itens", os segmentos e as opções de
   Tecnologia saem dos dados no build. Os testes também leem slugs, contagens e
   segmentos do JSON.
4. No `app.html` novo, confira as regras abaixo (noindex, `.sr` nos links em nova
   aba, nenhuma requisição externa).
5. `npm run build` e `npm run check`. O sitemap ganha as URLs novas sozinho (uma
   por idioma), e o `build:check` acusa o sitemap se o build não tiver rodado.

## Regra de dados: 100% fictícios

- Nenhum dado real: nome de pessoa, empresa, cliente, empregador, projeto,
  documento (CPF, CNPJ), telefone, endereço, e-mail ou placa.
- E-mails só em domínio `.example`; telefones só com DDD `00`.
- Nome de empresa inventado e que não lembre cliente ou empregador do autor nem
  empresa conhecida; nome de pessoa comum, sem homônimo conhecido.
- Nenhum projeto real do autor pode ser divulgado, nem pelo título nem pela
  estrutura.
- O app não faz requisição de rede (sem `fetch`, `XMLHttpRequest`, `@import`,
  `<script src>`, `<link href>` externos, imagem remota). Só links
  `target="_blank"` para a documentação da Microsoft são aceitos.
- Cada app traz o banner "Mockup interativo · dados fictícios" e o `<title>` com
  "Mockup".
- Aviso único, na home e na página de cada app: "Empresas e dados mockados."
  (EN "Mock companies and data."; nas páginas em inglês a nota "The demo apps are
  in Portuguese." fica dentro do aviso). Por isso o nome da empresa aparece sem
  "(fictícia)". A página de cada app mantém o selo, a linha de escopo ("Execução
  na Power Platform: nenhuma") e o título "Cenário fictício".

## Regras dos `app.html` e do iframe

- Todo `app.html` tem `<meta name="robots" content="noindex">` logo depois do
  `viewport` (o app solto, fora da página, não deve aparecer em busca). O player
  (`tela-cheia/`) e o redirecionamento da galeria também são `noindex`. Um teste
  falha se faltar em algum.
- Link `target="_blank"` dentro do app leva `<span class="sr"> (abre em nova aba)</span>`
  (a classe `.sr` já existe no CSS de cada app) e mostra o título da página de destino,
  não a URL crua. Nos painéis do Learn (inspecao-via, obra, ordens-servico, rebanho) os
  títulos ficam no mapa `TL` do próprio app; um teste falha se alguma URL citada não
  tiver título. O link tem alvo de pelo menos 24 px de altura e não quebra no meio da
  palavra.
- O sandbox dos iframes é um só, a constante `SANDBOX` em `scripts/mockups.mjs`
  (página do app e player): `allow-scripts allow-modals allow-forms allow-popups
allow-popups-to-escape-sandbox`. Sem `allow-forms` o submit dos formulários não
  dispara; sem `allow-popups` os links do Learn não abrem. Não há `allow-same-origin`:
  nenhum app usa storage, cookie, `parent` ou `postMessage`. Se um app novo precisar,
  isso é decisão de arquitetura, não ajuste de linha.
- As páginas de demos usam `/assets/...` absoluto e os apps são carregados por
  caminho de raiz: elas **não abrem por file://**. Para ver, use `npm run dev` ou
  `npm run serve`. O `app.html` sozinho abre por file://, e a home também.

## Idiomas (F2a): como ficou

As demonstrações seguem a lista de idiomas de `src/idiomas.json`, como o resto do
site. Nenhum script daqui cita "pt" ou "en": o laço é sobre a configuração. A
regra geral e o passo a passo de um idioma novo estão em `docs/ARQUITETURA.md`
("Idiomas: uma configuração, um esqueleto"); o que toca as demonstrações:

- **Textos exigidos por idioma.** `conferirDemos` (`scripts/demos.mjs`) para o
  build, e o `scripts/mockups.mjs` sozinho, com uma linha por chave que falta:
  entrada do idioma em `T_PA` e em `T_BI` com as mesmas chaves do `pt`; `segmento`,
  `titulo`, `dor`, `solucao` e `passos` (na mesma quantidade) de cada app e de cada
  painel; rótulo de cada tag escrita como objeto; e, em `TECNOLOGIAS`, tradução de
  todo termo que já tem tradução para outro idioma. Os rótulos da aba (bloco,
  busca, filtros, contador) estão em `DICIONARIO`, de `scripts/cases.mjs`, e são
  exigidos por `conferirDicionario`.
- **Endereço e `lang`** vêm da configuração (`idiomaDe`, `enderecoDe`); `T_PA` e
  `T_BI` não têm mais `base`, `home` nem `lang`.
- **Menu de idiomas nas páginas de app.** A página reaproveita o cabeçalho e o
  rodapé da home do idioma, e `ajustarNav` (`scripts/mockups.mjs`) troca o destino
  de cada link de idioma, no menu `<details class="idiomas">` e no rodapé, pela
  mesma página naquele idioma. Se a quantidade de links reescritos não for a
  esperada (um por idioma no menu, um por outro idioma no rodapé), o script lança
  erro: marcação do menu que muda não publica página com menu errado.
- **Canonical e `hreflang`**: a página aponta para ela mesma em cada idioma, com
  `x-default` na do PT-BR. Player e redirecionamento continuam `noindex`, sem
  `hreflang` e sem menu de idiomas, cada um no idioma da sua pasta.
- **Lint e sitemap.** `scripts/lint-html.mjs` valida `demos/**/index.html` e
  `<código>/demos/**/index.html` (redirecionamentos incluídos; os `app.html`, não).
  `scripts/sitemap.mjs` lista a página de cada app e de cada painel em cada idioma
  (os redirecionamentos e o player ficam fora) e o `--check` compara tudo menos o
  `lastmod`.
- **O `app.html` é um só, em português.** Idioma novo não ganha mockup traduzido:
  ganha a `notaIdioma` ("The demo apps are in Portuguese.") e o roteiro com os
  rótulos do app em português e a tradução entre parênteses. Por isso os `app.html`
  ficam fora do teste de "português esquecido".
