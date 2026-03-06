import type { RPC } from '@shared/rpc';
import type { Subprocess } from 'bun';
import { BrowserView, type WindowOptionsType } from 'electrobun';

let serverProcess: Subprocess | null = null;

const rpc = BrowserView.defineRPC<RPC>({
  maxRequestTime: 5000,
  handlers: {
    requests: {
      getServerStatus: () => {
        return serverProcess !== null;
      },
      toggleServerStatus: () => {
        try {
          if (serverProcess !== null) {
            serverProcess.kill();
            serverProcess = null;

            return false;
          } else {
            serverProcess = Bun.spawn(['/home/noel/Work/electrobun-sandbox/bin/backend', 'serve'], {
              stdout: 'inherit',
              stderr: 'inherit',
            });

            return true;
          }
        } catch (error) {
          console.error('Error toggling server status: ', error);

          return false;
        }
      },
    },
  },
});

export default rpc as WindowOptionsType<any>['rpc'];
