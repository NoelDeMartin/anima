import type { ElectrobunConfig } from 'electrobun';

export default {
  app: {
    name: 'anima',
    identifier: 'com.noeldemartin.anima',
  },
  build: {
    copy: {
      'dist/index.html': 'views/mainview/index.html',
      'dist/assets': 'views/mainview/assets',
      'bin/backend': 'bin/backend',
    },
    watchIgnore: ['dist/**'],
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
} satisfies ElectrobunConfig;
