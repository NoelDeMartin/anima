import type { ElectrobunConfig } from 'electrobun';

export default {
  app: {
    name: 'anima',
    identifier: 'com.noeldemartin.anima',
    version: '0.0.0',
  },
  build: {
    copy: {
      'src/assets': 'views/assets',
      'bin/backend': 'bin/backend',
    },
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
