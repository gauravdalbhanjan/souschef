import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Build output and vendor files copied from node_modules (scripts/copy-ocr.mjs).
  globalIgnores(['dist', 'public/tesseract']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Leading underscore = intentionally unused (e.g. destructuring a field out).
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // Pre-existing patterns flagged by the React Compiler rules and Fast
      // Refresh: kept visible as warnings (tracked as tech debt), not CI blockers.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // Node code: the Vercel function, build scripts, tests, Vite config.
    files: ['api/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.js', 'vite.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
])
