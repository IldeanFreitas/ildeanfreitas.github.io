# Backlog do portfólio

Auditoria completa de 25/09/2026, pela esteira (skill `portfolio-esteira`): 11 validadores em paralelo, consolidados pelo `especialista-processos`. Estado auditado: produção = `origin/main` (64a4c70) e a revisão de textos pendente no branch `feat/revisao-textos-2`.

## Situação em 25/09/2026 (branch `feat/revisao-textos-2`)

**Feito e validado pela esteira:** D1 (selo "Laboratório concluído"), D2 (cargo-alvo "Data & AI Engineer"), D5 (AWS vira o estudo real de lakehouse de vendas), D6 (Power BI saiu da Câmara; Redis atribuído ao serviço de outra equipe), D7 (Fiscal e RPA em produção; Fiscal com papel real e arquitetura-alvo separada), D8, D9 (quatro diagramas refeitos com ícone completo e animação; AWS novo), D10 (inglês intermediário); V1–V10, V12, V14; S1–S3; M3, M8 (parcial), M10 (texto), X1, X2; T1–T7; D-1, D-2, D-3, X3, X4.

**Aberto:** V13 (README de perfil), M1 (case do DW da mineradora — sem material; aguarda fatos reais ou "modelo de referência reconstruído"), M4 (papel no RPA), M5, M6 + R1 (rag-labs: repositório novo sem histórico, CPFs mascarados, licença), M7, M9 (detalhes de datas e contagens pendentes com o Ildean), M11.

Responsáveis: **ENG** engenheiro-site · **RED** redator-portfolio · **IL** Ildean. Esforço P/M/G.

## Decisões do Ildean (destravam o resto)

| ID  | Decisão                                                                                                 | Destrava |
| --- | ------------------------------------------------------------------------------------------------------- | -------- |
| D1  | Selo do DataOps: rebaixar agora ou criar selo "Laboratório concluído" quando a etapa 10/P4 fechar       | V5       |
| D2  | Cargo-alvo no hero e no JSON-LD (ex.: "Engenheiro de Dados", "Arquiteto de Dados e Automação")          | M2, M3   |
| D3  | Case do DW da mineradora: autoriza? quais fatos e números, que anonimização? (idem M11)                 | M1, M11  |
| D4  | rag-labs público ou privado com demonstração; libera case com selo "Em homologação"?                    | M6       |
| D5  | Case AWS: existe artefato fora de `D:\Portifolio`? Se não, sai da grade ou vira "Estudo de arquitetura" | V11, D-3 |
| D6  | Há fonte de Power BI no case Câmara e de Redis no RPA? Se não, saem do texto                            | V7, V8   |
| D7  | Status real em produção do Fiscal e do RPA-XP (site e READMEs seguem a resposta)                        | V9, V12  |
| D8  | Revisão pendente do Sobre: corrigir S1–S3, descartar ou separar o que está limpo                        | S1–S3    |
| D9  | Autoriza refazer diagramas antigos com ícone completo e animação?                                       | X3, D-1  |
| D10 | Nível de inglês a declarar, com a página `/en/` no ar                                                   | M9       |

## P0 — Veracidade (publicado hoje e não se sustenta)

| ID  | Item                                                                                                                                    | Apontado por                   | Esf. | Resp.   | Dep. |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---- | ------- | ---- |
| V1  | "136 testes" são 114 testes + 22 modelos (`run_results.json`) — cases.json:11,36 e EN; README do lab10:91                               | verificador, arq-dados         | P    | RED     | —    |
| V2  | Faixa DataOps promete agendamento (DAG `schedule=None`), alertas (só log), contratos de dados e segredos gerenciados                    | verificador, arq-dados         | P    | RED     | —    |
| V3  | "Dado pessoal fora do DW" exagera: `dim_customer` ainda publica nome e sobrenome                                                        | arq-dados                      | P    | RED     | —    |
| V4  | Ordem da DAG: freshness → sync → reconciliação → deps → build; freshness não bloqueia                                                   | arq-dados                      | P    | ENG     | —    |
| V5  | "Concluído e entregue" vs docs do lab10 (etapa 10 em andamento, P4 pendente)                                                            | verificador, recrutador, coach | P    | RED     | D1   |
| V6  | Lakehouse: incremental (tudo é overwrite), "CDC com SCD2", "streaming", Power BI e aprendizado de paridade pandas×Spark sem sustentação | arq-dados                      | M    | RED+ENG | —    |
| V7  | Power BI no case Câmara sem fonte (cases.json:255,287,338)                                                                              | verificador                    | P    | RED     | D6   |
| V8  | Redis no RPA sem fonte; repo diz "cache com TTL" (cases.json:389,416,445)                                                               | verificador, qa                | P    | RED+ENG | D6   |
| V9  | Fiscal: README público se contradiz (l.38 × l.40); cofre afirmado como fato; quem faz a reserva e com que atomicidade                   | verificador, power-platform    | M    | RED     | D7   |
| V10 | Diagrama Fiscal: seta Worker → Monitoramento errada (worker grava na fila, o app lê)                                                    | arq-software                   | P    | ENG     | —    |
| V11 | Case AWS sem nenhum artefato                                                                                                            | verificador, arq-dados         | P–M  | IL→RED  | D5   |
| V12 | README RPA-XP diz "Entregue"; site diz "Em homologação"                                                                                 | verificador, power-platform    | P    | RED     | D7   |
| V13 | README de perfil: "ainda sem case público" e "Desde 2017" ferem as decisões de 18/09                                                    | verificador                    | P    | RED     | —    |
| V14 | "Power Platform" em 2017 é anacronismo (marca de 2019)                                                                                  | power-platform                 | P    | RED     | —    |

## Revisão pendente (bloqueia o commit do branch)

| ID  | Item                                                                                          | Apontado por                     | Esf. | Resp. | Dep. |
| --- | --------------------------------------------------------------------------------------------- | -------------------------------- | ---- | ----- | ---- |
| S1  | Frase de IA "sobre essa mesma base de dados" (SAP) sem evidência                              | verificador, ia-aplicada, editor | P    | RED   | D8   |
| S2  | Sobre: "subi um degrau" (escada), "três camadas" repete o hero e fecha em punchline, regência | editor                           | M    | RED   | D8   |
| S3  | Especialidades: "Três frentes" × "Eu faço os dois"                                            | editor                           | P    | RED   | —    |

## P1 — Posicionamento e maturidade

| ID  | Item                                                                                                        | Apontado por                           | Esf. | Resp.      | Dep.   |
| --- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---- | ---------- | ------ |
| M1  | Case anonimizado de dados/BI corporativo (DW da mineradora), com mecanismo dos "68 painéis"                 | recrutador, coach, power-bi, arq-dados | G    | IL→RED+ENG | D3     |
| M2  | Cargo-alvo no hero e no JSON-LD                                                                             | recrutador, coach                      | P    | RED+ENG    | D2     |
| M3  | Reordenar cases (dados primeiro); trocar "3 pós" por indicador de dados; rever "Sustentação"                | coach                                  | P    | RED+ENG    | D2     |
| M4  | "Meu papel" nos cases corporativos (Fiscal, RPA); decisões com "em vez de quê"                              | recrutador, arq-software, editor       | M    | RED        | —      |
| M5  | ALM/governança Power Platform visível; ponte cloud flow → desktop unattended; por que fila própria          | power-platform, recrutador             | M    | RED        | —      |
| R1  | Preparar rag-labs: README, `.gitignore`, varrer chaves no histórico, dado sensível, recalibrar faithfulness | ia-aplicada                            | M    | IL         | —      |
| M6  | Case RAG sobre licitações públicas (selo "Em homologação", números de eval)                                 | ia-aplicada                            | G    | ENG+RED    | D4, R1 |
| M7  | Vitrine de dados: ADRs no case, modelo incremental real, CI além de `dbt parse`, custo/desempenho           | arq-dados                              | G    | IL         | —      |
| M8  | Trajetória: títulos iguais, lacunas, "10 áreas" com 9 itens, "60 checkouts", datas da formação, segmentos   | recrutador, editor                     | M    | RED        | —      |
| M9  | Inglês básico declarado ao lado de `/en/`                                                                   | recrutador                             | P    | IL         | D10    |
| M10 | Captura do painel lab10 (sem a conta Snowflake); "Power BI" em Onde atuo com DAX/modelo semântico           | power-bi                               | P    | ENG+RED    | —      |
| M11 | Cases Workflow Solicitações Financeiras e Operações de Campo (Arquitetura documentada)                      | power-platform                         | G    | IL         | D3     |

## P2 — Qualidade técnica e design

| ID  | Item                                                                                                                    | Apontado por               | Esf. | Resp. | Dep.   |
| --- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---- | ----- | ------ |
| T1  | Ícone desconhecido falha no build; validar formato dos renderizadores (hoje leem por posição)                           | arq-software, designer, qa | M    | ENG   | —      |
| T2  | Registro único de marcas (hoje 6 mapas em `cases.mjs`)                                                                  | arq-software               | M    | ENG   | —      |
| T3  | Componente único de nó em `diagrama.css` (hoje 5 sistemas); sem box-shadow e hex fixo                                   | arq-software, designer     | G    | ENG   | T2     |
| T4  | Remover CSS/JS morto (`.rpa-*`, `.financial-*`, `jornadaFinanceira`)                                                    | arq-software               | P    | ENG   | —      |
| T5  | Reduced-motion em todos os nós + teste isolado; `figcaption`/`role=img`; contraste nas classes de diagrama              | arq-software, qa           | M    | ENG   | T3     |
| T6  | Teste unitário de `cases.mjs`                                                                                           | arq-software               | P    | ENG   | —      |
| T7  | Higiene: 12 `preview-*.png` soltos; `.gitignore` contraditório sobre baseline; timeout em `visual.spec.js:87`           | arq-software, qa           | P    | ENG   | —      |
| D-1 | Excesso de lime (6 no hero acima da dobra; 3 destaques no DataOps, 2 no Lakehouse; ícones de conceito lime)             | designer, arq-dados        | M    | ENG   | D9     |
| D-2 | Card de case a 1440 px com ~500 px vazios; nós em 2 colunas no celular; logos Snowflake/dbt a 14,5 px                   | designer                   | M    | ENG   | T3     |
| D-3 | Conteúdo de diagramas antigos: Airbyte em Fontes, governança sem pontilhado, AWS sem ingestão, Fiscal e RPA incompletos | arq-dados, arq-software    | M    | ENG   | T1, D5 |

## P3 — Polimento

- **X1** "Onde atuo" (PT) × "What I do" (EN). P · RED
- **X2** Repetições no texto: nota de selos × card; DataOps aprendizado × decisão; Fiscal resultado × escopo, job/trabalho; RPA aforismo; contato genérico. M · RED
- **X3** Uma família de ícones de conceito; blocos sem ícone ("Desenvolvimento local", STG/INT/DW). M · ENG · depende de D9
- **X4** Atualizar tabela de tecnologias verificadas na skill `portfolio-architecture-diagrams` (ordem da DAG, 114 testes, AWS). P

## Ondas

0. **Veracidade sem decisão pendente:** V1–V4, V6, V10, V13, V14, X1, T7.
1. **Decisões D1–D10**, depois V5, V7–V9, V11, V12 e o Sobre (S1–S3, com H1).
2. **Base técnica:** T1, T2, T4, T6 → T3, T5. Pré-requisito de qualquer diagrama animado novo.
3. **Posicionamento:** M2–M5, M8–M10 (hero com H1).
4. **Cases novos** com esteira completa e diagrama animado: M1, M6, M7, M11.
5. **Polimento:** D-1, D-3, X2, X3, X4.
