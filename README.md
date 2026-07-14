# esportendence

An esports companion platform for 42 Belgium, by Ahmet Tamer, Louis Watelle, Nicolas Orban Wirocco, and Simon Langerock.

## Overview

**esportendence** is a full-stack web application where users create accounts, manage friendships, chat in real-time, view match history from external gaming APIs, organize tournaments, and manage teams and organizations.

- **Repository:** https://github.com/Wicoro/42-Transcendence
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
git clone https://github.com/Wicoro/42-Transcendence.git
cd 42-Transcendence
make setup    # or: cp .env.example .env
make up       # start all services
```

### Access

| Service | URL |
|---------|-----|
| Frontend | https://localhost:8443 |
| Backend API | https://localhost:8443/api/ |
| pgAdmin | https://localhost:5050 |

### Dev Commands

```bash
# Docker
make up / make re / make down / make fclean

# Backend (in /backend)
npm run start:dev          # dev server
npm test                   # tests

# Frontend (in /frontend)
npm run dev                # dev server
npx vitest run             # tests
```

## Documentation

- **[`PROJECT_DETAILS.md`](./PROJECT_DETAILS.md)** — Project management, modules, DB schema, individual contributions (jury reference)
- **`Corrector.md`** — Module scoring reference (23 points)
- **`frontend/FRONTEND_DOC.md`** — Frontend API contract & integration guide
- **`docs/backend_architecture.md`** — Backend API endpoints & architecture

## AI Disclosure

Simon uses Claude Code (Anthropic's CLI) for frontend development assistance. All contributions tracked in git history.
