# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**esportendence** - A tournament organizer for esports competitions. Full-stack web application built by a 4-person team for 42 Belgium.

## Tech Stack

- **Frontend:** Vue 3 + Vite + Vue Router
- **Backend:** NestJS (TypeScript)
- **Database:** PostgreSQL 15 with TypeORM
- **Auth:** JWT + Passport, 2FA support, Google OAuth
- **Real-time:** Socket.io
- **Infrastructure:** Docker Compose, Nginx reverse proxy

## Build & Run Commands

### Docker (Primary Development)
```bash
make all       # Initial setup + start all services
make up        # Start services (after initial setup)
make re        # Restart services
make down      # Stop services
make fclean    # Remove containers, volumes, networks
make fcleanall # Above + remove local Docker images
```

### Backend (in /backend)
```bash
npm run start:dev    # Dev server with hot reload
npm run start:debug  # Debug mode with hot reload
npm run build        # Production build
npm run start:prod   # Run production build
```

### Frontend (in /frontend)
```bash
npm run dev      # Dev server with hot reload
npm run build    # Production build
npm run preview  # Preview production build
```

### Testing (Backend)
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
npm run test:e2e      # E2E tests
```

Test files use pattern `*.spec.ts` in the `src/` directory.

### Linting
```bash
npm run lint    # ESLint with auto-fix (backend)
npm run format  # Prettier formatting (backend)
```

## Architecture

### Backend Module Structure (`/backend/src/modules/`)
- **auth/** - Authentication, JWT, 2FA, email verification, Google OAuth
- **users/** - User management, profiles, settings
- **friends/** - Friend requests, blocking system
- **chat/** - Real-time messaging with command/query pattern
- **mail/** - Email notifications via Nodemailer

### API Routes
All API routes are prefixed with `/api/`:
- `/api/auth/*` - Authentication (login, register, 2FA, Google OAuth)
- `/api/users/*` - User management
- `/api/social/*` - Friends and blocking
- `/api/chat/*` - Chat and messaging

### Database Entities
Main entities in their respective module's `entities/` folder:
- `User` - Core user with email verification and 2FA fields
- `UserProfile`, `UserSettings` - User-related data
- `RefreshToken` - JWT refresh tokens for persistent sessions
- `Friend`, `Block` - Friend relationships and user blocking (in friends module)
- `Chat`, `Message`, `ChatParticipant` - Chat system

### Docker Services
- **nginx** (ports 443, 80) - Reverse proxy routing to frontend/backend
- **backend** (internal port 3000) - NestJS API
- **frontend** (internal port 5173) - Vue dev server
- **db** (port 5432) - PostgreSQL
- **pgadmin** (port 5050) - Database GUI (admin@admin.com / admin)

### Network Flow
Nginx proxies:
- `/` → frontend:5173
- `/api/` → backend:3000
- `/socket.io/` → backend:3000

## Environment Setup

Copy `dotenv_example` to `.env` (handled by `make setup`). Key variables:
- `DB_*` - PostgreSQL connection
- `JWT_SECRET`, `JWT_EXPIRATION` - JWT configuration
- `MAIL_*` - Gmail SMTP for email verification
- `FRONTEND_URL` - Used for email verification links
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth credentials

Backend expects its `.env` at `/backend/.env` (copied during setup).

## Key Implementation Notes

- **TypeORM synchronize** is enabled in dev - schema auto-updates from entities
- **Chat module** uses explicit command/query pattern (see `commands/` and `queries/` folders)
- **WebSocket CORS** is currently permissive - needs restriction for production
- **Self-signed SSL** certificates in `nginx/ssl/` for local HTTPS

## Available Skills

Skills are located in `.claude/skills/` and provide specialized guidance for different tasks.

### Vue Development
- **vue** - Vue 3 Composition API, script setup macros, reactivity system, built-in components (Transition, Teleport, Suspense, KeepAlive)
- **vue-best-practices** - Comprehensive Vue.js patterns. ALWAYS use Composition API with `<script setup>` and TypeScript
- **vue-router** - Vue Router 4 patterns, navigation guards, route params, lifecycle interactions
- **vue-testing** - Vitest, Vue Test Utils, component testing, mocking patterns, Playwright E2E

### Frontend Quality
- **frontend-design** - Create distinctive, production-grade interfaces. Avoid generic AI aesthetics
- **interface-design** - Dashboard, admin panel, app, and tool interface design (not marketing sites)
- **web-design** - Web Interface Guidelines compliance, accessibility, UX audit
- **code-review** - Frontend code review for .tsx, .ts, .js files
- **component-refactoring** - Refactor high-complexity components, code splitting, hook extraction
- **frontend-testing** - Vitest + Testing Library tests for components, hooks, utilities

### Commands (in `.claude/commands/`)
- **init** - Build UI with craft and consistency
- **audit** - Check code against design system for violations
- **extract** - Extract design patterns from existing code
- **status** - Show current design system state

### Other
- **verifengineer** - Verification engineering skill

## Documentation

- `backend_architecture.md` - Full backend API documentation with all endpoints
- `frontend_dev.md` - Frontend development guide and how to connect to backend
- `weekly_planning.md` - Project timeline and task tracking
