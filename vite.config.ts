import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    singleQuote: true,
    printWidth: 120,
    experimentalSortPackageJson: {
      sortScripts: true,
    },
    experimentalSortImports: {},
  },
  lint: {
    plugins: ['eslint', 'typescript', 'unicorn', 'oxc'],
    categories: {
      correctness: 'error',
    },
    rules: {
      'eslint/no-unused-vars': 'error',
      'eslint/no-unused-expressions': 'off',
      'typescript/consistent-type-imports': 'error',
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
