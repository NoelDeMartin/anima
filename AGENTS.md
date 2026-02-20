# Agent Guidelines

This repository contains the monorepo for Ànima, a personal AI assistant built around the Solid Protocol.

## Folder structure

- `apps/backend/`: A web server built using ElysiaJS. Controls the LLMs using ollama and Vercel's AI SDK, and the interactions with Solid PODs.
- `apps/frontend/`: An SPA built using Vue and TailwindCSS. This is the main interface of the application.
- `apps/native/`: A native application built using Tauri. This one only starts and stops the web server, not used during development.
- `e2e/`: Playwright tests.
- `packages/*/`: Shared libraries.

## Tooling

Dependencies are managed using `pnpm`, with the following scripts can be used to apply checks in the entire monorepo:

- `pnpm lint and pnpm lint:fix`: Checks and fixes linting issues with Oxlint.
- `pnpm format` and `pnpm format:fix`: Checks and fixes formatting with Oxfmt.
- `pnpm type-check`: Runs type checks.
- `pnpm dev`: Launches the backend, frontend, and a local Solid POD server for development. The application can be used in `http://localhost:5173`.
- `pnpm dev:e2e`: Launches the services to be used in the E2E environment (mocks some dependencies like AI models).
- `pnpm e2e`: Runs Playwright tests, launching `dev:e2e` if necessary, but reusing the process if it's running.

## Instructions

- Always run `pnpm lint`, `pnpm format` and `pnpm type-check` after completing any task.
- Only run E2E tests when modifying critical flows, don't run them for small tweaks.
- Be extremely concise in your replies. Sacrifice grammar for the sake of concision.
