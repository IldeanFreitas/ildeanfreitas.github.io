# Apps de demonstração Power Apps

Galeria de 12 apps navegáveis, em português e inglês, em `/demos/power-apps/` e
`/en/demos/power-apps/`. Cada app é um HTML único, com dados 100% fictícios,
guardado em `demos/power-apps/<slug>/app.html`. O gerador monta a galeria, uma
página por app e o player em tela cheia. Nada disso faz requisição externa.

## Onde fica cada coisa

| O quê                                                                                | Onde                                                                                                                                         |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Texto de cada app (empresa fictícia, segmento, título, dor, solução, 3 passos, tags) | `src/data/mockups-power-apps.json`, com `{ "pt": ..., "en": ... }` por campo                                                                 |
| Textos fixos das páginas (título da galeria, botões, aviso, escopo)                  | objeto `T` em `scripts/mockups.mjs`                                                                                                          |
| O app em si (fonte versionada)                                                       | `demos/power-apps/<slug>/app.html`                                                                                                           |
| Estilo da galeria                                                                    | `src/css/componentes/mockups.css`                                                                                                            |
| Páginas geradas (não editar)                                                         | `demos/power-apps/index.html`, `demos/power-apps/<slug>/index.html`, `.../tela-cheia/index.html` e as equivalentes em `en/demos/power-apps/` |
| Testes                                                                               | `tests/mockups.spec.js`                                                                                                                      |

`scripts/mockups.mjs` lê o `index.html` e o `en/index.html` já gerados para
reaproveitar CSS, cabeçalho, rodapé e scripts. Por isso roda depois de
`scripts/build.mjs` (o `npm run build` já encadeia os dois e o sitemap).

## Editar o texto de um app

1. Edite `src/data/mockups-power-apps.json` (PT e EN juntos, mesmos fatos).
2. `npm run build`.
3. `npm run check`.

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
3. Atualize o número escrito por extenso ou em algarismo: o botão da home, que
   fecha a sessão Power Platform da seção Cases (`DICIONARIO.pt.areas` e
   `DICIONARIO.en.areas`, chave `power-platform.link.texto`, em `scripts/cases.mjs`,
   "12") e a introdução da galeria (`intro` em `scripts/mockups.mjs`,
   "Doze"/"Twelve"). Os testes não
   precisam mudar: `tests/mockups.spec.js` lê os slugs, a contagem e os segmentos
   do JSON (o texto do botão da home é conferido literalmente; ajuste-o junto).
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
- A página de cada app declara a empresa como fictícia, o aviso de dados fictícios
  logo abaixo do título e o escopo ("Execução na Power Platform: nenhuma").

## Regras dos `app.html` e do iframe

- Todo `app.html` tem `<meta name="robots" content="noindex">` logo depois do
  `viewport` (o app solto, fora da página, não deve aparecer em busca). O player
  (`tela-cheia/`) também é `noindex`. Um teste falha se faltar em algum.
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
  `npm run serve`. O `app.html` sozinho abre por file://.

## F2a (N idiomas): quem entrar por último na main adapta

`scripts/mockups.mjs` assume PT e EN (`for (const lang of ['pt','en'])`, objeto `T`)
e reescreve o link de idioma do cabeçalho e do rodapé em `ajustarNav`. Se o markup do
alternador mudar (a F2a troca o botão por um menu `<details class="idiomas">`),
`ajustarNav` **lança erro** em vez de publicar páginas que levam à home do outro
idioma. Quem entrar por último na main (esta galeria ou a F2a) adapta:

1. `ajustarNav` em `scripts/mockups.mjs` para o menu de idiomas novo (e os idiomas sem
   galeria, que ou ganham `T[lang]` ou apontam para a galeria em PT);
2. `scripts/lint-html.mjs` da F2a, para incluir `demos/power-apps/**/index.html` e
   `en/demos/power-apps/**/index.html` (hoje no `lint:html` do `package.json`);
3. `scripts/sitemap.mjs` da F2a, para manter as URLs de `demos/` e `en/demos/`.
