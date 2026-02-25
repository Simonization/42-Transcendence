# Briefing D — Backend Blockers & What They Unlock

## Status as of Feb 25 (evening) — UPDATED

**Big news:** Louis created `test_merge_perm_+_front` — a test merge of `permissions` + `simon/frontend` + `backend_nico`. This is the closest thing to a "working" combined branch. Key finding: `/users/me` now returns `role` and `status` correctly (Blocker L2 resolved on that branch).

---

## Nicolas — Backend (tournaments, teams, games, matches)

### Blocker N1: TeamsModule not imported in `app.module.ts` ❌ STILL OPEN
**What's wrong:** Nicolas built the entire Teams module but forgot to add `TeamsModule` to the imports in `app.module.ts`. All `/teams` endpoints return 404.
**Status:** Still missing even in `test_merge_perm_+_front`.
**Fix:** 2 lines:
```typescript
import { TeamsModule } from './modules/teams/teams.module';
// + TeamsModule in the imports array
```
**Unlocks:** Tournament registration, team invitations, participants tab.

### Blocker N2: TournamentsModule not imported in `app.module.ts` ❌ STILL OPEN
**What's wrong:** Same as N1 — `TournamentsModule` not in imports. Only `GamesModule` is imported.
**Status:** Still missing in `test_merge_perm_+_front`.
**Fix:** 2 lines. Same pattern.
**Unlocks:** Tournament list, tournament detail, admin tournament creation.

### Blocker N3: No match auto-generation ❌ STILL OPEN
Bracket creation doesn't happen when tournament starts. Matches table stays empty.
**Unlocks:** Bracket visualization with real data.

### Blocker N4: No tournament status transitions ❌ STILL OPEN
No endpoint to move REGISTRATION_OPEN → ONGOING → COMPLETED.
**Unlocks:** Tournament lifecycle demo.

### Blocker N5: Match-Team entity bug ❌ STILL OPEN
`Match.teams` references `team.match` but Team entity has no `match` relation. Queries crash.

### Blocker N6: `backend_nico` not merged to `main` ⚠️ PARTIALLY
`backend_nico` is merged into `test_merge_perm_+_front`, but NOT into `main`.
The Docker setup uses `main`.

---

## Louis — Backend (auth, permissions, notifications)

### Blocker L1: `permissions` branch not merged to `main` ⚠️ PARTIALLY
**Status:** Louis merged `simon/frontend` + `permissions` + `backend_nico` into `test_merge_perm_+_front` for testing. But `permissions` is not yet merged to `main`.
**Fix:** Merge `test_merge_perm_+_front` → `main` (or do the individual merges: `permissions` → `main` + `backend_nico` → `main`).
**Unlocks:** Admin invite system, RBAC enforcement on backend, role/status in `/users/me`.

### Blocker L2: `/users/me` missing role/status/avatarUrl ✅ RESOLVED on permissions
**Status:** `aa532b6` ("BACKEND: add role and status in GET /users/me") is on the `permissions` branch and in `test_merge_perm_+_front`. `role` and `status` are now returned.
- ⚠️ `avatarUrl` is NOT in Louis's version (only in Simon's temp workaround on `simon/frontend`)
- The temp workaround in `backend/src/modules/users/users.service.ts` has a `// TEMP WORKAROUND` comment — leave it for now, it will be resolved by the merge.
**Action:** When `test_merge_perm_+_front` → `main` lands, verify `/users/me` returns `avatarUrl`. If not, ask Louis to add it.

---

## Ahmet — DevOps/Backend (Docker, WebSocket)

### Blocker A1: `amt` branch is destructive ❌ STILL DANGEROUS
Ahmet's `amt` branch deletes ~20,000 lines of frontend. Do NOT merge into any branch with frontend work. If Ahmet has Docker/Nginx fixes, cherry-pick backend-only files.

### Blocker A2: Docker/Nginx setup not tested ❌ CRITICAL
**Status:** Unknown. `make up` may or may not work on `main`.
**Action: Someone MUST test `make up` before Saturday.** This is the corrector's first move.

---

## The Path to Main — Recommended Merge Order

```
backend_nico  ──┐
permissions  ───┤──► test_merge_perm_+_front ──► main
simon/frontend ─┘
```

`test_merge_perm_+_front` exists and contains all three. The remaining steps:
1. **Nicolas fixes N1 + N2** (TeamsModule + TournamentsModule in app.module.ts)
2. **Louis merges `test_merge_perm_+_front` → `main`**
3. **Ahmet tests `make up`** on the merged main
4. **Simon tests the full flow** end-to-end

---

## Messages to Send Today (Feb 26)

### To Nicolas (CRITICAL):
> "Hey Nicolas, two 2-line fixes needed on backend_nico:
> 1. Add `TeamsModule` to imports in `app.module.ts` (all /teams endpoints 404 otherwise)
> 2. Add `TournamentsModule` to imports too (same issue)
> These are the only things blocking the tournament registration demo.
> Then we need backend_nico → main merged."

### To Louis:
> "Hey Louis, `test_merge_perm_+_front` looks good — great that `/users/me` now returns role+status!
> Two questions:
> 1. Can you merge that branch → main when Nicolas fixes the TeamsModule import?
> 2. Does `avatarUrl` come back from GET /users/me? Our frontend uses it for avatar display."

### To Ahmet:
> "Hey Ahmet, can you test if `make up` works on the current main branch?
> The corrector will run this immediately. We need to know if there are Docker/Nginx issues before Saturday.
> Also please don't merge your `amt` branch — it would overwrite the frontend."
