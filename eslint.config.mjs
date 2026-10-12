import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['node_modules/', 'dist/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/server/**/*.ts', 'tests/**/*.ts', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
)
