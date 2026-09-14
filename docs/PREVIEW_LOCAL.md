# Prévia local e validação antes do deploy

## Objetivo

Permitir que o portal e os casos documentados sejam explorados localmente,
antes de qualquer publicação. A prévia é intencionalmente local: não cria
conexões, não altera ambientes Power Platform e não envia dados.

## Desenvolvimento em tempo real

Na raiz de `portfolio-site`:

```bash
npm install
npm run dev
```

Abra `http://localhost:4173`. Toda alteração salva em `src/` ou em `scripts/`
dispara uma reconstrução. A aba recarrega apenas se o build for bem-sucedido;
se houver erro, o último artefato válido permanece disponível e o terminal
mostra o diagnóstico.

O modo `npm run serve` continua disponível para auditoria estática do artefato
já montado, sem observação de arquivos.

## Roteiro de exploração

1. Navegue pelos cases e confirme textos, diagramas e links de evidência.
2. Teste o seletor de tema, navegação por teclado, menu compacto e os três
   tamanhos de tela cobertos pelo Playwright: celular, tablet e desktop.
3. Revise componentes reutilizáveis em
   `../power_platform_component_library` e os contratos documentados.
4. Revise os fluxos e controles de entrega nos cases e em
   `../power_platform_delivery_governance` antes de promover a solução.

## Gate de validação

Antes de deploy, pare a prévia e execute:

```bash
npm run check
```

O gate confere que os arquivos gerados correspondem à fonte, executa os
linters, confirma a formatação e roda comportamento, acessibilidade e uso sem
JavaScript. Quando houver alteração visual deliberada, crie a referência local
antes da mudança com `npm run baseline` e compare ao final com
`npm run test:visual`.

## ALM

Este ciclo cobre a visualização do portal de evidências. Para artefatos
executáveis Power Platform, mantenha o ciclo separado e governado:

- desenvolvimento em solution não gerenciada no ambiente Dev;
- variáveis de ambiente e connection references, sem URLs ou IDs fixos;
- validação funcional em Dev/UAT e exportação managed para produção;
- evidências de testes e aprovação do gate anexadas à mudança.

Assim, a prévia local acelera a revisão do que será entregue sem se passar por
um emulador de Canvas Apps ou de Power Automate — esses serviços precisam ser
validados no ambiente Power Platform correspondente.
