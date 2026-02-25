# Sprint Plan — Final Week (Feb 25–28, 2026)

## Updated: Feb 25 (consolidated + reconciled across all memory files)

---

## Score: 23 / 14 required (9pt buffer) — All 15 modules DONE

| Module | Pts | Status |
|--------|-----|--------|
| Vue 3 + NestJS | 2 | ✅ Done |
| Socket.io WebSockets | 2 | ✅ Done |
| Chat + Profiles + Friends | 2 | ✅ Done |
| ORM (TypeORM + PostgreSQL) | 1 | ✅ Done (BE) |
| Notification toast system | 1 | ✅ Done |
| Custom design system (19+ components) | 1 | ✅ Done |
| Advanced search (filters, sort, pagination) | 1 | ✅ Done |
| Standard auth (+ Google OAuth + 2FA) | 4 | ✅ Done |
| Advanced permissions (RBAC) | 2 | ✅ Done |
| i18n (EN/FR/TR) | 1 | ✅ Done |
| Browser support (Firefox + Safari) | 1 | ✅ Done |
| Advanced chat features (block, typing, receipts) | 1 | ✅ Done |
| Match history (chess.com API) | 1 | ✅ Done |
| Tournament tracking (8 components) | 1 | ✅ Done |
| Organization/team system | 2 | ✅ Done |

---

## Frontend UX Gaps — ALL RESOLVED ✅

These were ❌ in the previous plan and are now confirmed committed (`613b17b`):
- ✅ FriendList "Chat" button — navigates to `/menu/chat?openWith=<id>`
- ✅ SearchModal user results clickable — emits `selectUser`, MenuLayout handles it
- ✅ New chat form uses username search typeahead (not raw numeric ID)

---

## CRITICAL — Must work for demo (Feb 28)

| # | Task | Owner | Status |
|---|------|-------|--------|
| C1 | **Backend modules registered**: `TeamsModule` + `TournamentsModule` in `app.module.ts` | Nicolas | BLOCKED — teams/tournament endpoints 404 without this |
| C2 | **Docker `make up` works on merged main** | Ahmet | BLOCKED — corrector runs Docker first |
| C3 | **Merge pipeline**: `test_merge_perm_+_front` → `main` once C1 is fixed | Louis | BLOCKED on C1 |
| C4 | **Cross-browser smoke test** (Chrome + Firefox + Safari) on all 7 flows | All | Feb 28 at school |

### Feb 28 Test Flows (priority order)
1. Auth: register, login, 2FA, Google OAuth
2. Chat: DM, typing indicator, block, read receipts
3. Friends: add, accept, message via "Chat" button
4. Search: find users, find tournaments, filter/sort/pagination
5. Admin: manage users, RBAC, invite admin
6. Tournament: create game, create tournament, register, bracket *(depends on C1)*
7. Organizations: create org, invite members, manage *(depends on C1)*

---

## IMPORTANT — High visibility, Simon owns

| # | Task | Owner | Status |
|---|------|-------|--------|
| I1 | **Run `vue-tsc --noEmit`** — fix any type errors before demo | Simon | TODO |
| I2 | **Run full test suite** (`cd frontend && npx vitest run`) — confirm ~705 tests green | Simon | TODO |
| I3 | **Backend workaround cleanup**: Remove `role`/`status`/`avatarUrl` patch in `backend/src/modules/users/users.service.ts` lines 34–43 once Louis merges | Simon | WAITING on Louis |

---

## NICE-TO-HAVE — Only if time permits

| # | Task | Owner | Status |
|---|------|-------|--------|
| N1 | Match auto-generation (backend) | Nicolas | Low |
| N2 | Tournament status transitions (backend) | Nicolas | Low |
| N3 | Match-Team entity relation bug | Nicolas | Low |
| N4 | Polish: loading states, error boundaries, empty states | Simon | Low |

---

## Daily Plan

### Tue Feb 25 (today)
- [ ] I1: Run `vue-tsc --noEmit`, fix any errors
- [ ] I2: Run full Vitest suite, confirm still green
- [ ] Ping Nicolas re: C1 (TeamsModule + TournamentsModule in app.module.ts)
- [ ] Ping Ahmet re: C2 (Docker test on merged main)

### Wed Feb 26
- [ ] Fix anything found in type check / tests
- [ ] If C1 lands: test tournament + team flows end-to-end
- [ ] If Louis merges: remove backend workaround (I3), then run tests again

### Thu Feb 27
- [ ] Final merge to main (C3)
- [ ] Docker `make up` test (C2)
- [ ] Full flow walkthrough locally on Chrome

### Sat Feb 28 — Testing Day at 42 Brussels
- [ ] Cross-browser test all 7 flows (C4)
- [ ] Bug fixes on the spot
- [ ] Final push

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Nicolas doesn't fix C1 by Thu | Tournament + Team demos fail — 3pts at risk, still 20pts > 14 minimum | Demo other 12 modules; frontend shows graceful error states |
| Docker broken on merged main | Corrector can't start the app | Test early Wed, have manual startup instructions ready |
| Safari CSS bugs found Sat | Browser support module fails (1pt) | Test Safari on Wed if possible |
