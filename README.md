# esportendence

A tournament organizer for esports competitions, created for 42 Belgium by Ahmet Tamer, Louis Watelle, Nicolas Orban Wirocco, and Simon Langerock.

## Project Overview

**esportendence** is a full-stack web application for organizing and managing esports tournaments. Users can create accounts, manage friendships, chat in real-time, and participate in organized tournament brackets.

- **Project Repository:** https://github.com/Wicoro/42-Transcendence
- **Documentation:** Google Docs specification: https://docs.google.com/document/d/1zdf079lEJqqbx9p4P-mLMo3ZPIluBtxt0sC1ao2E4Ak
- **Task Tracking:** https://docs.google.com/spreadsheets/d/1_n5ql6kverWHChRL5XJNWhIwYxnunGBGKnGAgUoVzfk
- **Project Timeline:** 6 weeks (Jan 19 - Mar 1, 2026)
- **Status:** End of Week 3 (Friday, Feb 6)

## Technical Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Vue 3 + Vite + Vue Router | Composition API with TypeScript |
| Backend | NestJS + TypeORM | Originally planned Django; switched Week 1 for consistency |
| Database | PostgreSQL 15 | Auto-sync schema via TypeORM in development |
| Authentication | JWT + Passport + Google OAuth | Email-based 2FA (TOTP not required for MVP) |
| Real-time | Socket.io | WebSocket gateway implemented; integration pending |
| Containerization | Docker Compose + Nginx | Self-signed SSL for local HTTPS, reverse proxy setup |

## Progress by Week

### Week 1 (Jan 19-25): Foundation ✅

**Goal:** Set up Docker, initialize frameworks, begin authentication.

| Feature | Contributor | Status |
|---------|-------------|--------|
| Docker Compose (nginx, backend, frontend, db, pgadmin) | Ahmet Tamer | Done |
| NestJS backend scaffold | Ahmet Tamer | Done |
| Vue 3 + Vite frontend scaffold | Ahmet Tamer | Done |
| TypeORM database setup | Ahmet Tamer, Nicolas Orban | Done |
| TypeORM entities (User, Profile, Settings, Friends, Chat) | Nicolas Orban | Done |
| User management & password hashing | Nicolas Orban | Done |
| JWT authentication foundation | Louis Watelle | Done |
| Refresh token implementation | Louis Watelle | Done |
| Friends module (add/remove/block/unblock) | Nicolas Orban | Done |
| Makefile (up, down, fclean) | Louis Watelle | Done |

**Key decisions:** Switched from Django to NestJS for backend consistency with TypeScript.

**Commits:** 18 | **Contributors:** 3/4

---

### Week 2 (Jan 26 - Feb 1): Core Auth & API Structure ✅

**Goal:** Complete user registration/login flow, implement OAuth, establish backend API patterns.

| Feature | Contributor | Status |
|---------|-------------|--------|
| JWT access + refresh token flow | Louis Watelle | Done |
| User registration with email verification | Louis Watelle | Done |
| Email verification via Nodemailer | Louis Watelle | Done |
| User login + logout | Louis Watelle | Done |
| Two-factor authentication (email-based) | Louis Watelle | Done |
| Google OAuth 2.0 integration (backend) | Nicolas Orban | Done |
| User profile management endpoints | Nicolas Orban | Done |
| Chat module (backend) | Nicolas Orban | Done |
| Friends module (backend improvements) | Nicolas Orban | Done |
| Google OAuth frontend testing | Ahmet Tamer | Done |
| Project Planning in and doc in README | Simon Langerock | Done |

**Key decisions:** Switched from Riot OAuth (API unsuitable) to Google OAuth. Implemented email-based 2FA instead of TOTP for MVP simplicity.

**Commits:** 22 | **Contributors:** 4/4

---

### Week 3 (Feb 2-8): Frontend Architecture & API Integration 🔄 IN PROGRESS

**Goal:** Build frontend application structure, implement API layer, enable social features, establish design system.

| Feature | Contributor | Status |
|---------|-------------|--------|
| CSS fixes (dashboard, login pages) | Ahmet Tamer | Done |
| .env generator script improvements | Louis Watelle | Done |
| Google OAuth integration (ports, configs) | Ahmet Tamer | Done |
| Phase 1 API Service Layer (typed, auto-refresh) | Simon Langerock | Done |
| Vue Router setup (auth, menu, nested routes) | Simon Langerock | Done |
| Enable FriendsModule in app.module.ts | Simon Langerock | Done |
| Enable ChatModule in app.module.ts | Simon Langerock | Done |
| Frontend testing infrastructure (Vitest + Vue Test Utils) | Simon Langerock | Done |
| 115 unit tests (API, composables, components) | Simon Langerock | Done |
| Dual-theme system (Stellar light/orange + Dragon dark/gold) | Simon Langerock | Done |
| Design tokens and CSS variable system | Simon Langerock | Done |
| Core UI components (buttons, forms, cards) | Simon Langerock | Done |
| Authentication pages (login, register, 2FA, email verify) | Simon Langerock | Done |
| Frontend documentation & guides | Simon Langerock | Done |

**Key decisions:** Frontend branch (`simon/frontend`) implements Phase 1 with API integration layer before UI implementation. Tests validate architecture before feature completion. Google OAuth config finalized across full stack.

**Commits:** 31 | **Contributors:** 4/4

---

## Feature Burndown

| Feature Area | Backend | Frontend | Integration | Overall | Target Week | Status |
|---|---|---|---|---|---|---|
| **Docker / Infrastructure** | 100% | 100% | 100% | **100%** | Week 1 | ✅ Done |
| **Standard User Auth (JWT, email, 2FA)** | 100% | 80% | 70% | **83%** | Week 2 | 🔄 In Progress |
| **OAuth 2.0 (Google)** | 100% | 50% | 30% | **60%** | Week 2 | 🔄 In Progress |
| **ORM (TypeORM)** | 100% | — | 100% | **100%** | Week 1 | ✅ Done |
| **Frontend Framework (Vue 3)** | — | 95% | — | **95%** | Week 3 | 🔄 In Progress |
| **Design System & Tokens** | — | 60% | — | **60%** | Week 5 | 🔄 In Progress |
| **User Profiles & Settings** | 100% | 30% | 20% | **50%** | Week 3 | 🔄 In Progress |
| **Friends / Social System** | 90% | 0% | 0% | **27%** | Week 3 | ⏳ Not Started |
| **Chat System (real-time)** | 80% | 0% | 0% | **24%** | Week 4 | ⏳ Not Started |
| **WebSocket Integration** | 30% | 0% | 0% | **9%** | Week 4 | ⏳ Not Started |
| **Notifications** | 0% | 0% | 0% | **0%** | Week 4 | ⏳ Not Started |
| **Tournament System** | 0% | 0% | 0% | **0%** | Week 3-4 | ⏳ Not Started |
| **Advanced Search** | 0% | 0% | 0% | **0%** | Week 5 | ⏳ Not Started |
| **Internationalization (i18n)** | 10% | 0% | 0% | **3%** | Week 5 | ⏳ Not Started |

**Summary:** 3/13 major features complete | 5/13 in progress | 5/13 not started | **Points earned (estimated): 7 of 20 (35%)**

---

## Blockers & Risks

### Critical (Must resolve Week 4)

| Risk | Impact | Status | Mitigation |
|------|--------|--------|-----------|
| Frontend branch (`simon/frontend`) not merged to main | API layer, tests, theme system, 95% of Week 3 work only on branch | ⚠️ Blocker | Create PR before Week 4; merge to unblock social/chat features |
| Friends and Chat modules not wired in backend | 6 friend endpoints + 8 chat endpoints inaccessible | ✅ Resolved (Feb 4) | Modules imported in app.module.ts on simon/frontend branch |
| Tournament module not started | Major deliverable (2 points) with zero progress; was Week 3 goal | ⚠️ Behind | Begin tournament entity + CRUD endpoints in Week 4 |

### Moderate (Plan mitigation in Weeks 4-5)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Friends UI not implemented | Social system 0% integrated frontend | Build friends list, requests, block UI in Week 4 |
| Chat UI not implemented | Real-time messaging 0% integrated frontend | Build chat room selector, message display, input in Week 4 |
| WebSocket security wide open (CORS: *) | Would fail security review | Restrict to frontend URL before final submission |
| 2FA flow missing frontend | Backend done, but UI flow not connected | Add 2FA form + verification UI (low effort) |
| No notification system | Required module (1 point), 0% progress | Implement lightweight toast notifications + WS integration in Week 4 |

### Low (Buffer for Week 6)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| No E2E tests | May miss integration failures | Add Playwright smoke tests in Week 5-6 |
| Design system incomplete | Visual inconsistency | Focus on core components (buttons, inputs, cards, modals) in Week 5 |
| User endpoints lack auth guards | Some endpoints exposed without JWT check | Audit endpoints Week 4; add JwtAuthGuard where missing |

---

## Team

| Member | Role(s) | Week 1-3 Focus |
|--------|---------|---|
| **Louis Watelle** | Backend Developer | Authentication (JWT, refresh, 2FA, email verification, OAuth) |
| **Nicolas Orban Wirocco** | Backend Developer | Database (TypeORM), User management, Friends, Chat modules |
| **Ahmet Tamer** | DevOps / Backend Lead | Docker/Nginx setup, testing, frontend OAuth integration |
| **Simon Langerock** | Frontend Developer / Project Manager | Vue architecture, API layer, testing, design system, documentation |

**Communication:** WhatsApp
**Meetings:** Every Friday at 14:00 CET (in person)
**Branch Strategy:** Feature branches → pull request → main

---

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development without Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/Wicoro/42-Transcendence.git
cd 42-Transcendence

# Initialize environment
make setup
# or manually: cp .env.example .env

# Start all services
make up

# View logs
docker-compose logs -f
```

### Access

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | https://localhost:8443 | (User signup) |
| Backend API | https://localhost:8443/api/ | JWT in Authorization header |
| pgAdmin | https://localhost:5050 | admin@admin.com / admin |

### Development Commands

**Docker:**
```bash
make up           # Start services
make re           # Restart services
make down         # Stop services
make fclean       # Remove containers + volumes
make fcleanall    # Above + remove images
```

**Backend (in /backend):**
```bash
npm run start:dev    # Dev server with hot reload
npm run build        # Production build
npm test             # Run tests
```

**Frontend (in /frontend):**
```bash
npm run dev      # Dev server with hot reload
npm run build    # Production build
npx vitest run   # Run tests
```

---

## Documentation

- **`/docs/backend_architecture.md`** - Complete API endpoints, modules, entities, flows
- **`/docs/TYPE_SYSTEM_GUIDE.md`** - Type conventions and patterns
- **`/frontend/docs/`** - Frontend architecture, modules, components, guides
- **`/.claude/docs/`** - Implementation planning, weekly progress, recommended skills
- **`/.claude/skills/`** - Claude Code development skills (accessibility, responsive design, API integration, etc.)

---

## Resources & AI Disclosure

Simon, for frontend in Vue and for Project Manaaement uses Claude Code (Anthropic's CLI) for development assistance. All contributions are tracked in git history for transparency.


- **Claude Code:** https://claude.com/claude-code
- **42 Transcendence Project:** https://github.com/Wicoro/42-Transcendence

---

**Last Updated:** Friday, February 6, 2026 (End of Week 3)
