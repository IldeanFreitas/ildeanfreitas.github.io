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

| O quê                                                                                                | Onde                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Texto de cada app (empresa fictícia, segmento, título, dor, solução, 3 passos, tags)                 | `src/data/mockups-power-apps.json`, com `{ "pt": ..., "en": ... }` por campo                                                                                                     |
| Cartão do app, aviso, tags com ícone e textos fixos das páginas (botões, aviso, escopo)              | `scripts/demos.mjs` (objeto `T`, `cartaoApp`, `avisoApps`, `tagsApp`); fonte única para a home e para a página de cada app                                                       |
| Dicionário de tecnologias (tag → ícone; opções do filtro Tecnologia)                                 | `TECNOLOGIAS` em `scripts/demos.mjs`                                                                                                                                             |
| Aba Power Platform da home (busca, filtros, blocos "Apps de demonstração" e "Projetos documentados") | `scripts/cases.mjs` (`corpoComDemos`, `DEMOS_DA_AREA`, rótulos em `DICIONARIO.<idioma>`); comportamento em `src/js/principal.js` ("busca e filtros dos cases", "abas dos cases") |
| O app em si (fonte versionada)                                                                       | `demos/power-apps/<slug>/app.html`                                                                                                                                               |
| Estilo                                                                                               | `src/css/componentes/mockups.css` (cartão, filtros, aviso, página do app) e `src/css/componentes/cases-abas.css` (abas, busca, blocos)                                           |
| Páginas geradas (não editar)                                                                         | `demos/power-apps/index.html` (redirecionamento), `demos/power-apps/<slug>/index.html`, `.../tela-cheia/index.html` e as equivalentes em `en/demos/power-apps/`                  |
| Testes                                                                                               | `tests/cases-abas.spec.js` (aba, busca, filtros, cartões) e `tests/mockups.spec.js` (página do app, player, redirecionamento, sandbox)                                           |

`scripts/mockups.mjs` lê o `index.html` e o `en/index.html` já gerados para
reaproveitar CSS, cabeçalho, rodapé e scripts. Por isso roda depois de
`scripts/build.mjs` (o `npm run build` já encadeia os dois e o sitemap).
`scripts/demos.mjs` não grava nada: pode ser importado pelo build e pelos testes.

Os painéis de demonstração de Power BI usam o mesmo mecanismo (coleção `paineis`
de `COLECOES`, em `scripts/demos.mjs`) e vivem na aba Power BI: o que é próprio
deles está em `docs/DEMOS-POWER-BI.md`.

## Editar o texto de um app

1. Edite `src/data/mockups-power-apps.json` (PT e EN juntos, mesmos fatos).
2. `npm run build`.
3. `npm run check`.

## Tags de tecnologia

- Cada app tem de 1 a 4 tags. Tag é o nome de uma tecnologia do dicionário
  `TECNOLOGIAS` (ex.: `"Power Apps"`, `"SQL Server"`) ou, quando o rótulo muda por
  idioma, `{ "tec": "apis", "pt": "API de CEP", "en": "Postal code API" }`.
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
   `tags`, `passos` (PT e EN, 3 passos em cada).
3. Nada de número fixo para atualizar: a contagem do filtro Tipo ("Apps de
   demonstração (12)"), o contador "N de 14 itens", os segmentos e as opções de
   Tecnologia saem dos dados no build. Os testes também leem slugs, contagens e
   segmentos do JSON.
4. No `app.html` novo, confira as regras abaixo (noindex, `.sr` nos links em nova
   aba, nenhuma requisição externa).
5. `npm run build` e `npm run check`. O sitemap ganha as duas URLs novas sozinho.

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

## F2a (N idiomas): quem entrar por último na main adapta

`scripts/mockups.mjs` e `scripts/demos.mjs` assumem PT e EN (`for (const lang of
['pt','en'])`, objeto `T`), e `scripts/mockups.mjs` reescreve o link de idioma do
cabeçalho e do rodapé das páginas de app em `ajustarNav`. Se o markup do alternador
mudar (a F2a troca o botão por um menu `<details class="idiomas">`), `ajustarNav`
**lança erro** em vez de publicar páginas que levam à home do outro idioma. Quem
entrar por último na main (esta mudança ou a F2a) adapta:

1. `ajustarNav` em `scripts/mockups.mjs` para o menu de idiomas novo (e os idiomas sem
   páginas de app, que ou ganham `T[lang]` ou apontam para as páginas em PT);
2. os rótulos das abas com demonstrações (`abas`, `blocos`, `busca`, `filtros`,
   `contagem`, `vazio` e `areas.<área>.demos`) em `DICIONARIO` de `scripts/cases.mjs`,
   e os textos `T_PA` e `T_BI` de `scripts/demos.mjs`, para cada idioma novo;
3. `scripts/lint-html.mjs` da F2a, para incluir `demos/power-apps/**/index.html`,
   `demos/power-bi/**/index.html` e as equivalentes em `en/` (hoje no `lint:html` do
   `package.json`), o que inclui as quatro páginas de redirecionamento;
4. `scripts/sitemap.mjs` da F2a, para manter as URLs das páginas de app e de painel
   (e só elas: as antigas galerias saíram do sitemap).
