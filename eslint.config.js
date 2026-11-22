import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules', '.loop'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Architectural rule: scheduling + domain modules must stay framework-free and clock-free.
    files: ['src/scheduling/**/*.ts', 'src/domain/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['react', 'react-dom', '*/storage/*', '*/state/*', '*/ui/*', '*/screens/*'] }],
      'no-restricted-globals': ['error', 'localStorage', 'sessionStorage', 'window', 'document'],
      'no-restricted-syntax': ['error', { selector: "MemberExpression[object.name='Date'][property.name='now']", message: 'Scheduling code must receive the current time as an input.' }, { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'Scheduling code must receive the current time as an input.' }],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
  },
);
