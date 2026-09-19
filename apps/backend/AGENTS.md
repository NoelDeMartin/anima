# Backend Agent Guidelines

The `@anima/backend` package is the web server for Ànima.

## Overview

- **Framework**: Built with [Elysia](https://elysiajs.com) using the Node.js adapter (`@elysiajs/node`).
- **Runtime**: Runs as a Node.js process (Node 22+).
- **Core responsibilities**:
  - LLM orchestration using Vercel's AI SDK.
  - Solid POD authentication and proxying.
  - Managing an internal Community Solid Server (CSS) instance when running in managed POD mode.
  - Statically serving the frontend when bundled (`SERVE_FRONTEND=true`).

## Endpoints

### Always Available

- **OIDC & Client ID** (`src/routes/oidc/index.ts`):
  - `GET /clientid.jsonld` — Solid OIDC Client ID document.
  - `GET /oidc/redirect` — OIDC login callback.
  - `GET /oidc/logout` — OIDC post-logout callback.
- **API Auth** (`src/routes/api/auth.ts`):
  - `GET /api/auth/session` — Get current user session profile.
  - `POST /api/auth/login` — Initiate external OIDC login flow.
  - `POST /api/auth/logout` — Terminate session.
  - `POST /api/auth/proxy` — Authenticated Solid fetch proxy.
- **AI Endpoints** (`src/routes/api/ai/index.ts`) _(requires active session)_:
  - `GET /api/ai/providers`, `POST /api/ai/providers`, `DELETE /api/ai/providers/:name` — Manage AI providers.
  - `GET /api/ai/models`, `POST /api/ai/models`, `DELETE /api/ai/models/:id` — Manage AI models.
  - `GET /api/ai/chats`, `POST /api/ai/chats/:url/messages` — List chats and stream chat messages.

### Managed POD (`MANAGED_POD=true`)

_Endpoints return `404` when managed POD is disabled._

- **Solid Auth** (`src/routes/api/solid.ts`):
  - `POST /api/signup` — Create CSS POD account.
  - `POST /api/login` — Login to managed CSS POD.
- **POD Proxy** (`src/routes/pod/index.ts`):
  - `ALL /pod/*` — Proxies unauthenticated requests to the internal CSS instance (`:3000`), blocking guarded paths (`/idp/register/`, `/pod/create/`).

### E2E Testing (`E2E=true`)

_Route not mounted unless `E2E=true` is set._

- **E2E Reset** (`src/routes/e2e/index.ts`):
  - `POST /__e2e__/reset` — Resets sessions, restarts CSS, and resets AI models/providers.

### Static Frontend (`SERVE_FRONTEND=true`)

_Route not mounted unless `SERVE_FRONTEND=true` is set; registered after all API routes._

- **SPA Assets** (`src/routes/frontend/index.ts`):
  - `GET /*` — Serves static assets from `public/` or falls back to `index.html`.
