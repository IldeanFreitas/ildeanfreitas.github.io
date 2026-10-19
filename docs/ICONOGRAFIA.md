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

Redis permanece com ícone neutro no case público: a fonte e os termos oficiais
estão registrados no manifesto, mas o kit de marca exige obtenção manual e
atribuição por página. Não usamos cópias de agregadores como substituição.

O ícone de Power BI vem do pacote oficial de ícones Microsoft Fabric; não foi
substituído pelo ícone de Power BI Embedded, que identifica outro produto.
