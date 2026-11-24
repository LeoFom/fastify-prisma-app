import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'src/generated/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: Object.fromEntries(
        [
          'process',
          'console',
          'Buffer',
          'URL',
          'fetch',
          'setTimeout',
          'clearTimeout',
          'require',
          'module',
          '__dirname',
          '__filename',
        ].map((name) => [name, 'readonly']),
      ),
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      // DTO/any removal belongs to C1; keep syntax and unused-code checks active now.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
)
