import { fileURLToPath, URL } from 'node:url';

import Aerogel, { AerogelResolver } from '@aerogel/vite';
import I18n from '@intlify/unplugin-vue-i18n/vite';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  publicDir: fileURLToPath(new URL('./src/assets/public/', import.meta.url)),
  plugins: [
    Aerogel({
      name: 'Ànima',
      baseUrl: 'https://anima.noeldemartin.com',
      pwa: process.env.PWA === 'false' ? false : undefined,
    }),
    Components({
      deep: true,
      dts: 'src/types/components.d.ts',
      dirs: ['src/components', 'src/pages'],
      resolvers: [AerogelResolver(), IconsResolver({ customCollections: ['app'] })],
    }),
    I18n({ include: fileURLToPath(new URL('./src/lang/**/*.yaml', import.meta.url)) }),
    Icons({
      iconCustomizer(_, __, props) {
        props['aria-hidden'] = 'true';
      },
      customCollections: {
        app: FileSystemIconLoader('./src/assets/icons'),
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
