# esportendence

An esports companion platform for 42 Belgium, by Ahmet Tamer, Louis Watelle, Nicolas Orban Wirocco, and Simon Langerock.

## Overview

**esportendence** is a full-stack web application where users create accounts, manage friendships, chat in real-time, view their tournament match history, organize tournaments, and manage teams and organizations.

- **Repository:** https://github.com/Simonization/42-Transcendence (fork; upstream team repo: https://github.com/Wicoro/42-Transcendence)
- **Live demo:** https://transcendence.langerock.xyz
- **Timeline:** Jan 19 - Mar 1, 2026
- **Status:** Final week — 23/14 points achieved

> 📋 **For jury evaluation:** see [`PROJECT_DETAILS.md`](./PROJECT_DETAILS.md) for project management approach, full module breakdown with justifications, database schema, and individual contributions.

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3 + Vite + TypeScript (Composition API) |
| Backend | NestJS + TypeORM |
| Database | PostgreSQL 15 |
| Auth | JWT + Passport + Google OAuth + 2FA |
| Real-time | Socket.io WebSockets |
| Containers | Docker Compose + Nginx (self-signed SSL) |

## Team

| Member | Role |
|--------|------|
| **Louis Watelle** | Backend — Auth, JWT, 2FA, OAuth, permissions |
| **Nicolas Orban Wirocco** | Backend — Database, users, friends, chat, tournaments |
| **Ahmet Tamer** | DevOps — Docker/Nginx, testing, OAuth integration |
| **Simon Langerock** | Frontend — Vue architecture, API layer, design system |

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Installation

```bash
git clone https://github.com/Simonization/42-Transcendence.git
cd 42-Transcendence
make setup    # or: cp .env.example .env
make up       # start all services
```

### Access

| Service | URL |
|---------|-----|
| Frontend | https://localhost:8443 |
| Backend API | https://localhost:8443/api/ |
| pgAdmin (dev only) | https://localhost:5050 |
| Postgres (dev only, host-side) | localhost:5433 — published on 5433 rather than 5432, since a 42 piscine container often already holds 5432 locally |

### Dev Commands

```bash
# Docker
make up / make re / make down / make fclean

# Backend (in /backend)
npm run start:dev          # dev server
npm test                   # unit tests
npm run test:db            # concurrency / migration tests on a throwaway embedded Postgres
npm run migration:verify   # migrations vs entities, and the upgrade of old data

# Frontend (in /frontend)
npm run dev                # dev server
npx vitest run             # tests

# Everything at once (see Checks below)
make check
```

## Checks

```bash
make check            # the whole gate, stops at the first failure, prints timings
make check-backend    # or just one part: check-backend / check-frontend / check-extras
E2E=1 make check      # also render /login in headless Chromium (needs Playwright; skipped otherwise)
```

`make check` runs `scripts/check.sh` (bash, Node 22, no Docker; missing `node_modules` are installed with `npm ci`):

1. backend: `npx jest`, `npx nest build`, `npm run test:db`, `npm run migration:verify` (the two DB steps use a throwaway embedded Postgres on ports 55441 and 55440; override with `TEST_DB_PORT` / `MIGRATION_VERIFY_PORT`)
2. frontend: `npx vitest run`, `npm run build` (vue-tsc + vite)
3. `scripts/check-i18n.mjs`: the en/fr/tr locale files have no duplicate keys, the same key set, and the same `{placeholders}` per key
4. `scripts/check-spa-keys.mjs` (needs the frontend build): every literal `t('...')` key in the source exists, every message compiles with vue-i18n's compiler (a stray `@` makes a message render as its raw key), and the built bundle contains the message compiler and the shipped messages. It cannot catch dynamic keys or runtime state; see the header of the script.

GitHub Actions (`.github/workflows/ci.yml`) runs the same steps on every push and pull request to `main`, plus a job that builds `backend/Dockerfile.prod` and checks that `@resvg/resvg-js` loads and renders inside the image (`scripts/smoke-resvg.cjs`).

## Documentation

- **[`PROJECT_DETAILS.md`](./PROJECT_DETAILS.md)** — Project management, modules, DB schema, individual contributions (jury reference)
- **`Corrector.md`** — Module scoring reference (23 points)
- **`frontend/FRONTEND_DOC.md`** — Frontend API contract & integration guide
- **`backend/README.md`** — Backend modules & API endpoints

## AI Disclosure

Simon uses Claude Code (Anthropic's CLI) for frontend development assistance. All contributions tracked in git history.
