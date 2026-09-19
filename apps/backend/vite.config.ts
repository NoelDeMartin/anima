import { defineConfig } from 'vite-plus';

export default defineConfig({
  build: {
    ssr: 'src/index.ts',
    target: 'node22',
  },
  run: {
    tasks: {
      'build:native': {
        command: 'bash scripts/bundle.sh',
        dependsOn: ['@anima/frontend#build:native'],
      },
    },
  },
});
