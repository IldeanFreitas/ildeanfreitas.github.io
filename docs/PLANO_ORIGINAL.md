> **Documento histórico.** Este é o planejamento original do portfólio, escrito
> antes da construção do site. Está preservado como registro das decisões
> fundadoras — não como guia do estado atual.
>
> Duas decisões daqui já foram superadas pelos fatos:
>
> - _"Não criar conexões, cargas, containers ou infraestrutura para esta
>   iniciativa"_ e _"Conteúdo do case de Dados: arquitetura e plano técnico
>   documentados, sem afirmar execução"_ — o laboratório DataOps acabou sendo
>   construído e executado de verdade, e o texto do case no site seguiu
>   dizendo "não executado" por muito tempo depois disso.
> - A estrutura descrita na seção 5 não corresponde mais ao repositório; veja
>   [ARQUITETURA.md](ARQUITETURA.md).
>
> Recuperado de uma cópia obsoleta do laboratório em 2026-08-30, antes de ela
> ser removida.

---

# Planejamento Completo — Portfólio no GitHub Pages

## 1. Objetivo

Criar um portfólio profissional público no GitHub Pages para apresentar cases de:

1. Power Platform;
2. Power BI;
3. Engenharia de Dados.

O portfólio deve demonstrar capacidade técnica e comunicação profissional sem expor dados corporativos, pessoais, credenciais, conexões, ambientes ou resultados não comprovados.

## 2. Decisões já tomadas

| Tema                      | Decisão                                                                       |
| ------------------------- | ----------------------------------------------------------------------------- |
| Plataforma                | GitHub Pages                                                                  |
| Conta de publicação       | `IldeanFreitas`                                                               |
| Repositório do site       | `ildeanfreitas.github.io`                                                     |
| URL esperada              | `https://ildeanfreitas.github.io`                                             |
| Estilo técnico            | Site estático leve em HTML, CSS e JavaScript, sem dependência de backend      |
| Áreas iniciais            | Power Platform, Power BI e Engenharia de Dados                                |
| Dados e integrações       | Não criar conexões, cargas, containers ou infraestrutura para esta iniciativa |
| Conteúdo do case de Dados | Arquitetura e plano técnico documentados, sem afirmar execução                |

## 3. Princípios de publicação

- Publicar somente informações verificáveis e autorizadas.
- Usar dados sintéticos, públicos ou anonimizados.
- Não publicar arquivos `.env`, segredos, URLs internas, nomes de clientes, dados pessoais, imagens com informações confidenciais ou detalhes de acesso.
- Diferenciar claramente `Entregue`, `Em evolução` e `Arquitetura documentada`.
- Não afirmar implementação, métricas, automação ou redução de custo/tempo sem evidência pública segura.
- Priorizar 3 a 6 cases fortes em vez de uma lista extensa e superficial.

## 4. Arquitetura editorial do site

```text
Início
├── Sobre
├── Power Platform
│   ├── Case 1
│   └── Case 2
├── Power BI
│   ├── Case 1
│   └── Case 2
├── Engenharia de Dados
│   └── Laboratório DataOps
├── Certificações
└── Contato
```

### 4.1 Página inicial

Deve conter:

- nome e posicionamento profissional;
- resumo das três especialidades;
- destaque para até três cases principais;
- links para LinkedIn e GitHub;
- chamada para explorar os projetos.

Posicionamento inicial sugerido:

> Engenheiro de Dados e especialista em Power Platform, com atuação em soluções analíticas, automação, aplicações corporativas e arquitetura de dados.

### 4.2 Estrutura obrigatória de cada case

1. **Título e status**;
2. **Contexto**: problema ou oportunidade, sem informação confidencial;
3. **Responsabilidade**: papel e escopo de atuação;
4. **Solução**: arquitetura, processo e decisões técnicas;
5. **Tecnologias**: apenas tecnologias aplicadas ou claramente marcadas como previstas;
6. **Evidências**: diagrama, imagem sanitizada, documentação, modelo de dados ou link público;
7. **Resultado, aprendizado ou limitação**: fato comprovado ou declaração transparente de escopo.

## 5. Conteúdo inicial

### 5.1 Engenharia de Dados — Laboratório DataOps

**Status público:** Arquitetura e plano técnico documentados.

**Título sugerido:** `Laboratório DataOps: arquitetura de pipeline analítico ponta a ponta`

**Contexto:** dados transacionais precisam ser disponibilizados para análise de forma confiável, sem afetar a fonte operacional.

**Arquitetura documentada:**

```text
PostgreSQL (Docker)
  → Airbyte
  → Snowflake RAW
  → Snowflake STAGING com dbt
  → Snowflake DW com dbt
  → Power BI
```

**Decisões que podem ser apresentadas:**

- separação das camadas RAW, STAGING e DW;
- padrões de qualidade para chaves, relacionamentos e reconciliação;
- princípio de menor privilégio e segredos fora do Git;
- evolução planejada com Airflow após a validação do fluxo básico;
- dimensões previstas de cliente, filme, loja e endereço, além da fato de locação.

**Declaração obrigatória no case:**

> Arquitetura e plano técnico documentados para estudo de Engenharia de Dados. As conexões, cargas, transformações e métricas descritas não foram executadas neste projeto de portfólio.

**Fontes internas para a redação do case:**

- `README.md`;
- `docs/PROJECT_CONTEXT.md`;
- `docs/ARCHITECTURE.md`;
- `docs/DECISIONS.md`;
- `docs/PROCESSO_DE_IMPLEMENTACAO.md`.

### 5.2 Power Platform

**Ação necessária antes do cadastro:** identificar os workspaces, soluções, telas, documentos e evidências autorizadas de cada projeto.

**Evidências recomendadas:** fluxos de navegação, imagens sanitizadas de telas, diagrama de componentes, regras de negócio e decisões de arquitetura.

**Nunca publicar:** URLs internas, IDs de ambientes, Connection References, Environment Variables, dados de usuários ou imagens com informações corporativas.

### 5.3 Power BI

**Ação necessária antes do cadastro:** identificar dashboards, modelos, medidas DAX, documentação e imagens que possam ser tornadas públicas.

**Evidências recomendadas:** modelo dimensional anonimizado, visão de páginas do dashboard, dicionário de métricas, descrição de filtros e regras de negócio.

**Nunca publicar:** `.pbix` com dados corporativos, fontes de dados, credenciais, nomes de clientes ou métricas confidenciais.

## 6. Plano de execução

| Fase                       | Objetivo                               | Atividades                                                                    | Critério de conclusão                                       |
| -------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 0. Acesso                  | Garantir publicação na conta correta   | Entrar no GitHub como `IldeanFreitas` e confirmar permissão de criação        | Conta correta autenticada                                   |
| 1. Repositório             | Criar o local público do site          | Criar `ildeanfreitas.github.io`, com descrição e `main` como branch principal | Repositório público disponível                              |
| 2. Fundação                | Criar a primeira versão navegável      | Criar HTML, CSS e JS leves, estrutura semântica, navegação e rodapé           | Site navega entre as áreas principais                       |
| 3. Conteúdo de Dados       | Publicar o primeiro case verificável   | Transformar a documentação do Laboratório DataOps em narrativa de case        | Case declara o status real e não contém dados sensíveis     |
| 4. Conteúdo Power Platform | Inserir os primeiros cases autorizados | Inventariar material, sanitizar evidências e redigir cases                    | Cada case tem contexto, responsabilidade e evidência segura |
| 5. Conteúdo Power BI       | Inserir os primeiros cases autorizados | Inventariar material, sanitizar evidências e redigir cases                    | Cada case tem métricas ou limitações explicitadas           |
| 6. Qualidade               | Revisar conteúdo e experiência         | Testar acessibilidade, responsividade, links, contraste e privacidade         | Checklist aprovado                                          |
| 7. Publicação              | Ativar GitHub Pages                    | Publicar a raiz de `main`, habilitar HTTPS e verificar URL                    | Site disponível em `https://ildeanfreitas.github.io`        |
| 8. Divulgação              | Conectar os perfis profissionais       | Atualizar GitHub e LinkedIn com o link do site e cases destacados             | Links públicos funcionando                                  |

## 7. Requisitos de acessibilidade e experiência

- Usar `header`, `nav`, `main`, `section`, `article` e `footer` de forma semântica.
- Manter uma única `h1` por página e hierarquia de títulos sem saltos.
- Incluir link de pular para o conteúdo principal.
- Garantir foco visível, ordem lógica de tabulação e navegação por teclado.
- Usar contraste suficiente entre texto e fundo.
- Criar textos alternativos úteis em imagens e diagramas.
- Usar links descritivos; evitar “clique aqui”.
- Testar visualização em celular, tablet e desktop.

## 8. Requisitos técnicos do GitHub Pages

- Usar o repositório de usuário `ildeanfreitas.github.io` em minúsculas.
- Publicar inicialmente o conteúdo da raiz do branch `main`.
- Ativar HTTPS antes da divulgação.
- Usar somente ativos e links em HTTPS.
- Usar domínio próprio apenas quando houver interesse e após verificação de propriedade.
- Manter um `README.md` com instruções de atualização e publicação.
- Considerar GitHub Actions apenas se houver necessidade real de build, framework ou validação automatizada.

## 9. Governança, skills e apoio especializado

### Skill instalada

`github-pages-portfolio` foi criada em `C:\Users\ildea\.codex\skills\github-pages-portfolio` para orientar futuras atualizações do site, incluindo segurança, acessibilidade, conteúdo verificável e publicação.

### Especialistas a mobilizar por necessidade

| Necessidade                                   | Especialidade                                       |
| --------------------------------------------- | --------------------------------------------------- |
| Layout, navegação, contraste e responsividade | UX/UI para web e acessibilidade                     |
| Cases de Power Apps e Power Automate          | Power Platform / Power Apps                         |
| Cases de dashboards e métricas                | Power BI                                            |
| Case do Laboratório DataOps                   | Engenharia de Dados                                 |
| Revisão final antes de publicação             | QA de conteúdo, links, acessibilidade e privacidade |

## 10. Checklist antes de cada publicação

- [ ] O case tem status real e visível.
- [ ] Toda afirmação de entrega ou impacto é comprovável.
- [ ] Não há segredos, dados pessoais, dados de cliente, URLs privadas ou telas não autorizadas.
- [ ] Diagramas e imagens têm texto alternativo.
- [ ] O conteúdo funciona por teclado e em tela pequena.
- [ ] Os links foram testados.
- [ ] O GitHub Pages está com HTTPS ativo.
- [ ] O case tem contexto, responsabilidade, solução e evidência ou limitação.

## 11. Próxima ação

Concluir a autenticação na conta GitHub `IldeanFreitas`. Depois, criar o repositório `ildeanfreitas.github.io` e iniciar pelas páginas **Início** e **Engenharia de Dados**, usando exclusivamente a documentação existente neste workspace.
