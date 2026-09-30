# Corrector Guide — esportendence

## Scoring Overview
- **Required:** 14 points minimum
- **Major modules:** 2 points each
- **Minor modules:** 1 point each
- **Our target:** 23 points (9-point buffer)

---

## Listed Modules (from subject.pdf categories)

### Web (10 points)

| # | Module | Type | Pts | Status |
|---|--------|------|-----|--------|
| 1 | Frontend + Backend frameworks (Vue 3 + NestJS) | Major | 2 | ✅ Done |
| 2 | Real-time features (Socket.io WebSockets) | Major | 2 | ✅ Done |
| 3 | User interaction (chat + profiles + friends) | Major | 2 | ✅ Done |
| 4 | ORM (TypeORM + PostgreSQL) | Minor | 1 | ✅ Done |
| 5 | Notification system (persisted, per-user: bell panel + toast pop-ups, unread count, mark-read/-all, optional bot-chat delivery) | Minor | 1 | ✅ Done |
| 6 | Custom design system (19+ reusable components) | Minor | 1 | ✅ Done |
| 7 | Advanced search (filters, sorting, pagination) | Minor | 1 | ✅ Done |

### User Management (6 points)

| # | Module | Type | Pts | Status |
|---|--------|------|-----|--------|
| 8 | Standard user auth & management | Major | 2 | ✅ Done |
| 9 | Advanced permissions (RBAC: admin/user/moderator) | Major | 2 | ✅ Done |
| 10 | OAuth 2.0 (Google) | Minor | 1 | ✅ Done |
| 11 | 2FA (email-based) | Minor | 1 | ✅ Done |

### Accessibility & Internationalization (2 points)

| # | Module | Type | Pts | Status |
|---|--------|------|-----|--------|
| 12 | i18n (English, French, Turkish) | Minor | 1 | ✅ Done |
| 13 | Additional browser support (Firefox + Safari) | Minor | 1 | ✅ Done |

### Gaming & User Experience (1 point)

| # | Module | Type | Pts | Status |
|---|--------|------|-----|--------|
| 14 | Advanced chat features (block, typing indicators, persisted history; "invite" is a plain-text message with a game icon, not a real invite/accept flow) | Minor | 1 | ✅ Done |

**Listed subtotal: 19 points**

---

## Free Modules (Modules of Choice)

These are custom modules not in the subject's predefined list. As an esports
*companion* platform (not a game itself), we integrate with external gaming
APIs rather than implementing our own game.

| # | Module | Type | Pts | Status | Justification |
|---|--------|------|-----|--------|---------------|
| 15 | Match history (own in-platform tournament matches) | Minor | 1 | ✅ Done | Per-user history of matches played inside this platform's own tournaments — opponent, game, result, date, win/loss stats. There is no external gaming API (e.g. chess.com); "game" is the admin-configured game record (`games` module), not a third-party integration. |
| 16 | Tournament tracking system | Minor | 1 | ✅ Done | In-platform tournaments: admins create a tournament and its games, teams register, an admin starts it to generate the first phase's bracket, and results/standings are tracked as matches are recorded. Brackets and standings are for tournaments run *on* this platform, not external competitions. |

**Free subtotal: 2 points**

---

## Stretch Module

| # | Module | Type | Pts | Status | Justification |
|---|--------|------|-----|--------|---------------|
| 17 | Organization/team system | Major | 2 | ✅ Done | Create, manage, add/remove members, team invitations, organization hierarchy. |

---

## Points Summary

| Category | Points |
|----------|--------|
| Web (listed) | 10 |
| User Management (listed) | 6 |
| Accessibility (listed) | 2 |
| Gaming & UX (listed) | 1 |
| Free modules | 2 |
| Stretch (Organization) | 2 |
| **TOTAL** | **23** |

**Buffer over 14-point minimum: 9 points**
