import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';

const PORT = process.env.PORT ?? 3000;

new Elysia({ adapter: node() })
  .get('/', () => 'Hello World')
  .listen(PORT, ({ hostname, port }) => {
    console.log(`🟢 Server running at http://${hostname}:${port}`);
  });
