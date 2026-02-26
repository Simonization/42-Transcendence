# Frontend API Flow Guide

All protected routes require `Authorization: Bearer <token>` header.

---

## 1. Admin — Game Management

Games are the foundation — they must exist before creating tournament phases.

```
POST   /games          { name, teamSize, ... }   → create a game
PATCH  /games/:id      { name, teamSize, ... }   → update a game
DELETE /games/:id                                → delete a game
GET    /games                                    → list all games (for phase creation dropdowns)
```

> `teamSize` on a game is what drives the team lock validation — a team can only lock when `members.length === phase1.game.teamSize`.

---

## 2. Admin — Create Tournament

### Step 1 — Create the tournament with phases in one call
```
POST /tournaments
```
```json
{
  "name": "Summer Cup 2025",
  "description": "Optional",
  "max_participants": 16,
  "phases": [
    {
      "order": 1,
      "type": "GROUP_STAGE",
      "game_id": 3,
      "teams_limit_start": 16,
      "teams_limit_end": 8,
      "group_size": 4,
      "group_winners_count": 2
    },
    {
      "order": 2,
      "type": "SINGLE_ELIMINATION",
      "game_id": 3,
      "teams_limit_start": 8,
      "teams_limit_end": 1
    }
  ]
}
```

**Rules the backend enforces:**
- Phases must start at `order: 1`
- `phase[n].teams_limit_end` must equal `phase[n+1].teams_limit_start` — the chain must be consistent
- `GROUP_STAGE` requires `group_size` and `group_winners_count`
- `SWISS` requires `swiss_rounds`

Response includes the full tournament with phases. Save the `tournament.id`.

---

## 3. Admin — Update Tournament

Only allowed while `status === REGISTRATION_OPEN` for phase changes.

```
PATCH /tournaments/:id
```
```json
{
  "name": "Updated Name",
  "phases": [ ... ]   ← replaces ALL phases if provided
}
```

> Sending `phases` while the tournament is `ONGOING` or `COMPLETED` will throw 400.

---

## 4. Admin — Start Tournament

Transitions `REGISTRATION_OPEN → ONGOING` and generates all bracket/group matches automatically.

```
POST /tournaments/:id/start
```

**Backend checks before starting:**
- Tournament must be `REGISTRATION_OPEN`
- Phase 1 must exist
- Number of `LOCKED` teams must meet `phase1.teams_limit_start`

On success, all Phase 1 matches are created and available via `GET /matches/phase/:phaseId`.

---

## 5. User — Join a Tournament (Team Flow)

### Step 1 — Browse open tournaments
```
GET /tournaments          → list all
GET /tournaments/:id      → full details with phases and teams
```

### Step 2 — Create a team (captain)
```
POST /teams
```
```json
{
  "name": "Team Rocket",
  "tournament_id": 5
}
```
The calling user automatically becomes captain and first member. Team starts in `DRAFT` status.

### Step 3 — Invite players (captain only)
```
PATCH /teams/:id/invite
```
```json
{ "userId": 42 }
```
Creates a pending invitation. The target user will see it in their inbox.

### Step 4 — Invited user checks their invitations
```
GET /teams/invitations/my    → list all pending invitations
```
Response includes `team` and `sender` so the user knows who invited them to what.

### Step 5 — Accept or decline
```
PATCH /teams/invitations/:id/accept
PATCH /teams/invitations/:id/decline
```

### Step 6 — Captain kicks a player if needed
```
PATCH /teams/:id/kick
```
```json
{ "userId": 42 }
```
Cannot kick yourself. Cannot kick from a locked team.

### Step 7 — Captain locks the team
```
PATCH /teams/:id/lock
```
Backend validates `members.length === phase1.game.teamSize`. Throws 400 if the count doesn't match. Once locked, no more invites or kicks.

> The tournament can only start once enough teams are `LOCKED` to fill Phase 1.

---

## 6. User — Match History

```
GET /matches/my-history             → authenticated user's own match history
GET /matches/history/:userId        → any user's match history (no ownership check)
GET /matches/:id                    → full match details
GET /matches/phase/:phaseId         → all matches in a phase (for bracket display)
```

History response shape per match:
```json
{
  "id": 1,
  "status": "FINISHED",
  "score": "...",
  "winner_id": 3,
  "created_at": "...",
  "phase": { "id": 2, "type": "GROUP_STAGE", "tournament": { ... } },
  "teams": [ { "id": 3, "name": "Team Rocket" }, { "id": 7, "name": "Team Aqua" } ],
  "userMatches": [
    { "user_id": 42, "result": "WIN",  "user": { "id": 42, "username": "simon" } },
    { "user_id": 17, "result": "LOSS", "user": { "id": 17, "username": "opponent" } }
  ]
}
```

---

## 7. Status Reference

### Tournament statuses
| Status | Meaning |
|---|---|
| `REGISTRATION_OPEN` | Default. Teams can join, admin can edit phases |
| `ONGOING` | Started. Matches are being played |
| `COMPLETED` | All phases finished |
| `DRAFT` | Not yet open (if manually set) |

### Team statuses
| Status | Meaning |
|---|---|
| `DRAFT` | Still building the roster |
| `LOCKED` | Ready for tournament. No roster changes |
| `ARCHIVED` | Tournament over |

### Match statuses
| Status | Meaning |
|---|---|
| `WAITING` | Created, teams not ready |
| `READY` | Both teams present |
| `ONGOING` | Game in progress |
| `FINISHED` | Result reported by bot |
| `CANCELLED` | Cancelled |
| `BYE` | No opponent (bracket bye) |

### UserMatch results
| Result | Meaning |
|---|---|
| `PENDING` | Match not yet finished |
| `WIN` | Player/team won |
| `LOSS` | Player/team lost |
| `DRAW` | Draw |

---

## 8. Typical Full Flow Timeline

```
Admin                                    User (captain)              User (invitee)
─────                                    ──────────────              ──────────────
POST /games                              
POST /tournaments                        
                                         POST /teams
                                         PATCH /teams/:id/invite  →  GET /teams/invitations/my
                                                                      PATCH /invitations/:id/accept
                                         PATCH /teams/:id/lock
                                         (repeat per team)
POST /tournaments/:id/start
                                                                      GET /matches/phase/:phaseId
                                         [bot reports results]
                                         PATCH /matches/:id  { status: FINISHED, winner_id, score }
                                         (auto-advances phase)
                                                                      GET /matches/my-history
```