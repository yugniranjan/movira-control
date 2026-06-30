import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // ─── Theming guardrails ─────────────────────────────────────────
      // Catch hardcoded brand-color literals so new code uses CSS variables
      // (var(--brand-primary), var(--surface-card), etc.) defined in
      // index.css. See docs/design-pos-theme-system.md for the token map.
      'no-restricted-syntax': [
        'warn',
        {
          // Indigo / cyan brand color hex literals
          selector: "Literal[value=/#(818CF8|6366F1|22D3EE|06B6D4|4F46E5|4338CA|A5B4FC|C7D2FE)/i]",
          message:
            'Hardcoded brand color hex. Use var(--brand-primary), var(--brand-primary-deep), or var(--brand-secondary) instead.',
        },
        {
          // Dark navy modal/popup gradients
          selector: "Literal[value=/#(0E1422|0B1020|0F1726|0F1726|111827)/i]",
          message:
            'Hardcoded dark surface color. Use var(--surface-card), var(--surface-panel), or var(--option-bg) — those swap correctly across themes.',
        },
        {
          // Indigo-alpha tints
          selector: "Literal[value=/rgba\\(\\s*99\\s*,\\s*102\\s*,\\s*241/]",
          message:
            'Hardcoded indigo-alpha. Use var(--brand-primary-soft) or var(--brand-primary-border).',
        },
        {
          // Cyan-alpha tints
          selector: "Literal[value=/rgba\\(\\s*(34\\s*,\\s*211\\s*,\\s*238|6\\s*,\\s*182\\s*,\\s*212)/]",
          message:
            'Hardcoded cyan-alpha. Use var(--brand-secondary-soft) or var(--brand-secondary-border).',
        },
      ],
    },
  },
  {
    files: ['e2e/**/*.js', 'playwright.config.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
]
