import { fileURLToPath, URL } from 'node:url';

import Aerogel, { AerogelResolver } from '@aerogel/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    Aerogel(),
    Components({
      deep: true,
      dts: 'src/types/components.d.ts',
      dirs: ['src/components', 'src/pages'],
      resolvers: [AerogelResolver(), IconsResolver()],
    }),
    Icons({
      iconCustomizer(_, __, props) {
        props['aria-hidden'] = 'true';
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
