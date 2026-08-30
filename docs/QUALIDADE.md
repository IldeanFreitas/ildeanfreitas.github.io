# Qualidade e rede de proteção

Como verificar que uma mudança no site não quebrou nada.

## Comandos

```bash
npm install                 # uma vez
npx playwright install chromium

npm run lint                # CSS, JavaScript e HTML
npm test                    # comportamento, acessibilidade e sem-JavaScript
npm run test:visual         # regressão visual (só local — ver abaixo)
npm run serve               # http://localhost:4173
```

## O que cada suíte protege

| Arquivo                        | Protege                                         |
| ------------------------------ | ----------------------------------------------- |
| `tests/sem-javascript.spec.js` | Que o conteúdo continue legível sem JavaScript  |
| `tests/comportamento.spec.js`  | As funcionalidades inventariadas no diagnóstico |
| `tests/acessibilidade.spec.js` | axe-core nos dois temas, mais hierarquia e alt  |
| `tests/visual.spec.js`         | Que a refatoração não mude o desenho da página  |

## Regressão visual roda só localmente

Duas razões, ambas concretas.

**As capturas dependem do sistema operacional.** O rasterizador de fonte do
Linux produz pixels diferentes dos do Windows, e os arquivos nascem com sufixo
de plataforma (`pagina-dark-desktop-win32.png`). Rodar a suíte no CI compararia
contra outra máquina e falharia sempre, sem apontar defeito algum.

**E são pesadas.** Um conjunto completo passa de 21 MB. Versioná-las faria o
Git guardar cada revisão para sempre, num repositório cujo conteúdo real são
72 KB de HTML.

Por isso `tests/*-snapshots/` está no `.gitignore` e o fluxo é local:

```bash
npm run baseline        # ANTES de começar a etapa — fotografa o estado atual
# ... faz a refatoração ...
npm run test:visual     # AO TERMINAR — compara contra a fotografia
```

A referência é transitória de propósito: ela existe para provar que uma etapa
específica não mudou o desenho, não para descrever o site em definitivo.

### A armadilha que já pegou aqui

A primeira versão desta suíte trocava o tema com `addInitScript`. Naquele
momento o documento ainda não existe, e o `data-theme="dark"` fixo no HTML
sobrescrevia o valor — as capturas `dark` e `light` saíam **byte a byte
idênticas**, e a suíte passava sem comparar nada.

Por isso cada teste de tema afirma a cor de fundo antes de capturar. Se a troca
não pegar, o teste falha dizendo o que houve, em vez de aprovar uma referência
vazia.

## Baseline registrada em 2026-08-30

Estado do commit `813fbb5` com o ferramental da etapa 0 instalado:

```
53 passed · 12 failed · 1 skipped
```

As 12 falhas são **quatro defeitos reais, cada um reproduzido nas três
viewports** — não instabilidade de teste. São a prova executável do diagnóstico:

| Teste que falha                                 | Defeito                                 | Etapa que corrige |
| ----------------------------------------------- | --------------------------------------- | ----------------- |
| `o conteúdo revelável está visível`             | `.reveal{opacity:0}` sem `<noscript>`   | 1                 |
| `remover um elemento opcional…`                 | IIFE sem isolamento de falhas           | 1                 |
| `a escolha de tema sobrevive ao recarregamento` | Sem persistência em `localStorage`      | 5                 |
| `index sem violações — tema light`              | `.case-visual{background:#000}` literal | 1                 |

O teste pulado é o do menu compacto em desktop, onde ele não existe.

Um teste desta tabela voltar a falhar depois da sua etapa significa regressão,
não expectativa desatualizada.

## Regras de lint deliberadamente afrouxadas

`no-inline-style` está em `warn`, não `error`: o site tem 15 atributos `style`
de espaçamento, previstos para sair na etapa 3. Vira `error` quando o último
sair.

As regras cosméticas do stylelint — linha em branco antes de at-rule, tamanho de
hex, caixa de palavra-chave — estão desligadas. O CSS é escrito num estilo
compacto deliberado, e essas regras brigariam com a escolha do autor sem apontar
defeito nenhum.
