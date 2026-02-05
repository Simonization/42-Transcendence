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

## Subagent Strategy (Token Optimization)

Claude Code can launch specialized subagents for complex multi-step tasks. **Choose the model strategically based on task type** to minimize token usage while maintaining quality.

### Model Selection by Task Type

| Task Type | Recommended Model | Why | Example |
|-----------|-------------------|-----|---------|
| **Planning & Architecture** | `opus` | Complex reasoning, tradeoffs, system design | "Design auth flow", "Plan refactoring approach" |
| **Implementation (coding)** | `sonnet` | Good balance of capability and cost for most code work | "Add new feature", "Fix bug in component" |
| **Documentation & Summaries** | `haiku` | Fast, cheap, sufficient for synthesis and writing | "Generate API docs", "Summarize findings" |
| **Code Review & Analysis** | `sonnet` or `haiku` | Haiku for quick reviews; Sonnet for deep analysis | "Review PR code", "Analyze test coverage" |
| **Research & Exploration** | `sonnet` | Needs strong reasoning to navigate unknown codebases | "Find where errors are handled" |
| **Git/CLI Operations** | `haiku` | Simple commands, no reasoning needed | "Commit changes", "Create branches" |

### Token-Saving Best Practices

1. **Don't make agents re-read files**
   - Main agent reads docs once and summarizes for subagent
   - Pass specific file paths, not entire repo exploration
   - Example: Instead of "explore the codebase", give: "Read `/frontend/docs/architecture.md` and `/frontend/docs/components.md`, then..."

2. **Leverage existing documentation**
   - Subagents can read `/frontend/docs/` files in parallel (no cost to main agent context)
   - Use documentation to provide context without expanding prompt
   - Example: `"You have access to /frontend/docs/modules.md which documents the API layer. Use it as reference while..."`

3. **Use background execution for long tasks**
   - `run_in_background: true` for tasks > 2 minutes
   - Main agent continues while subagent works
   - Check progress with `TaskOutput` if needed

4. **Batch related work in one subagent**
   - Instead of 3 separate agents for 3 files, use 1 agent to process all 3
   - Same context setup cost, more efficient
   - Only launch multiple agents for truly parallel, independent tasks

### Example Subagent Launches

**Efficient - Multiple related tasks in one Haiku agent:**
```
Task("Generate API documentation",
     subagent_type="general-purpose",
     model="haiku",  # Sufficient for synthesis
     prompt="Read /docs/backend_architecture.md and create OpenAPI docs...")
```

**Efficient - Parallel Sonnet agents for independent coding tasks:**
```
Multiple Task() calls in same message:
- Agent 1 (Sonnet): "Implement auth guard"
- Agent 2 (Sonnet): "Add password validation"
- Agent 3 (Haiku): "Update README with new auth flow"
```

**Inefficient - Re-reading entire repo:**
```
❌ Task("Analyze frontend", prompt="Read all frontend files and...")
✓ Task("Analyze frontend", prompt="Read /frontend/docs/code-quality-report.md for context, then analyze useChat.ts...")
```

### When to Use Each Subagent Type

- **`general-purpose`** - Most flexible, use for research, code work, analysis
- **`Explore`** - Finding patterns across codebase when no docs exist yet
- **`Plan`** - Architectural planning before implementation
- **`Bash`** - Git operations, running commands (consider just doing in main agent for simple tasks)

---

## Documentation Index

All documentation is organized in dedicated directories (no scattered .md files at root level).

### Project-Level Documentation (`/docs`)
- **`backend_architecture.md`** - Complete backend API documentation with all endpoints, modules, entities, and flows
- **`TYPE_SYSTEM_GUIDE.md`** - Type system design, conventions, and patterns used across frontend and backend

### Frontend Documentation (`/frontend/docs`)
- **`frontend_dev.md`** - Frontend development setup, workflows, and connection to backend
- **`architecture.md`** - Frontend dependency graphs, data flow, route table, architectural decisions
- **`modules.md`** - API layer, type system, composables, theme system reference
- **`components.md`** - Every component documented: props, events, slots, usage patterns
- **`getting-started.md`** - New contributor onboarding guide with key patterns and common gotchas
- **`file-index.md`** - Complete file inventory with line counts and cross-references
- **`code-quality-report.md`** - Code review findings: Vue best practices, TypeScript quality, bug risks, test gaps
- **`design-ux-report.md`** - Design system audit, accessibility review, responsive assessment, token usage analysis

### Internal Project Planning (`/.claude/docs`, gitignored)
- **`implementation_plan.md`** - Project implementation roadmap and feature planning
- **`weekly_planning.md`** - Weekly tasks and progress tracking
- **`RECOMMENDED_SKILLS.md`** - Skills that should be created/enhanced for frontend (prioritized by impact)

### Skills & References (`/.claude/skills/`)
Auto-loaded by Claude Code when using skills like `vue-best-practices`, `code-review`, `web-design`, etc.
Each skill includes SKILL.md and reference guides for specific topics.
