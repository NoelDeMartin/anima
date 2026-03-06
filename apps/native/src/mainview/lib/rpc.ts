import { fail } from '@noeldemartin/utils';
import type { RPCRequests, RPC } from '@shared/rpc';
import { Electroview } from 'electrobun/view';

const rpc = Electroview.defineRPC<RPC>({ handlers: {} });
const electroview = new Electroview({ rpc });

export default function (): { request: RPCRequests } {
  return electroview.rpc ?? fail('Electrobun RPC missing');
}
