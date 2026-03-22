# Agent Guidelines

This repository contains the monorepo for Ànima, a personal AI assistant built around the Solid Protocol.

## Folder structure

- `apps/backend/`: A web server built using ElysiaJS. Controls the LLMs using ollama and Vercel's AI SDK, and the interactions with Solid PODs.
- `apps/frontend/`: An SPA built using Vue and TailwindCSS. This is the main interface of the application.
- `apps/native/`: A native application built using Tauri. This one only starts and stops the web server, not used during development.
- `e2e/`: Playwright tests.
- `packages/*/`: Shared libraries.

## Tooling

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`.

These are the following commands to work with the monorepo:

- `vp check`: Runs linting, formatting, and type checks.
- `vp run dev`: Launches the backend, frontend, and a local Solid POD server for development. The application can be used in `http://localhost:5173`.
- `vp run e2e:serve`: Launches the services to be used in the E2E environment (mocks some dependencies like AI models).
- `vp run e2e`: Runs Playwright tests (install dependencies first with `vp run e2e#install-deps`).

## Instructions

- Always run `vp check` after completing any task.
- Only run E2E tests when modifying critical flows, don't run them for small tweaks.
- Be extremely concise in your replies. Sacrifice grammar for the sake of concision.
