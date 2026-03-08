import type { ElectrobunConfig } from 'electrobun';

export default {
  app: {
    name: 'anima',
    identifier: 'com.noeldemartin.anima',
  },
  build: {
    copy: {
      'src/assets': 'views/assets',
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
