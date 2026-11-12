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
├─ idiomas.json             a lista de idiomas (ver "Idiomas" abaixo)
├─ index.template.html      estrutura em PT-BR, com marcadores <!--{{ ... }}-->
├─ index.<código>.template.html  a mesma estrutura em outro idioma (en, …)
├─ 404.template.html        página de erro
├─ css/
│  ├─ ordem.json            ordem de concatenação e camada de cada arquivo
│  ├─ base/                 fonte, tokens, elementos, utilitários
│  └─ componentes/          cabeçalho, idiomas, hero, cartões, diagrama, rodapé…
├─ data/
│  ├─ cases.json            os cases em PT-BR
│  ├─ cases.<código>.json   os mesmos cases em outro idioma
│  └─ mockups-*.json        apps e painéis de demonstração (um texto por idioma em cada campo)
└─ js/
   ├─ inicializacao.js      roda no <head>, antes da primeira pintura
   └─ principal.js          roda no fim do <body>

scripts/
├─ build.mjs                monta uma página por idioma e a 404.html
├─ idiomas.mjs              lê e confere src/idiomas.json; deriva os caminhos
├─ cases.mjs                renderiza os cases (e as abas da seção) a partir do JSON
├─ demos.mjs                apps e painéis de demonstração: textos, tags e cartão
├─ mockups.mjs              páginas de app, de painel, player e redirecionamento, por idioma
├─ sitemap.mjs              home e demonstrações de cada idioma; lastmod do último commit; --check
├─ lint-html.mjs            html-validate nas páginas de todos os idiomas (home, 404, demos)
├─ gera-icones.mjs          favicon e uma imagem de compartilhamento por idioma
├─ serve.mjs                servidor local para auditoria
├─ extrair.mjs              a separação de CSS/JS (etapa 2), como registro
└─ extrair-cases.mjs        a extração dos cases (etapa 3b), como registro

index.html                  GERADO — não editar (PT-BR)
<código>/index.html         GERADO — não editar (en/index.html, …)
demos/**/index.html         GERADO — não editar (os app.html ao lado são versionados à mão)
<código>/demos/**/index.html  GERADO — não editar
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

| Forma          | Usada por                    | Estrutura                                                                                   |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| `trilha`       | DataOps, Câmara, AWS, Fiscal | zonas em linha (fontes → consumo), plano de controle acima e governança abaixo, pontilhados |
| `rpa-detailed` | RPA OIDC                     | serviço, robô e portal, com as chamadas HTTP e de navegador em raias                        |

A forma `zonas`, herdada do case AWS antigo (sem animação e com ícones inline
próprios), saiu em 25/09/2026, quando o case passou a representar o estudo de
lakehouse na AWS e foi redesenhado como `trilha`.

Case novo é um objeto no JSON. Mudança na anatomia do cartão é uma edição em
`cases.mjs`, não seis.

### Sessões por área

Desde 11/11/2026 a seção Cases é dividida em sessões, na ordem de `AREAS` em
`cases.mjs`: Power Platform, Power BI, Engenharia de Dados e IA aplicada, a
mesma ordem dos cartões de Especialidades, cujo botão leva a `#cases-<area>`.
Todo case declara `area` (`power-platform`, `power-bi`, `engenharia-dados` ou
`ia`); ausente, desconhecida ou diferente entre PT e EN, o build para. Dentro
da sessão vale a ordem do JSON. Título, linha de abertura e o link que fecha a
sessão (o das demonstrações, em Power Platform) vêm de `DICIONARIO.<idioma>.areas`.
Sessão sem case mostra só o título e a linha "Em preparação", sem selo, para a
legenda de selos continuar igual aos selos usados.

Títulos: seção em `h2`, sessão em `h3`, título do case em `h4` (com o corpo de
`h3`) e blocos de fatos em `h5`. Um teste percorre a página e falha se algum
título saltar nível.

### O rótulo do escopo é dado, não constante

Cinco cases abrem o parágrafo com **Declaração de escopo:** e o da Câmara com
**Evidências:**. A primeira versão do renderizador fixava o texto e apagava o
do case divergente — o que foi pego comparando o DOM antes e depois, nó a nó,
e não teria aparecido em nenhum teste de comportamento.

### O que não roda aparece marcado, no próprio diagrama

`situacao` (`documentado` ou `previsto`) em nó, etapa, item de faixa, plano de
controle ou faixa de retorno desenha contorno tracejado e uma etiqueta de texto,
e acrescenta o item correspondente à legenda daquele diagrama. Serve ao estudo
AWS (executado até a Silver; o resto só nos guias) e ao retorno do robô no
fiscal (previsto no contrato, não implementado). Sistema de outra equipe
(`externo`) usa fundo listrado na trilha, não tracejado: o tracejado de linha é
o meio navegador do RPA. Na trilha também existem `peso` por zona (1 a 12,
quando a soma automática deixa a zona estreita demais) e `ligaAoProximo`
(seta para baixo entre dois nós de uma zona empilhada). Valor inválido em
qualquer um deles para o build.

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

## Idiomas: uma configuração, um esqueleto

Cada idioma é outra página gerada no build (`/` em PT-BR, `/en/` em inglês,
`/es/` em espanhol), não troca de strings no cliente. O motivo é o mesmo dos cases: o conteúdo
precisa estar no HTML que o servidor entrega, para o buscador e para quem
navega sem JavaScript.

### A configuração

`src/idiomas.json` é a única lista de idiomas do repositório. Build, sitemap,
lint de HTML, imagem de compartilhamento e testes partem dela, e a ordem da
lista é a ordem do menu. As tabelas **por código** continuam sendo escritas à
mão, uma chave por idioma, e cada uma para com uma mensagem que diz a chave
que falta:

| Tabela             | Onde                      | O que guarda                                                                                                                 |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DICIONARIO`       | `scripts/cases.mjs`       | as frases fixas dos diagramas e os rótulos da seção Cases: áreas, abas, blocos, busca, filtros, contador e "nada encontrado" |
| `T_PA` e `T_BI`    | `scripts/demos.mjs`       | os textos fixos do cartão, da página e do player dos apps (Power Apps) e dos painéis (Power BI)                              |
| `TECNOLOGIAS`      | `scripts/demos.mjs`       | o rótulo das tags que se traduzem ("Abas", "Tabs"); nome de produto e sigla não entram                                       |
| campos de texto    | `src/data/mockups-*.json` | `segmento`, `titulo`, `dor`, `solucao`, `passos` e as tags escritas como objeto, de cada app e de cada painel                |
| `TEXTOS`           | `scripts/gera-icones.mjs` | o texto da imagem de compartilhamento                                                                                        |
| `REGRAS_DE_IDIOMA` | `tests/idiomas.spec.js`   | as letras que o idioma não usa (teste de texto)                                                                              |

Adicionar um idioma, portanto, não é só "uma entrada e os arquivos dele":
são a entrada, os arquivos de conteúdo (template e cases), uma chave em
`DICIONARIO`, os textos das demonstrações (`T_PA`, `T_BI`, `TECNOLOGIAS` e os
dois `mockups-*.json`), uma chave em `TEXTOS` e uma em `REGRAS_DE_IDIOMA`. O
passo a passo abaixo diz em que ordem cada falta aparece.

```json
{
  "codigo": "en",
  "lang": "en",
  "ogLocale": "en_US",
  "rotulo": "English",
  "sigla": "EN",
  "caminho": "/en/",
  "interface": { "escolherIdioma": "choose language" }
}
```

| Campo       | Para quê                                                                |
| ----------- | ----------------------------------------------------------------------- |
| `codigo`    | nome de pasta e de arquivo (`en/index.html`, `cases.en.json`)           |
| `lang`      | `<html lang>`, `hreflang` e o `lang` dos links de idioma                |
| `ogLocale`  | `og:locale` da própria página e `og:locale:alternate` nas outras        |
| `rotulo`    | nome do idioma **no próprio idioma**, no menu, no rodapé e na 404       |
| `sigla`     | o que o botão do menu mostra (PT, EN)                                   |
| `caminho`   | endereço servido; `/` no padrão e `/<codigo>/` nos outros (conferido)   |
| `padrao`    | `true` em exatamente um idioma: o PT-BR, fonte da verdade e `x-default` |
| `interface` | rótulos dos componentes gerados (hoje só o nome acessível do menu)      |

O `ogLocale` é `idioma_REGIÃO`, com a região em duas letras (`pt_BR`, `en_US`)
ou em três dígitos da tabela UN M.49 (`es_419`). A validação aceita as duas
formas e recusa o resto. O espanhol do site é neutro e usa `es_LA`, o valor que
a lista de localidades do Facebook tem para o espanhol da América Latina: quem
lê `og:locale` são as redes de compartilhamento, e `es_419` não está nela.

Os arquivos de cada idioma saem por **convenção de nome**, não por caminho
escrito na configuração. Caminho livre deixaria o template de um idioma
apontar para os cases de outro sem que nada acusasse; com a convenção, o
código decide tudo e o que falta aparece como arquivo ausente.

| O quê                      | Idioma padrão (PT-BR)     | Outro idioma (`xx`)          |
| -------------------------- | ------------------------- | ---------------------------- |
| Template                   | `src/index.template.html` | `src/index.xx.template.html` |
| Cases                      | `src/data/cases.json`     | `src/data/cases.xx.json`     |
| Página gerada              | `index.html`              | `xx/index.html`              |
| Páginas de demonstração    | `demos/…/index.html`      | `xx/demos/…/index.html`      |
| Imagem de compartilhamento | `assets/img/og-image.png` | `assets/img/og-image-xx.png` |

Os apps e os painéis de demonstração fogem da convenção de arquivo por idioma
de propósito: cada campo de `src/data/mockups-*.json` traz os textos lado a
lado (`"titulo": { "pt": "…", "en": "…" }`), porque são frases curtas e o
revisor confere os fatos de um app olhando um lugar só. O build confere que
toda chave de idioma existe (abaixo).

### O que o build confere

Configuração inválida para o build com a lista de problemas: arquivo ausente
ou JSON quebrado, código, `lang`, `ogLocale`, sigla ou rótulo repetido, nenhum
ou dois idiomas padrão, campo vazio, caminho fora da convenção, arquivo de
idioma ausente (template, cases ou imagem). A imagem de compartilhamento é a
única que `scripts/gera-icones.mjs` dispensa ao ler a configuração
(`exigirImagem: false`): é ele quem a cria, e exigi-la dele trancaria o idioma
novo. Build, sitemap e `lint:html` a exigem. Depois, contra o PT-BR:

- **Esqueleto.** Todo template precisa ter o mesmo esqueleto de marcação do
  PT-BR (tags e classes, sem texto e sem os atributos que carregam texto). A
  mensagem nomeia o par e mostra o primeiro ponto de divergência.
  Acrescentou uma seção em português, precisa acrescentar em todos os
  idiomas antes de conseguir montar o site.
- **Cases.** Mesmos `id`, na mesma ordem, e a mesma `area` (a aba) em cada um.
- **Dicionário.** As poucas frases fixas dos diagramas ("Plano de controle",
  "Chamadas HTTP") e os rótulos da seção Cases (título e abertura de cada
  área, nome do conjunto de abas, títulos dos blocos, busca, filtros, contador,
  "nada encontrado") vivem no `DICIONARIO` de `scripts/cases.mjs`, uma entrada
  por idioma, com as mesmas chaves do `pt` em todos os níveis
  (`conferirDicionario`).
- **Demonstrações.** `conferirDemos`, em `scripts/demos.mjs`, no mesmo padrão:
  `T_PA` e `T_BI` com uma entrada por idioma e as mesmas chaves do `pt`; cada
  app e cada painel de `src/data/mockups-*.json` com `segmento`, `titulo`,
  `dor`, `solucao` e `passos` em todos os idiomas (e `passos` com a mesma
  quantidade do `pt`), e toda tag escrita como objeto com um rótulo por
  idioma; em `TECNOLOGIAS`, termo traduzido para algum idioma (`en: 'Tabs'`)
  traduzido para todos. Nome de produto e sigla ficam só com `nome` e valem
  em qualquer idioma (Power Apps, RLS). O build e `scripts/mockups.mjs` param
  com a lista, uma linha por chave que falta.
- **O que a configuração decide não fica escrito no template.** `<html lang>`
  igual ao `lang` da configuração; `url` do JSON-LD igual ao endereço da
  página; e nenhum `hreflang`, canonical, `og:locale`, `og:url` ou
  `og:image` à mão. Isso sai dos marcadores:

| Marcador                         | Gera                                                             |
| -------------------------------- | ---------------------------------------------------------------- |
| `<!--{{ IDIOMAS_LINKS }}-->`     | canonical, `hreflang` de todos os idiomas e `x-default` → `/`    |
| `<!--{{ IDIOMAS_OG_LOCALE }}-->` | `og:locale` e um `og:locale:alternate` por outro idioma          |
| `<!--{{ IDIOMAS_OG_URL }}-->`    | `og:url` e `og:image` (a imagem do idioma)                       |
| `<!--{{ IDIOMAS_MENU }}-->`      | o menu de idiomas do cabeçalho                                   |
| `<!--{{ IDIOMAS_RODAPE }}-->`    | um link para cada um dos outros idiomas                          |
| `<!--{{ IDIOMAS_404 }}-->`       | na 404 (que é do padrão), um botão por idioma que não é o padrão |

Assim nenhum template lista os outros idiomas, e um idioma novo aparece em
todas as páginas sem que nenhuma delas seja editada. Todo link de idioma leva
`hreflang` (para onde vai) e `lang` (em que língua está o nome dele).

O `sitemap.xml` também é conferido: `npm run build:check` roda
`node scripts/sitemap.mjs --check`, que compara o arquivo com o que a
configuração e a lista de demonstrações gerariam, **ignorando o `lastmod`** (a
data muda sozinha a cada dia com alteração pendente). Um idioma novo, ou um
app ou painel novo, sem `npm run build` deixa de passar no CI. O sitemap traz
a home de cada idioma e a página de cada app e de cada painel em cada idioma
(hoje 69 URLs: 3 + 22 × 3), todas com o `hreflang` de todos os idiomas e
`x-default` no PT-BR. Redirecionamento, player e `app.html` são `noindex` e
ficam fora.

### As páginas de demonstração em cada idioma

`scripts/mockups.mjs` roda depois do build e gera, para cada idioma da
configuração, a página de cada app e de cada painel
(`<pasta>demos/<coleção>/<slug>/`), o player em tela cheia e o
redirecionamento da antiga galeria. Ele não tem lista de idiomas própria nem
texto por idioma escrito nele:

- **Cabeçalho, rodapé, CSS, scripts e o link "pular para o conteúdo"** vêm da
  home gerada do idioma. O menu de idiomas chega pronto, e `ajustarNav` troca
  o destino de cada link de idioma (os do menu `<details class="idiomas">` e
  os do rodapé) pela **mesma página naquele idioma**: de
  `/en/demos/power-bi/varejo/`, "Português" leva a `/demos/power-bi/varejo/`,
  não à home. A função conta os links que reescreve (um por idioma no menu,
  um por outro idioma no rodapé) e lança erro se a contagem não bater: se a
  marcação do menu mudar, o build para em vez de publicar página cujo menu
  leva à home do outro idioma.
- **Canonical e `hreflang`** seguem a regra da home: a página aponta para ela
  mesma em cada idioma, e `x-default` para a do PT-BR.
- **Endereço e `lang`** saem de `src/idiomas.json` (`idiomaDe` e `enderecoDe`,
  em `scripts/demos.mjs`); as tabelas de texto não os repetem.
- **Player e redirecionamento** são `noindex`, sem `hreflang` e sem menu de
  idiomas: o player é uma página própria, sem o cabeçalho do site, e o
  redirecionamento não retém ninguém. Cada um fica no idioma da sua pasta e
  leva a páginas do mesmo idioma.
- **Os `app.html` existem uma vez só, em português**, por decisão: o mockup
  não é traduzido. As páginas dos outros idiomas avisam com a chave
  `notaIdioma` de `T_PA`/`T_BI` ("The demo apps are in Portuguese.", "Las
  aplicaciones de demostración están en portugués."), e o
  roteiro de teste cita os rótulos do app em português com a tradução entre
  parênteses. Idioma novo precisa da sua `notaIdioma`.

### O idioma da página no JSON-LD

O JSON-LD (`Person`) não carrega `inLanguage`: a propriedade não existe em
`Person` (é de `CreativeWork`/`WebPage`), e a que existe, `knowsLanguage`,
declararia proficiência, o que o site não faz (o inglês está declarado como
intermediário e página traduzida não afirma fluência). O idioma de cada página
fica declarado por `<html lang>`, `hreflang` e `og:locale`. Se o Ildean quiser
um `WebPage` à parte para carregar `inLanguage`, a decisão se revê.

### O menu de idiomas

É um `<details>` com `<summary>`: abre e fecha por clique, Enter e Espaço sem
JavaScript, e o navegador expõe o estado expandido sozinho. O botão mostra
um globo (no traço dos ícones de menu e tema) e a sigla do idioma atual; o
nome acessível começa pela sigla ("PT, escolher idioma"), para quem comanda
por voz dizer o que vê. Bandeira não entra: bandeira é país, não língua.

O script (`iniciar('idiomas')` em `principal.js`) só acrescenta o que o
elemento nativo não faz: Esc fecha e devolve o foco ao botão, clique fora
fecha, e o painel fecha quando o foco sai dele, para não cobrir o elemento
que recebeu o foco. Um painel por vez: abrir o menu de idiomas fecha o menu
compacto, e clicar no menu compacto fecha o de idiomas. Os rótulos do menu
compacto vêm de `data-abrir`/`data-fechar` no botão; o mesmo script serve
todas as páginas.

Por que não um botão com `aria-expanded`: sem JavaScript ele não abriria, e o
site promete que tudo funciona sem script. O `<details>` entrega o estado
expandido e o teclado nativos; o custo é o Esc, que vem do script e, sem ele,
não fecha (o clique no botão fecha).

O painel nasce alinhado à direita do botão e cresce para a esquerda, então o
espaço que tem é o que sobra entre a margem da página e o botão. A largura é a
do conteúdo, limitada a esse espaço: `100vw` menos as duas margens do `.wrap`
(1.25rem cada) menos os botões que vêm depois do de idiomas
(`--cab-a-direita`, em `cabecalho.css`, que muda com o menu compacto e com o
espaçamento de 430px). Um rótulo que não cabe quebra em linhas
(`overflow-wrap: anywhere` para o que não tem onde quebrar) em vez de sair da
tela ou perder texto; com "PT" e "EN" nada muda, porque nenhum dos dois chega
ao limite. O painel **não** se ancora ao `.site-header__inner`: o `.nav`
compacto, que é `position: absolute` com `inset-inline: 0`, usa o `.site-header`
como referência, e tornar o `__inner` posicionado o estreitaria. O anel de foco
do item fica dentro da linha (`outline-offset: -2px`); o padrão (3px para
fora) ficava a 1px da borda do painel.

### A nota de tradução

O espanhol é tradução do PT-BR e a página diz isso: o rodapé de
`src/index.es.template.html` termina com "Traducido del portugués.", na mesma
linha do aviso de conteúdo. É texto do template, sem marcador nem campo na
configuração; como as páginas de app e de painel reaproveitam o rodapé da
home do idioma, a nota aparece em todas as páginas em espanhol que têm rodapé
(o player e o redirecionamento não têm, em nenhum idioma). A linha de idiomas
da Formação é a mesma em todos: página traduzida não declara proficiência. O
inglês não leva nota. Idioma novo que for tradução leva a sua, no mesmo lugar.

A 404 é do idioma padrão e traz uma linha por outro idioma (`<p lang="en">`,
`<p lang="es">`), escrita à mão em `src/404.template.html`; o botão de cada
idioma sai de `IDIOMAS_404`.

### Como adicionar um idioma

Exemplo com espanhol (`es`), que entrou por este passo a passo em 12/11/2026.
Texto novo segue o protocolo da skill
`portfolio-idiomas` (traduzir sempre do PT-BR e passar pela aprovação do
Ildean antes de entrar em `src/`).

Os passos 1 a 5 podem ser feitos em qualquer ordem entre si. O 6 vem depois
do 1 e do 2 (a configuração só vale com o template e os cases no disco), o 7
depois do 5 e do 6, e o 8 e o 9 por último. Seguida assim, a sequência não
para em nenhum ponto; fora dela, o que falta aparece como mensagem (tabela
abaixo).

1. **Template.** Copie `src/index.template.html` (o PT-BR, não o inglês) para
   `src/index.es.template.html` e traduza o texto e os atributos que carregam
   texto: `<title>`, `description`, `og:title`, `og:description`,
   `og:image:alt`, `aria-label`, `alt`, `data-abrir`/`data-fechar` e o
   JSON-LD (`description`, `knowsAbout`). Troque `<html lang>` pelo `lang` da
   configuração e a `url` do JSON-LD por `https://ildeanfreitas.github.io/es/`.
   Não escreva link de idioma: os marcadores cuidam. Se o
   idioma for tradução, a nota vai no rodapé ("A nota de tradução", acima), e
   a 404 ganha a linha dele.
2. **Cases.** `src/data/cases.es.json`, com os mesmos cases, `id`, `area` e
   ordem do `cases.json`.
3. **Dicionário dos diagramas e das abas.** Chave `es` no `DICIONARIO` de
   `scripts/cases.mjs`, com as mesmas chaves do `pt` em todos os níveis: além
   das frases dos diagramas, `areas` (título e abertura de cada aba e, nas
   duas com demonstrações, `demos.bloco`, `demos.dica` e `demos.segmento`),
   `abas`, `blocos`, `busca`, `filtros`, `contagem` e `vazio`.
4. **Textos das demonstrações.** Em `scripts/demos.mjs`: chave `es` em `T_PA`
   e em `T_BI` (as mesmas chaves do `pt`, inclusive `notaIdioma`, que nos
   idiomas que não são o padrão diz que os apps estão em português, e `desc`,
   que é função) e, em `TECNOLOGIAS`, `es: '…'` em cada termo que já tem
   tradução (os que têm `en`). Em `src/data/mockups-power-apps.json` e
   `src/data/mockups-power-bi.json`: chave `es` em `segmento`, `titulo`,
   `dor`, `solucao` e `passos` de cada item (os passos na mesma quantidade) e
   em cada tag escrita como objeto.
5. **Texto da imagem de compartilhamento.** Chave `es` em `TEXTOS`, em
   `scripts/gera-icones.mjs`.
6. **Configuração.** A entrada em `src/idiomas.json`, na posição em que o
   idioma deve aparecer no menu, com `interface.escolherIdioma`.
7. **Imagem de compartilhamento.** `node scripts/gera-icones.mjs`, que grava
   `assets/img/og-image-es.png` (e regrava as outras, iguais). Ele lê a
   configuração sem exigir esse PNG, que é justamente o que ele cria; todos os
   outros comandos o exigem.
8. **Regra do teste de texto.** Chave `es` em `REGRAS_DE_IDIOMA`, em
   `tests/idiomas.spec.js` (as letras que o espanhol não usa; o próprio teste
   dá o exemplo).
9. **Verificar.** `npm run format && npm run build && npm run check`. O build
   gera `es/index.html` e as páginas de `es/demos/` (app, painel, player e
   redirecionamento); o sitemap ganha a `<url>` da home e a de cada
   demonstração; canonical, `hreflang` recíproco, `og:locale:alternate`, menu,
   rodapé e 404 se atualizam em todas as páginas, inclusive nas de
   demonstração dos outros idiomas. Os testes por idioma (SEO, menu, paridade
   de conteúdo com o PT-BR, letras do idioma errado e português esquecido,
   axe em cada aba, piso de fonte, rolagem lateral, sem JavaScript, paridade
   estrutural dos cases, textos das demonstrações) passam a incluir o idioma
   novo sem edição, e a varredura de nomes de empresa (ver
   `docs/QUALIDADE.md`) cobre os arquivos dele.
10. **Visual.** `npm run test:visual` acusa a captura `pagina-es` como
    ausente na primeira vez (o prazo dela já é o de gravação); depois da
    aprovação, `npm run baseline`.

O que para, e onde, quando algo falta:

| Falta                                          | Para                                          | Mensagem                                                                                                            |
| ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| template ou cases do idioma                    | todo comando que lê a configuração            | `idioma "es": arquivo ausente src/index.es.template.html` (ou `src/data/cases.es.json`)                             |
| o PNG de compartilhamento                      | build, sitemap, `lint:html` (não o gera)      | `idioma "es": arquivo ausente assets/img/og-image-es.png`: rode `node scripts/gera-icones.mjs`                      |
| chave `es` em `TEXTOS`                         | `gera-icones.mjs`, antes de abrir o navegador | `sem texto da imagem de compartilhamento para es (TEXTOS em scripts/gera-icones.mjs)`                               |
| chave `es` em `DICIONARIO`                     | build e `build:check`                         | `DICIONARIO sem a entrada "es"`                                                                                     |
| rótulo de aba, busca ou filtro em `DICIONARIO` | build e `build:check`                         | `DICIONARIO.es: falta "filtros.tecnologia" (comparado a "pt")` (uma linha por chave)                                |
| chave `es` em `T_PA` ou `T_BI`                 | build, `build:check` e `mockups.mjs`          | `textos de "apps" (scripts/demos.mjs): sem a entrada "es"` (ou `…, entrada "es": falta "player.voltar"`)            |
| tradução de um termo de `TECNOLOGIAS`          | build, `build:check` e `mockups.mjs`          | `TECNOLOGIAS (scripts/demos.mjs): falta "abas.es" ("Abas" tem tradução em outro idioma)`                            |
| texto de um app ou painel                      | build, `build:check` e `mockups.mjs`          | `src/data/mockups-power-apps.json: "inspecao-via", falta "titulo.es"` (ou `"passos.es" com 2 passos; … tem 3`)      |
| `sitemap.xml` sem o idioma novo                | `build:check` (e, portanto, o CI)             | `sitemap.xml está desatualizado em relação a src/idiomas.json ou à lista de demonstrações (…). Rode: npm run build` |
| chave `es` em `REGRAS_DE_IDIOMA`               | `npm test` (`tests/idiomas.spec.js`)          | `O idioma "es" não tem regra em REGRAS_DE_IDIOMA`                                                                   |

Nada mais muda: o `lint:html` lê a lista da configuração (home, 404 e
`<pasta>demos/**/index.html` de cada idioma), e o `.prettierignore` e o
`.stylelintignore` cobrem os arquivos por padrão de nome (`index.html` e
`demos/` em qualquer pasta, `src/index*.template.html`).

### Como remover um idioma

Remover é desfazer a adição, e há um passo que nenhum comando faz sozinho:
**apagar a pasta `xx/` publicada**. O build só escreve; não apaga o
`xx/index.html` nem as páginas de `xx/demos/` de um idioma que saiu da
configuração. A pasta continua no repositório e o GitHub Pages continua
servindo `/xx/`, fora do menu e do sitemap, mas no ar, indexável, com
`hreflang` que as outras páginas já não retribuem. Nada no `build:check`
acusa isso.

1. Tirar a entrada de `src/idiomas.json`.
2. **Apagar a pasta `xx/` inteira (o `xx/index.html` e `xx/demos/`).**
3. Apagar `src/index.xx.template.html`, `src/data/cases.xx.json` e
   `assets/img/og-image-xx.png`.
4. Tirar a chave `xx` de `DICIONARIO`, de `T_PA`, `T_BI` e `TECNOLOGIAS`
   (`scripts/demos.mjs`), dos dois `src/data/mockups-*.json`, de `TEXTOS` e
   de `REGRAS_DE_IDIOMA`. Chave de idioma que sobra numa dessas tabelas não
   para o build (é o estado de quem prepara um idioma), mas vira texto morto.
5. `npm run build` (o sitemap perde a `<url>` e as outras páginas, o menu e a
   404 perdem os links) e `npm run check`. A captura `pagina-xx*.png` da
   baseline local fica órfã e pode ser apagada.

### Caminhos de assets: absolutos na fonte, relativos na saída

Os fontes (`src/`, `scripts/cases.mjs`) escrevem `/assets/…`: a mesma
marcação vai para todas as páginas de idioma, e o trecho não precisa saber
onde vai parar. O build (`relativizar()` em `scripts/build.mjs`) reescreve
esses caminhos por página, com um `../` por nível de pasta — `assets/…` em
`index.html`, `../assets/…` em `en/index.html` — em `src`/`href` (logos,
preload da fonte) e em `url(…)` do CSS embutido (`@font-face`);
`favicon.ico` e `apple-touch-icon.png` idem.

Motivo: o site precisa funcionar servido **e** aberto direto do disco
(file://). Com caminho absoluto, `/assets/` apontava para a raiz do drive e
logos, ícones e a fonte sumiam fora do servidor — o que pareceu "a
refatoração quebrou os ícones" depois que os SVG inline viraram arquivos.
URLs `https://` (og:image, JSON-LD, canonical, hreflang) e links de navegação
entre idiomas (`/`, `/en/`) não são tocados. O build falha se sobrar
`/assets/` absoluto.

O relativo em `url(…)` só está certo porque o CSS é **embutido** no HTML e
resolve a partir da página. Se o CSS um dia virar arquivo externo, `url()`
relativo passa a resolver a partir do `.css` e precisa ser revisto.

A **404 continua absoluta**: o GitHub Pages a serve em qualquer profundidade
de URL (`/a/b/c`), e um caminho relativo resolveria a partir dali.

### Ícones de conceito: sprite SVG inline, não máscara

Os ícones Fluent dos diagramas são `<svg class="diagram-icon"><use
href="#i-nome"></use></svg>`, e cada página carrega um `<svg class="icon-sprite">`
com um `<symbol>` só para os ícones que usa (`spriteFluent()` em
`scripts/cases.mjs`). O desenho é o SVG registrado no manifesto, sem
alteração além de `fill="currentColor"` nos paths (a cor vem da zona), com o
aviso da licença MIT ao lado do sprite.

Antes eram máscara CSS (`mask: url(…)` via `--dg-icone`). Máscara obedece à
política de mesma origem, e em file:// a origem é opaca: o Chromium bloqueava
todas, mesmo com o arquivo no lugar e o caminho certo. `<use>` para um
fragmento do próprio documento não tem esse limite. Custo: cerca de 32 KB a
mais por página (sem compressão), em troca de 31 requisições a menos.

## Tema: escuro é o padrão

O site não segue `prefers-color-scheme`. O escuro é identidade, não palpite;
só a escolha explícita do visitante, salva em `localStorage`, muda o tema. A
cor da barra do navegador (`theme-color`) acompanha a escolha, não o sistema.
