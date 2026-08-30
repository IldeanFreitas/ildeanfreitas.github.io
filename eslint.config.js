/**
 * ESLint 9 (flat config).
 *
 * Hoje cobre apenas `scripts/` — o JavaScript do site ainda vive inline em
 * index.html e um linter não o alcança ali. A etapa 2 extrai esse código para
 * `src/js/`, e a partir daí a regra `no-unused-expressions` e a checagem de
 * `no-undef` passam a valer para o comportamento do site também.
 */
export default [
  {
    ignores: ['node_modules/**', 'index.html', '404.html']
  },
  {
    files: ['scripts/**/*.mjs', 'src/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        matchMedia: 'readonly',
        IntersectionObserver: 'readonly',
        setTimeout: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error'
    }
  }
];
