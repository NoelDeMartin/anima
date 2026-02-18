import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { node } from '@elysiajs/node';

const PORT = process.env.PORT ?? 3000;

export const Api = new Elysia({ adapter: node() })
  .use(cors())
  .get('/', () => 'Hello World')
  .get('/ping', () => ({ pong: true }))
  .listen(PORT, ({ hostname, port }) => {
    console.log(`🟢 Server running at http://${hostname}:${port}`);
  });
