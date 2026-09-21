import { defineConfig } from 'vite-plus';

export default defineConfig({
  build: {
    ssr: 'src/index.ts',
    target: 'node22',
  },
  run: {
    tasks: {
      'build:native': {
        command: 'node scripts/bundle.js',
        dependsOn: ['@anima/frontend#build:native'],
      },
    },
  },
});
