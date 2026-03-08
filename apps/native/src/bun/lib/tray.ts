import { arrayFilter } from '@noeldemartin/utils';
import { Tray, Utils, type MenuItemConfig } from 'electrobun';

import { isServerRunning, openServer, startServer, stopServer } from './server';

type Action = 'start' | 'open' | 'stop' | 'help';

function getMenu(): Array<MenuItemConfig & { action: Action }> {
  const serverRunning = isServerRunning();

  return arrayFilter([
    !serverRunning && {
      type: 'normal',
      label: 'Start Ànima',
      action: 'start',
    },
    serverRunning && {
      type: 'normal',
      label: 'Open Ànima',
      action: 'open',
    },
    serverRunning && {
      type: 'normal',
      label: 'Stop Ànima',
      action: 'stop',
    },
    {
      type: 'normal',
      label: 'Get help',
      action: 'help',
    },
  ]);
}

export function configureTray() {
  const tray = new Tray({
    title: 'Ànima',
    image: 'views://assets/active.svg',
    template: true,
    width: 32,
    height: 32,
  });

  const update = () => {
    tray.setImage(isServerRunning() ? 'views://assets/active.svg' : 'views://assets/stopped.svg');
    tray.setMenu(getMenu());
  };

  tray.on('tray-clicked', (async ({ data: { action } }: { data: { action: Action } }) => {
    switch (action) {
      case 'start':
        await startServer();

        break;
      case 'stop':
        await stopServer();

        break;
      case 'open':
        await openServer();

        break;
      case 'help':
        Utils.openExternal('https://github.com/noeldemartin/anima/issues/new');

        break;
    }

    update();
  }) as () => unknown);

  update();
}
