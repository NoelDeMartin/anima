import { fileURLToPath, URL } from 'node:url';

import Aerogel, { AerogelResolver } from '@aerogel/vite';
import I18n from '@intlify/unplugin-vue-i18n/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    Aerogel({ name: 'Ànima', soukaiBis: true, baseUrl: 'https://anima.noeldemartin.com' }),
    Components({
      deep: true,
      dts: 'src/types/components.d.ts',
      dirs: ['src/components', 'src/pages'],
      resolvers: [AerogelResolver(), IconsResolver()],
    }),
    I18n({ include: fileURLToPath(new URL('./src/lang/**/*.yaml', import.meta.url)) }),
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
