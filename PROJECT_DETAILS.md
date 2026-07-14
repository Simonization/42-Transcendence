# esportendence — Project Details

Companion document to [`README.md`](./README.md). Contains project management approach, full module breakdown, database schema, and individual contributions — i.e. everything a jury reviewer needs to evaluate the project beyond the quick-start in the main README.

---

## Table of Contents

1. [Project Management Approach](#project-management-approach)
2. [Technology Justifications](#technology-justifications)
3. [Modules & Point Calculation (23 pts)](#modules--point-calculation-23-pts)
4. [Database Schema](#database-schema)
5. [Features & Individual Contributions](#features--individual-contributions)

---

## Project Management Approach

Work was organised with a lightweight trunk-based workflow:

- **Main branches:** `main` for backend consolidation, `simon/frontend` (later `BEFORE_PUSH`) for frontend work.
- **Feature branches per module** — e.g. `notifications_impl`, `chat_friend`, `TEST_FRONTEND_BACKEND` — merged back into `main` after peer review.
- **Integration cuts** when the frontend/backend contract stabilised. Example: the Feb 28 `TEST_FRONTEND_BACKEND` merge smoke-tested the full stack end-to-end before the jury cutoff.
- **Coordination channels:** GitHub issues and pull requests for cross-team blockers, Discord for synchronous discussion, `Corrector.md` as the shared module-completion scoreboard.
- **Quality gates:**
  - Vitest on the frontend (701 tests covering composables, stores, components).
  - NestJS e2e + unit tests on the backend.
  - Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) enforced on every DTO.
  - TypeScript strict mode in both frontend and backend.

Ownership was split by module rather than by layer, so each member had end-to-end responsibility for a clearly-scoped slice of the product (see [Individual Contributions](#features--individual-contributions) below).

---

## Technology Justifications

| Layer | Technology | Why we chose it |
|-------|------------|-----------------|
| Frontend | Vue 3 + Vite + TypeScript (Composition API) | Reactive SPA with strict typing; Vite for fast dev/HMR; Composition API for reusable composables |
| State | Pinia | Official Vue state library; simpler than Vuex, full TS support |
| Styling | Custom design-token CSS system (388-line `tokens.css`) | Theme-agnostic tokens let us ship two live-switchable themes (dragon, stellar) without rewrites |
| Backend | NestJS + TypeORM | Opinionated modular architecture, dependency injection, class-validator for DTO safety |
| Database | PostgreSQL 15 | Strong relational guarantees for the social + tournament graph |
| Auth | JWT + Passport + Google OAuth 2.0 + email 2FA | Stateless API via JWT, rotating refresh tokens, OAuth for convenience, 2FA for account safety |
| Real-time | Socket.io WebSockets | Chat, typing, read receipts, friend activity, notifications |
| i18n | vue-i18n (EN / FR / TR) | Three-language coverage with ~680 lines per locale |
| Containers | Docker Compose + nginx | Single-command startup; nginx terminates HTTPS with self-signed certs |

---

## Modules & Point Calculation (23 pts)

Target: **14 points minimum**. Achieved: **23 points** (9-point buffer). Full justification also in `Corrector.md`.

### Web (10 pts)

| # | Module | Type | Pts | Justification |
|---|--------|------|-----|---------------|
| 1 | Frontend + Backend frameworks (Vue 3 + NestJS) | Major | 2 | Modern reactive SPA + opinionated API framework, both in TypeScript |
| 2 | Real-time features (Socket.io WebSockets) | Major | 2 | Chat, typing indicators, read receipts, notifications, friend activity broadcasts |
| 3 | User interaction (chat + profiles + friends) | Major | 2 | Full social layer: DM + group chat, user profiles with bio/avatar, add/remove/block friends |
| 4 | ORM (TypeORM + PostgreSQL) | Minor | 1 | 21 entities, typed relations, migrations, relational constraints |
| 5 | Notification system (toast + bell + feed) | Minor | 1 | Real-time push via socket, persisted in DB, i18n for 25+ notification types |
| 6 | Custom design system (46 reusable components) | Minor | 1 | Components across 10 subdirs, built on `tokens.css` |
| 7 | Advanced search (filters, sorting, pagination) | Minor | 1 | Server-side paginated search across users / tournaments / rooms |

### User Management (6 pts)

| # | Module | Type | Pts | Justification |
|---|--------|------|-----|---------------|
| 8 | Standard user auth & management | Major | 2 | Register, login, profile, settings, account deletion, password change |
| 9 | Advanced permissions (RBAC) | Major | 2 | User / moderator / admin roles, route guards, permission-aware UI |
| 10 | OAuth 2.0 (Google) | Minor | 1 | Passport Google strategy, callback flow, account linking |
| 11 | 2FA (email-based) | Minor | 1 | 6-digit code, rate-limited, enforced on login |

### Accessibility & i18n (2 pts)

| # | Module | Type | Pts | Justification |
|---|--------|------|-----|---------------|
| 12 | i18n (EN / FR / TR) | Minor | 1 | `vue-i18n`, ~680 lines per locale file, full UI coverage |
| 13 | Additional browser support | Minor | 1 | Tested and rendering correctly on Firefox and Safari in addition to Chrome |

### Gaming & UX (1 pt)

| # | Module | Type | Pts | Justification |
|---|--------|------|-----|---------------|
| 14 | Advanced chat (block, typing, read receipts, history) | Minor | 1 | Socket events + UI for typing indicators, read receipts, user blocking, persistent history |

### Free Modules / Modules of Choice (2 pts)

As an esports *companion* platform (not a game itself), we integrate with external gaming APIs rather than implementing our own game.

| # | Module | Type | Pts | Justification |
|---|--------|------|-----|---------------|
| 15 | Match history (chess.com API integration) | Minor | 1 | External API proxy with user history display, stats aggregation, data transformation |
| 16 | Tournament tracking system | Minor | 1 | Bracket display, registration flow, phase + team management for external competitions |

### Stretch (2 pts)

| # | Module | Type | Pts | Justification |
|---|--------|------|-----|---------------|
| 17 | Organization / team system | Major | 2 | Create/manage organisations with member hierarchy, team invitations, team ↔ tournament linkage |

### Total

| Category | Points |
|----------|--------|
| Web | 10 |
| User Management | 6 |
| Accessibility & i18n | 2 |
| Gaming & UX | 1 |
| Free modules | 2 |
| Stretch | 2 |
| **TOTAL** | **23** |

**Buffer over 14-point minimum: 9 points.**

---

## Database Schema

PostgreSQL 15, managed via TypeORM. **21 entities across 9 domains.** Source files: `backend/src/modules/*/entities/*.entity.ts`.

### Users

| Entity | Purpose | Key relations |
|--------|---------|---------------|
| **User** | Core account (`id`, `username`, `mail`, `passwordHash`, `role`, `twoFactorEnabled`, …) | `1:1` UserProfile, UserSettings · `1:N` Friend, Block, RefreshToken, UserGameAccount, Message, Notification · `N:N` Team (via membership) |
| **UserProfile** | Display name, bio, avatar | `1:1` User |
| **UserSettings** | Theme, language, notification prefs | `1:1` User |
| **UserGameAccount** | External API handles (e.g. chess.com username) | `N:1` User |
| **RefreshToken** | Rotating JWT refresh tokens | `N:1` User |

`passwordHash` is stored with TypeORM's `select: false` and hashed with `bcryptjs` (cost 10). It is never selected by default and excluded from all serialised responses.

### Social

| Entity | Purpose | Key relations |
|--------|---------|---------------|
| **Friend** | Friendship edge with status (requested / accepted) | `N:1` User (requester, addressee) |
| **Block** | User-to-user block relation | `N:1` User (blocker, blocked) |
| **Chat** | DM or group chat room | `1:N` ChatParticipant, Message |
| **ChatParticipant** | Membership of a user in a chat | `N:1` Chat, User |
| **Message** | Persisted chat message | `N:1` Chat, sender (User) |
| **Notification** | Per-user notification feed | `N:1` User |

### Competition

| Entity | Purpose | Key relations |
|--------|---------|---------------|
| **Game** | Catalog of playable games referenced by tournaments | `1:N` Tournament |
| **Tournament** | A tournament with configuration and phases | `N:1` Game · `1:N` TournamentPhase, Team |
| **TournamentPhase** | A phase (group → bracket) within a tournament | `N:1` Tournament · `1:N` Match |
| **Team** | A competing team linked to a tournament | `N:1` Tournament · `N:N` User (membership) · `1:N` TeamInvitation, Match |
| **TeamInvitation** | Invitation to join a team | `N:1` Team, inviter (User), invitee (User) |
| **Match** | A scheduled/played match | `N:1` Tournament, TournamentPhase · `N:N` Team (via UserMatch) |
| **UserMatch** | Join table: user's participation and result in a match | `N:1` User, Match |

### Organization

| Entity | Purpose | Key relations |
|--------|---------|---------------|
| **Organization** | Hierarchical user grouping | `1:N` OrgMember |
| **OrgMember** | Membership of a user in an org, with role | `N:1` Organization, User |

### Admin

| Entity | Purpose |
|--------|---------|
| **AdminInvite** | Bootstrap / invite tokens for promoting admins |

---

## Features & Individual Contributions

Ownership is visible via `git log --author="..."`. High-level split by member:

### Louis Watelle — Auth, Notifications, Mail

- JWT access + refresh token rotation, logout, session invalidation
- Google OAuth 2.0 (Passport strategy, callback flow)
- 2FA via email (6-digit code, rate limiting, enforcement on login)
- Notification backend — persistence + real-time socket push
- Transactional email (registration verification, 2FA codes)
- i18n keys for 25+ notification types across EN / FR / TR

### Nicolas Orban Wirocco — Core Backend Domain

- User module (profile, settings, game accounts, account deletion)
- Friends + blocks (REST endpoints, JWT-guarded)
- Chat REST endpoints (rooms, messages, pagination, mark-as-read)
- Games catalog + Tournaments module (create, phases, brackets)
- Matches, Teams, Team invitations
- Organizations module
- Advanced search endpoints with filters / sort / pagination

### Ahmet Tamer — DevOps + Real-time

- Docker Compose topology (nginx, backend, frontend, Postgres, pgAdmin)
- nginx reverse proxy with self-signed HTTPS (TLS 1.2 / 1.3) and HTTP→HTTPS redirect
- `chat.gateway.ts` — Socket.io gateway (`joinRoom`, `sendMessage`, `typing`, `markRead`)
- Friend activity broadcasts, real-time notification plumbing
- Backend testing harness + CI stabilisation
- Integration branch cuts (`TEST_FRONTEND_BACKEND`, pre-jury merges)

### Simon Langerock — Frontend

- Vue 3 + Vite + TypeScript scaffolding, Composition API conventions, strict TS
- API layer (`src/api/`) and composables (`src/composables/`) organised per domain
- Pinia stores (auth, chat, friends, notifications, theme)
- Custom design system: `tokens.css` + 46 components across 10 subdirs
- Two live-switchable themes (dragon, stellar)
- i18n integration across all pages (EN / FR / TR)
- All UI pages: Landing, Auth, Menu (User, Friend, Chat, Tournaments, Matches, Organizations, Admin, Profile, Dev)
- Privacy Policy + Terms of Service pages (accessible from landing footer)
- RBAC route guards + permission-aware UI
- 701-test Vitest suite for composables, stores, components
