import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

export default ts.config(
  { ignores: ['dist/**', 'backend/build/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: { globals: Object.fromEntries(['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'performance', 'ResizeObserver', 'HTMLElement', 'HTMLHeadingElement', 'HTMLDivElement', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLSelectElement', 'HTMLSpanElement', 'HTMLDialogElement', 'Element', 'SVGSVGElement', 'SVGElement', 'Event', 'KeyboardEvent', 'URL', 'URLSearchParams', 'console', 'process', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'fetch'].map(name => [name, 'readonly'])) },
    rules: { '@typescript-eslint/no-explicit-any': 'off', 'svelte/require-each-key': 'off', 'svelte/no-at-html-tags': 'error', 'svelte/no-dom-manipulating': 'off', 'svelte/no-useless-mustaches': 'off', 'svelte/prefer-svelte-reactivity': 'off', 'svelte/prefer-writable-derived': 'off', '@typescript-eslint/no-unused-vars': ['error', {varsIgnorePattern: '^_$'}] }
  },
  { files: ['**/*.svelte'], languageOptions: { parserOptions: { parser: ts.parser } } },
);
