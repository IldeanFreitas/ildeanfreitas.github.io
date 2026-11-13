# Iconografia de arquitetura

O catálogo em `assets/icons/manifest.json` é o registro local de proveniência.
Ele inclui a família neutra oficial Microsoft Fluent System Icons, com a
licença MIT preservada em `assets/icons/neutral/fluent/LICENSE`, e os ativos
originais de PostgreSQL, Airbyte, Snowflake, dbt, Apache Airflow, Databricks,
Power BI, Dataverse, Power Apps, Power Automate e SharePoint, além de um ícone
semântico SAP Fiori sob Apache-2.0, além dos SVGs oficiais de Node.js e
JavaScript. Cada arquivo de fornecedor tem fonte,
termos, data de obtenção, nome original e checksum SHA-256 no manifesto.

Para serviços nomeados, o diagrama usará o SVG oficial sem alteração e com o
nome do produto. Para conceitos — por exemplo, ingestão, qualidade, segurança
ou linhagem — usará uma família neutra única. Esta separação evita usar uma
marca para sugerir uma capacidade genérica ou uma afiliação inexistente.

Antes de inserir um novo ativo, registre no manifesto a URL oficial, os termos,
a data de obtenção, o nome de origem e o checksum SHA-256.

As tags da seção Especialidades seguem a mesma regra. Produto com ativo oficial
registrado leva a marca do fornecedor (`<img>` com `alt=""`); conceito, e produto
sem ativo adequado, leva um ícone Fluent neutro com o nome ao lado (sprite
inline, herda a cor do texto). O build para se uma tag citar um ícone que não
está no manifesto, e monta o sprite com os ícones da página inteira. O logotipo
do Apache Spark do manifesto é o wordmark cinza escuro, ilegível em 16 px e
invisível no tema escuro; como o ativo não pode ser recortado, Spark usa o
ícone neutro `flash`. O ícone oficial do Airbyte traz um quadrado branco
embutido (250×250) e o glifo ocupa só metade da caixa: em 16 px vira um bloco
branco no tema escuro e some no claro, então Airbyte também usa um neutro
(`database-arrow-right`) nas tags, e a marca continua nos diagramas dos cases.
Terraform não entrou nas tags: não há ativo oficial registrado e a evidência é
só o certificado do curso.

As tags dos apps de demonstração (aba Power Platform da seção Cases e página de
cada app) e o filtro "Tecnologia" usam o mesmo mecanismo, a partir de um
dicionário único, `TECNOLOGIAS` em `scripts/demos.mjs`: Power Apps, Power
Automate, Dataverse e SharePoint com o logotipo registrado; SQL Server e Oracle
Database com `database` (o mesmo conceito, banco de dados); SAP com `building`
(sistema corporativo; o ativo `vendor/sap` do manifesto é um ícone Fiori, não a
marca, e `storage` já representa o localStorage no RPA); Excel com
`document-table` (planilha; `table` já é "tabelas Gold" no diagrama da Câmara);
APIs com `plug-connected`, o mesmo da tag "APIs" de Especialidades. `building` e
`document-table` entraram em 11/11/2026, no grupo `fluent-neutral-set-stacks`,
obtidos do repositório oficial sem alteração (o pacote `@fluentui/svg-icons`
traz o mesmo desenho, minificado). Tag de app fora do dicionário para o build.

As tags dos painéis de demonstração de Power BI (aba Power BI da seção Cases e
página de cada painel) entram no mesmo dicionário, desde 12/11/2026. São 25
conceitos, nenhum produto: tipo de painel (Executiva `data-trending`, Operacional
`gauge`, Financeira `money`, Temporal `calendar`, Governança `shield-checkmark`,
Geográfica `map`, Qualidade de serviço `headset`), recurso do relatório (Parâmetro
de campo `options`, RLS `shield-lock`, Drill-through `zoom-in`, Top N
`arrow-sort-down-lines`, Menu lateral `panel-left`, Abas `tabs`, Navegador de
páginas `compass-northwest`, Trilho de ícones `apps-list`, SLA `timer`, SAFe
`people-team`, Aging `hourglass`, Previsto x realizado `target`, Ano contra ano
`arrow-swap`) e visual (Carta de controle `data-line`, Cascata `data-waterfall`,
Matriz `grid`, Diagrama linear `timeline`, Múltiplos pequenos `board`). Todas com
ícone neutro Fluent e o nome ao lado; nenhuma leva logotipo (SAFe é marca de
terceiro: só o nome escrito). `shield-lock` e `timer` já existiam com o mesmo
conceito nos diagramas (controle de acesso, prazo); os outros 23 entraram no
grupo `fluent-neutral-set-paineis` do manifesto, obtidos do repositório oficial
sem alteração. O campo `en` do dicionário dá o rótulo em inglês.

Cada aba da seção Cases leva o ícone do cartão de Especialidades da sua área (o
build lê o SVG do próprio template, pelo botão do cartão que aponta para
`#cases-<área>`); a aba Power BI, que não tem cartão, usa o logotipo do Power BI.

Os ícones de categoria dos três cards de Especialidades não vêm do manifesto:
são desenhados à mão em traço sobre grade de 24 (1,9 nos cards; 2 e 2,5 no
menu, no tema e na seta), na mesma família dos ícones da interface. Um Fluent
ali quebraria o trio, porque o Fluent é desenho preenchido. O card de IA
aplicada usa uma faísca de quatro pontas com um "+": a estrela sozinha se leria
como "favorito", e o cilindro anterior repetia o ícone da tag SQL.

Redis permanece com ícone neutro no case público: a fonte e os termos oficiais
estão registrados no manifesto, mas o kit de marca exige obtenção manual e
atribuição por página. Não usamos cópias de agregadores como substituição.

O ícone de Power BI vem do pacote oficial de ícones Microsoft Fabric; não foi
substituído pelo ícone de Power BI Embedded, que identifica outro produto.
