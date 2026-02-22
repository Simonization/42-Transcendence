# Match History — Backend Handoff

## Status
Frontend is wired to real endpoints (`GET /matches/my-history`, etc.) but the backend needs 2 fixes before it works end-to-end.

## What the backend team needs to do

### 1. Fix `GetPlayerHistoryQuery` to include opponent usernames

**File:** `/backend/src/modules/matches/queries/get-player-history.query.ts`

`GET /matches/my-history` currently filters `userMatches` to only the requesting user (`um.user_id = :userId`). The frontend needs **ALL** participants with their `user` relation loaded (like `GetMatchDetailsQuery` already does with `relations: ['userMatches', 'userMatches.user']`).

Expected response shape per match:
```json
{
  "id": 1,
  "game_type": 1,
  "created_at": "2026-02-07T10:00:00.000Z",
  "userMatches": [
    { "userId": 42, "result": "WIN", "user": { "id": 42, "username": "simon" } },
    { "userId": 17, "result": "LOSS", "user": { "id": 17, "username": "opponent" } }
  ],
  "details": { }
}
```

### 2. Fix route ordering in `matches.controller.ts`

**File:** `/backend/src/modules/matches/matches.controller.ts`

`@Get('my-history')` (line ~55) is defined AFTER `@Get(':id')` (line ~37). NestJS matches routes top-to-bottom, so `my-history` gets caught by the `:id` param and fails with `ParseIntPipe`.

**Fix:** Move `@Get('my-history')` ABOVE `@Get(':id')`.

---

## Frontend files involved

| File | Role |
|------|------|
| `frontend/src/types/match.ts` | Backend + frontend type definitions |
| `frontend/src/api/matches.ts` | API calls + `transformMatch()` + `computeStats()` |
| `frontend/src/composables/useMatches.ts` | Reactive state wrapper |
| `frontend/src/pages/menu/MatchHistoryCard.vue` | UI (loading/error/table) |
| `frontend/src/api/__tests__/matches.spec.ts` | API + transform tests (16) |
| `frontend/src/composables/__tests__/useMatches.spec.ts` | Composable tests (8) |

## How to verify once backend is updated

1. Run `cd frontend && npx vitest run` — all match tests should still pass
2. Navigate to `/menu/history` — should show loading spinner, then real data or "No matches found"
3. If backend has seeded match data, verify opponent names appear correctly

## Game type mapping

| `game_type` (backend) | Display name (frontend) |
|------------------------|------------------------|
| 1 | Chess |
| 2 | League of Legends |
| other | Unknown |

## What was removed from UI

- **Rating column** — backend has no rating system
- **Rating change column** — same reason
- **Duration column** — backend doesn't track match duration
- **"Rating" sort option** — only "Date" and "Result" remain

`mockMatchHistory.ts` is kept for now (tournament components may reference it) but `MatchHistoryCard.vue` no longer uses it.
