# esportendence

A tournament organizer for esports competitions, created for 42 Belgium by Ahmet Tamer, Louis Watelle, Nicolas Orban Wirocco, and Simon Langerock.

## Project Overview

**esportendence** is a full-stack web application and esports companion platform. Users can create accounts, manage friendships, chat in real-time, and view match history from external gaming APIs (chess.com, etc.).

- **Project Repository:** https://github.com/Wicoro/42-Transcendence
- **Documentation:** Google Docs specification: https://docs.google.com/document/d/1zdf079lEJqqbx9p4P-mLMo3ZPIluBtxt0sC1ao2E4Ak
- **Task Tracking:** https://docs.google.com/spreadsheets/d/1_n5ql6kverWHChRL5XJNWhIwYxnunGBGKnGAgUoVzfk
- **Project Timeline:** 6 weeks (Jan 19 - Mar 1, 2026)
- **Status:** Start of Week 4 (Friday, Feb 7)

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

Docker infrastructure (5 containers: nginx, backend, frontend, db, pgadmin), NestJS + Vue 3 scaffolds, TypeORM entities, JWT auth with refresh tokens, Friends module backend. **Key decision:** Django → NestJS for TypeScript consistency. 18 commits, 3/4 contributors.

### Week 2 (Jan 26 - Feb 1): Core Auth ✅

Complete auth flow (registration, email verify, 2FA, login/logout), Google OAuth backend + frontend, chat module backend, user profile endpoints. **Key decision:** Riot OAuth → Google OAuth (Riot requires App Store approval); email-based 2FA for MVP. 22 commits, 4/4 contributors.

### Week 3 (Feb 2-8): Frontend Architecture ✅

Full frontend foundation — typed API service layer with auto-refresh, Vue Router (auth + nested menu routes), 115 unit tests (Vitest + Vue Test Utils), dual-theme system (Stellar/Dragon), design tokens, core UI components, auth pages. **Key decision:** API-first architecture on feature branch. 28 commits, 2/4 contributors.

### Week 4 (Feb 9-15): Real-time + Social UI

Merge frontend branch to main. Friends UI (list, requests, blocked tabs). Chat UI with WebSocket integration. Notification toast system. Match history API (chess.com). Advanced permissions (RBAC: admin/user/moderator roles).

### Week 5 (Feb 16-22): Polish + Modules

Advanced chat features (block, invite, typing indicators, chat history). Custom design system (10+ reusable components). i18n (English, French, Turkish). Advanced search with filters/sorting/pagination.

### Week 6 (Feb 23 - Mar 1): Hardening

Cross-browser testing (Firefox, Safari/Edge). Bug fixes and security hardening (WebSocket CORS). Documentation cleanup. Evaluation dry-runs. Stretch: Organization system.

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

**Last Updated:** Friday, February 7, 2026 (Start of Week 4)
