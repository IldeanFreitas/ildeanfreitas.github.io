# ildeanfreitas.github.io

Portfólio profissional de Ildean Freitas — engenharia de dados, Power Platform e Power BI.

**Site:** https://ildeanfreitas.github.io

---

## Como este repositório funciona

Site estático em HTML, CSS e JavaScript puros. **Sem build, sem framework e sem dependência externa** — todo o CSS e o JS estão embutidos no `index.html` e a fonte Mona Sans é servida pelo próprio repositório. Zero requisição a terceiros, carregamento rápido e nenhuma questão de privacidade com fontes ou bibliotecas remotas.

```
.
├── index.html      # página única com todas as seções
├── 404.html        # página de erro com navegação de volta
├── robots.txt      # liberação para indexação + apontamento do sitemap
├── sitemap.xml     # ATUALIZAR a cada nova página
├── .nojekyll       # desliga o processamento Jekyll do GitHub Pages
├── .gitignore      # bloqueia segredos, .pbix, planilhas e extrações
├── README.md
└── assets
    ├── fonts/      # Mona Sans (SIL OFL 1.1), hospedada localmente
    └── img/
        ├── og-image.png              # 1200x630 — compartilhamento em redes
        ├── github-social-preview.png # 1280x640 — Settings > Social preview
        └── profile-banner.png        # 1280x400 — README de perfil
```

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
python -m http.server 8000
# abrir http://localhost:8000
```

Nunca faça merge no `main` sem abrir o site localmente primeiro. O `main` é público em tempo real.

## Antes de cada publicação

- [ ] Todo case tem status visível e verdadeiro
- [ ] Nenhuma afirmação de entrega, métrica ou certificação sem evidência
- [ ] Sem segredos, dados pessoais, dados de cliente, URL interna ou tela não autorizada
- [ ] Metadados EXIF removidos de todas as imagens
- [ ] Contraste ≥ 4,5:1, navegação por teclado funcionando, uma única `h1` por página
- [ ] Links testados, incluindo os externos
- [ ] Testado em celular, tablet e desktop
- [ ] `sitemap.xml` atualizado se houver página nova

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

Todos os tokens estão em `:root` no `index.html`. Alterar ali propaga para o site inteiro.

## Licença

Código-fonte sob licença MIT. A fonte Mona Sans é distribuída sob SIL Open Font License 1.1 (ver `assets/fonts/OFL.txt`). Textos, imagens, diagramas e conteúdo dos cases são de autoria própria — todos os direitos reservados.
