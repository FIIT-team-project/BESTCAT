import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/migrations/**/*.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  globalIgnores(['.next/**', 'dist/**', 'media/**', 'src/payload-types.ts', 'src/app/(payload)/admin/importMap.js']),
])
