/**
 * ESLint 9 (flat config).
 *
 * Dois conjuntos de regras, porque são dois códigos com restrições diferentes:
 * o do site vai direto ao navegador sem transpilação, e o de build roda no
 * Node.
 */
const globaisNavegador = {
  document: 'readonly',
  window: 'readonly',
  localStorage: 'readonly',
  console: 'readonly',
  Array: 'readonly',
  Date: 'readonly',
  String: 'readonly',
  IntersectionObserver: 'readonly'
};

export default [
  {
    ignores: ['node_modules/**', 'index.html', '404.html', 'test-results/**']
  },

  {
    // Código do site.
    files: ['src/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: 'script',
      globals: globaisNavegador
    },
    rules: {
      'no-undef': 'error',
      // `caughtErrors: none` permite `catch (e) {}` com corpo vazio, usado nos
      // dois pontos onde localStorage pode lançar em modo privado. O comentário
      // dentro do bloco explica cada um.
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'no-implicit-globals': 'error',

      // `var` e IIFE são escolha do autor, não defeito: o script vai ao
      // navegador sem passo de transpilação. Impor const/let aqui seria
      // reescrever estilo sob o rótulo de correção — decisão separada, se um
      // dia for tomada.
      'no-var': 'off',
      'prefer-const': 'off'
    }
  },

  {
    // Build e utilidades. Código novo, sem restrição de compatibilidade.
    files: ['scripts/**/*.mjs', 'tests/**/*.js', 'tests/**/*.mjs', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        document: 'readonly',
        getComputedStyle: 'readonly',
        structuredClone: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-undef': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error'
    }
  }
];
