# Team rules around registration

How teams behave around the registration deadline and the start. The code is the reference;
this page says what it enforces and why.

Terms: *team size* is phase 1's game `teamSize` (the starters); a roster may carry up to two
substitutes on top (`backend/src/modules/teams/utils/roster.ts`). *Registration open* means
the tournament is `REGISTRATION_OPEN` and `registration_closes_at` (if set) has not passed
(`tournaments/services/registration-window.ts`; closing is lazy, nothing flips a status).

## Names

A team name is unique within its tournament, compared case-insensitively and without the
surrounding spaces ("Reds" and " reds " clash). Names are stored trimmed, at least 3 characters.
Create and rename answer `409` with `error: "TEAM_NAME_TAKEN"`, which the SPA shows as
`teams.nameTaken`. The partial unique index `UQ_teams_tournament_name` on
`("tournamentId", lower(btrim("name")))` makes this hold under concurrent requests too
(migration `TeamNameUnique`, see `migrations.md`).

## Who can join, and until when

Every way onto a roster stops when registration closes, with the same
`400 "Tournament is not open for registration"`:

| Path | Command |
|---|---|
| Captain / admin invites | `InvitePlayerCommand` |
| Invited user accepts | `AcceptInvitationCommand` |
| User asks to join | `CreateJoinRequestCommand` |
| Captain / admin accepts a request | `AcceptJoinRequestCommand` |
| Join link / code | `JoinByCodeCommand` (`/join/<code>` preview reports `registration_closed`) |

Lock and unlock close at the same moment (`LockTeamCommand`, `UnlockTeamCommand`). After the
deadline the team page shows no invite panel, invite link or request "accept", and says why
(`teams.rosterClosedHint`).

## Leaving a LOCKED team

The problem this rule solves: a LOCKED team whose member left after the deadline used to go
back to DRAFT, and since lock is closed after the deadline it could never be locked again; it
silently dropped out of the bracket at start.

`LeaveTeamCommand`, the same rule account deletion already used (`DeleteUserCommand`):

| When | Roster after leaving | Result |
|---|---|---|
| Registration open | still >= team size (a substitute left) | allowed, team stays LOCKED, check-in kept |
| Registration open | below team size | allowed, team back to DRAFT, check-in cleared; the captain refills and locks again |
| Deadline passed, not started | still >= team size | allowed, team stays LOCKED, check-in kept |
| Deadline passed, not started | below team size | **refused**, `403` `error: "LEAVE_LOCKED_AFTER_DEADLINE"` (`teams.leaveLockedAfterDeadline`); the team stays LOCKED |
| Tournament started | any | refused (`403`), as before |

Why refuse rather than keep the team LOCKED but short: a LOCKED team below its size would be
seeded into the bracket unable to field a lineup, and nothing else in the app knows a "short"
state. Refusing keeps the invariant every other check relies on (LOCKED means a valid roster)
and matches what is already frozen after the deadline (lock, unlock, kick, invites). A player
who really cannot play talks to the organiser, who can move `registration_closes_at` later to
reopen registration: the captain can then refill and re-lock.

The SPA hides "Leave team" in the refused case and shows the reason instead; a substitute's
confirmation says the team stays registered.

The kick command is unaffected (a LOCKED team cannot kick at all).

### Account deletion is the one exception

Deleting an account cannot be refused. A member of a LOCKED team who deletes their account
before the start is removed; if the team drops below its size it goes back to DRAFT
(`account-deletion.db-spec.ts`). After the deadline that team can only come back if the
organiser reopens registration by moving the deadline. Once the tournament started, the
deleted member stays on the roster as "Deleted user" and the team keeps its bracket place.

Row locks: leave locks the tournament row, then the team row, like lock-team and the bracket
engine.

Tests: `backend/src/modules/teams/team-registration-edges.db-spec.ts` (real Postgres,
`npm run test:db`).
