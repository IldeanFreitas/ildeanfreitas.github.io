# ildeanfreitas.github.io

Portfólio profissional de Ildean Freitas — engenharia de dados, Power Platform e Power BI.

**Site:** https://ildeanfreitas.github.io

---

## Como este repositório funciona

Site estático em HTML, CSS e JavaScript puros. **Zero dependência de runtime** — nenhuma requisição a terceiros, nenhuma biblioteca, nenhum framework. A fonte Mona Sans é servida pelo próprio repositório.

O que existe de ferramental serve para desenvolver e verificar; nada disso chega ao navegador.

> **`index.html` e `404.html` são gerados.** Editá-los funciona até o próximo `npm run build`, que sobrescreve tudo. A fonte fica em `src/`.

```
.
├── src/                    FONTE — é aqui que se edita
│   ├── index.template.html estrutura da página, com marcadores
│   ├── 404.template.html   página de erro
│   ├── css/
│   │   ├── ordem.json      ordem de concatenação (a cascata depende dela)
│   │   ├── base/           fonte, tokens, elementos, utilitários
│   │   └── componentes/    cabeçalho, hero, cartões, diagrama, rodapé…
│   └── js/
│       ├── inicializacao.js roda no <head>, antes da primeira pintura
│       └── principal.js     roda no fim do <body>
├── scripts/
│   ├── build.mjs           monta index.html e 404.html
│   ├── sitemap.mjs         lastmod a partir do último commit
│   ├── serve.mjs           servidor local para auditoria
│   └── extrair.mjs         registro da separação original
├── tests/                  Playwright: comportamento, a11y, sem-JS, visual
├── docs/
│   ├── ARQUITETURA.md      as decisões e o porquê delas
│   └── QUALIDADE.md        como verificar uma mudança
├── index.html              GERADO — não editar
├── 404.html                GERADO — não editar
├── sitemap.xml             GERADO — não editar
└── assets/
    ├── fonts/              Mona Sans (SIL OFL 1.1)
    └── img/                imagens de compartilhamento
```

## Trabalhar no site

```bash
npm install                 # uma vez
npx playwright install chromium

npm run build               # monta index.html, 404.html e sitemap.xml
npm run serve               # http://localhost:4173
npm run dev                 # prévia local com atualização em tempo real
npm run check               # build + lint + formato + testes
npm run test:visual         # regressão visual (só local)
```

O fluxo de uma mudança em CSS ou marcação:

```bash
npm run baseline            # fotografa o estado atual
# ... edita src/ ...
npm run build
npm run check
npm run test:visual         # compara com a fotografia
```

Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e [docs/QUALIDADE.md](docs/QUALIDADE.md).

## Publicar

1. Criar o repositório público **`ildeanfreitas.github.io`** (tudo minúsculo — a regra do GitHub exige que o nome case com o usuário em minúsculas).
2. Ativar **Settings → Code security → Secret scanning** e **Push protection** antes do primeiro commit.
3. Enviar os arquivos para a raiz do branch `main`.
4. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)`.
5. Marcar **Enforce HTTPS**.
6. Aguardar a publicação e conferir em janela anônima.

> Sites em `github.io` criados após 15/06/2016 já são servidos por HTTPS automaticamente. A publicação pode levar até 10 minutos.

## Testar localmente antes de publicar

```bash
npm run dev
# abrir http://localhost:4173; ao salvar em src/, a página recompila e recarrega
```

O modo de prévia não publica conteúdo nem altera conexões Power Platform. Ele
mantém o último build válido visível se uma edição falhar, e aponta o erro no
terminal. Use-o para explorar os cases, componentes e fluxos documentados;
antes de promover uma alteração, execute `npm run check`.

Nunca faça merge no `main` sem rodar `npm run check` e abrir o site localmente. O `main` é público em tempo real.

## Antes de cada publicação

- [ ] Todo case tem status visível e verdadeiro
- [ ] Nenhuma afirmação de entrega, métrica ou certificação sem evidência
- [ ] Sem segredos, dados pessoais, dados de cliente, URL interna ou tela não autorizada
- [ ] Metadados EXIF removidos de todas as imagens
- [ ] Contraste ≥ 4,5:1, navegação por teclado funcionando, uma única `h1` por página
- [ ] Links testados, incluindo os externos
- [ ] Testado em celular, tablet e desktop
- [ ] `npm run check` verde (o `sitemap.xml` é gerado pelo build)

## Limites do GitHub Pages

| Limite | Valor |
|---|---|
| Tamanho do repositório | 1 GB recomendado |
| Tamanho do site publicado | 1 GB (máximo) |
| Banda | 100 GB/mês (limite flexível) |
| Builds | 10 por hora (limite flexível) |
| Timeout de deploy | 10 minutos |
| Sites de usuário por conta | 1 |

**Usos proibidos:** comércio eletrônico, SaaS comercial e processamento de transações sensíveis (senhas, cartões). Nenhum se aplica a um portfólio.

## Identidade visual

| Token | Valor |
|---|---|
| Fundo | `#000000` · painel `#0b0f10` |
| Acento | `#c4df00` (texto) e `#a2b700` (sólido) |
| Profundidade | teal `#003438` |
| Texto | `#ffffff` · secundário `#c1c1c1` |
| Bordas | `rgba(255,255,255,.07)` · lime `rgba(162,183,0,.25)` |
| Cartões | `linear-gradient(180deg, rgba(0,52,56,.30), rgba(0,0,0,.12))` |
| Raios | pílula `9999px` · cartão `20px` |
| Brilho | `0 0 40px rgba(162,183,0,.25)` |
| Tipografia | Mona Sans 400/600/700/800 |

Os tokens vivem em `src/css/base/tokens.css`. Alterar ali propaga para o site inteiro, inclusive para a página 404 — que recebe o mesmo arquivo pelo build, justamente para não derivar para outra marca.

## Licença

Código-fonte sob licença MIT. A fonte Mona Sans é distribuída sob SIL Open Font License 1.1 (ver `assets/fonts/OFL.txt`). Textos, imagens, diagramas e conteúdo dos cases são de autoria própria — todos os direitos reservados.
