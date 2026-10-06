# Backlog — esportendence

Written 2026-09-24, after the `finish-and-redesign` branch (12 commits: bug fixes, security
batch, team admin role, live provisional bracket, Fury/HUD redesign) was merged into `main`.
Everything below is **open**. Items are ordered by priority inside each section; file
references point at the code as it stands on `main` after that merge.

Findings marked *(reasoned)* come from reading the code, not from running it; verify them
first.

---

## 0. Finish the deploy — do this first

`main` has the redesign merged, but the public deployment has not been updated yet.

The infra repo's `deploy-transcendence.sh` has been fixed (no longer pushes the whole
Caddyfile, correct `SRC`, backup + one-off schema sync built in). The runbook is kept out of
this public repo, in the gitignored local `CLAUDE.md` next to this file.

The merge changes the schema (new `team_admins` table, the `matches.phaseId` duplicate column
replaced by a real FK on `phase_id`, `messages.isRead` dropped), and production runs without
`synchronize` and without migrations — so the deploy needs a DB backup and a one-off schema
sync. The backend also refuses to start without `JWT_SECRET`.

- [x] Deploy (runbook in local `CLAUDE.md`) — done 2026-09-30
- [x] Fix the deploy script: default `SRC`, and update only this site's Caddy block

## 1. Ops

- [ ] **Login is impossible in production** until SMTP is configured: login requires a
      verified email and verification is email-only.
- [ ] **Google OAuth** needs a client under your own Google Cloud project (the current
      credentials belong to a teammate's).
- [x] **Real TypeORM migrations**, so deploys stop needing a one-off `synchronize`. — see `docs/migrations.md`
- [~] **Database backups** for this app's volume. — script updated 2026-09-30 (infra repo), install on the server pending
- [x] **Committed TLS private key** `nginx/ssl/transcendence.key`. It's the self-signed
      localhost dev cert, but remove it from git and generate it in `make setup`.

## 2. Security & permissions bugs

- [x] **Any logged-in user can create, edit or delete any match, and set any winner.**
      `backend/src/modules/matches/matches.controller.ts` guards only with `JwtAuthGuard`.
      Also `winner_id` is never checked to be one of the match's teams
      (`matches/commands/update-match.command.ts`).
- [x] **Team admin rights survive leaving the team.** `LeaveTeamCommand` and the
      "remove from other teams" branch of `AcceptInvitationCommand` never delete the
      `team_admins` row, and `TeamPermissionsService.isAdmin`
      (`teams/services/team-permissions.service.ts:14`) doesn't check membership. An ex-member
      keeps invite / kick / lock / promote. (Introduced with the admin role.)
- [x] **Accepting an invite pulls you out of a LOCKED team.**
      `teams/commands/accept-invitation.command.ts:62` has no status filter; the locked team
      stays LOCKED while short-handed and still enters the bracket.
- [x] **One user can create several teams in the same tournament.** `create-team.command.ts`
      has no "already in a team here" check.
- [x] **`max_participants` is stored but never enforced** (not on team creation, not on start). — enforced at lock time and at start

## 3. Tournament / bracket engine

- [x] **Byes are clustered at the end → matches with zero teams.**
      `tournaments/services/generators/single-elimination.generator.ts:43` pops teams two at a
      time, so 5 or 6 teams in an 8-slot bracket create a leaf match with no teams that can
      never finish. The frontend preview does the same (`frontend/src/utils/bracket.ts:146`:
      5 teams → `[1v2][3v4][5vBYE][BYEvBYE]`). Fix: standard seeding, byes to the top seeds,
      at most one per match; then **auto-resolve byes** (`MatchStatus.BYE` exists, nothing
      assigns it) so the winner advances at start.
- [x] **Winner propagation drops a team.** `matches/commands/update-match.command.ts:99` —
      `filter(Boolean)` compacts the array, so if the slot-2 feeder finishes before the slot-1
      feeder, the slot-1 winner overwrites index 0 and the slot-2 winner is removed from the
      next match. `match_teams` is ManyToMany with no slot order; store slots explicitly
      (`team1_id` / `team2_id`, or a slot column on the join table). Latent today only
      because no UI reports results.
- [x] **Preview bracket ≠ real bracket.** The preview seeds locked-first by id; the generator
      pops from an unordered relation. Pairings change at start. The preview also shows DRAFT
      teams, which `start()` silently drops — and those teams stay DRAFT forever
      (`TeamStatus.ARCHIVED` is never set anywhere). Share one seeding function, or have the
      backend return the seeding.
- [x] **Group stage is not rendered as groups.** Group matches are saved with
      `round_order: 1`, and `bracket.ts` groups by `round_order`, so they merge with knockout
      round 1. No standings table; `calculateGroupStageStandings` has no tiebreaker.
- [x] *(reasoned)* **Deleting a started tournament probably 500s.** `Match.phase` has no
      `onDelete`, phases cascade from the tournament → FK violation.
- [x] `update-match.command.ts`: if `checkAndAdvance` throws after `commitTransaction`, the
      catch calls `rollbackTransaction` on a committed transaction and masks the real error.
- [x] Bracket `completedAt` shows `created_at` — there is no `finished_at` column.

## 4. Frontend & UX

- [x] **No realtime for teams/tournaments.** Captain doesn't see an accepted invite, bracket
      doesn't move, until reload. The socket exists; add a `tournament:<id>` room.
- [x] **No confirm on irreversible actions:** start tournament
      (`components/admin/MyTournamentsTab.vue:195`, also drops DRAFT teams), delete team
      (`pages/menu/TeamSetupCard.vue:520`). `ConfirmDialog` already exists.
- [x] **Player search races.** `TeamSetupCard.vue:159` fires on every keystroke; a slow
      earlier response overwrites a newer one. Debounce + ignore stale responses.
- [x] **13 hard-coded English toasts** (`TeamSetupCard.vue`, `MyTournamentsTab.vue`) plus the
      "← Back" label — weakens the FR/TR i18n module.
- [x] **No 404 route**; `/menu` alone renders an empty layout (add a redirect to `/menu/user`).
- [x] Bracket page shows **"GO TO ADMIN" to everyone**, and with no `:id` it should list
      tournaments to pick from.
- [x] **`DemoBanner` "Demo mode — backend unavailable"** still on 5 pages although demo data was
      removed; it's just an error state now, and doubles the error message. Remove or rename.
- [x] Missing team actions: **rename team, cancel a pending invite, unlock before start,
      transfer captaincy** (captain can currently only delete).
- [x] **Dual chat socket** — `composables/useChat.ts` and `stores/chat.ts` both connect.
      Not user-visible; the one big simplification left.

## 5. Tooling & docs

- [x] **Frontend TypeScript is never type-checked.** No `tsconfig`, no `vue-tsc`, and
      `npm run build` is plain `vite build`. Add `vue-tsc --noEmit` to the build.
- [x] **Backend has one test, and it fails** (the Nest scaffold `app.controller.spec.ts`
      expects "Hello from Backend!"). Replace it with tests for the bracket generator,
      winner propagation and team permissions — where the bugs above live.
- [x] Frontend `predev` runs `npm install` of three fonts on every `npm run dev`; they're
      already dependencies. Drop it.
- [x] `README.md`: `docs/backend_architecture.md` doesn't exist; repo/clone URLs point at the
      school repo `Wicoro/42-Transcendence`; pgAdmin line is dev-only.
- [x] `Corrector.md` overstates modules #5, #14, #15, #16.
- [x] Local dev: Postgres publishes on **5433** (a 42 piscine container holds 5432).

## 6. Features that would make it a real tournament platform

Ranked by value for "make a team, enter a tournament".

1. [x] **Close the match loop.** Captain reports the score → the opposing captain confirms or
   disputes → admin override. Auto-advance, byes resolved, notifications ("your match is
   ready", "confirm the score"). Without this, tournaments can't finish.
   `PATCH /matches/:id` exists with no UI caller.
2. [x] **Team invite link / join code.** One click from Discord instead of username search;
   plus a "looking for team" board / join requests.
3. [x] **Public, shareable bracket page** (no login) with an `og:image` — the thing people
   actually share. Brackets are currently behind auth.
4. [x] **Live brackets and rosters** over the existing socket.
5. [x] **Check-in window** before start (start.gg / Battlefy / Toornament standard). Removes
   no-shows and resolves the DRAFT-team limbo.
6. [x] **Registration deadline + countdown** (`scheduledAt` exists; add a deadline, auto-close).
7. [x] **Admin tools:** drag-to-seed, disqualify / withdraw a team, undo a result.
8. [x] **Per-match chat room** for the two teams, reusing the chat module.
9. [x] **Results & history:** podium page on completion, team profile with past results,
   `ARCHIVED` set on completion, substitutes (bench slot beyond `teamSize`).

## 7. After the QA pass (branch `post-qa-fixes`, 2026-10-06)

Found by a QA review of `main`; fixed on the branch, not merged yet.

- [x] **Bracket races.** Two results confirmed at the same time left the final with both
      teams but `WAITING`, or never closed the phase; a withdrawal racing a result dropped a
      team; undo and a report on the next match could both succeed. Every bracket operation now
      locks the tournament row, then the matches it changes (`bracket-engine.service.ts`).
      `npm run test:db` reproduces each race on real Postgres.
- [x] **og.png could take the app down at boot** (top-level import of the native resvg
      binding). Now loaded lazily (503 if it fails), rendered with `renderAsync`, cached per
      tournament id with a TTL.
- [x] **Opening a join link joined immediately**, silently leaving the user's other DRAFT team
      (captaincy handed on, solo team deleted). `/join/<code>` now previews team, tournament and
      what joining would cost, and joins on click (`POST /teams/join/preview`).
- [x] **Brackets the old engine started (production, `bb033ea`) stall**: first-round matches
      with one team or none, never settled. `LegacyBracketRepair` migration (byes resolved,
      empty leaves cancelled, seed order backfilled) — see `docs/migrations.md`.
- [x] **`DELETE /users/:id` returned 500 for everyone.** Accounts are now anonymised
      (tombstone, `users.deleted_at`): personal data erased, messages and match history kept and
      shown as "Deleted user", captaincy handed on, account locked out everywhere.
- [x] Rate limit on the anonymous `/public` and `/share` routes (`@nestjs/throttler`, per IP;
      `TRUST_PROXY`, see `.env.example`).
- [x] DRAFT tournaments hidden from the open `/tournaments` read routes for non-admins.
- [x] Row locks on lock-team (tournament) and on join / accept (team): roster and
      `max_participants` can no longer be exceeded by concurrent requests.
- [x] Deleting a team is refused once its tournament left registration or it has matches.
- [x] "Registered n/max" and "spots left" count the same teams.
- [x] Missing i18n keys `common.create`, `friends.invalidUserId`, `friends.updating`.

Still open from that pass:

- [ ] **First deploy of this branch runs three migrations** (`TournamentFlowWaves`,
      `LegacyBracketRepair`, `AccountTombstone`) in one transaction. Take the dump as usual;
      check after boot that old ONGOING brackets show READY matches.
- [ ] **Check `TRUST_PROXY` on the box**: the default trusts loopback / private proxies, which
      fits Caddy → `127.0.0.1:3000`. If every visitor shares one rate-limit bucket, `req.ip`
      is the proxy's; set `TRUST_PROXY` to the hop count.
- [ ] The admin user list (`ManageUsersTab`) shows deleted accounts under their placeholder
      name (`deleted-user-<id>`); the API now sends `isDeleted`, the tab does not use it yet.
- [ ] *(reasoned)* **Google sign-up creates no user**: `AuthService.googleLogin` builds the
      new user from `googleUser.email`, but the strategy sets `mail`. Untouched here.
- [ ] Old group stages where a group got a single team have no match for it, so that team never
      reaches the standings; the legacy repair does not handle it.
- [ ] `npm run test:db` is separate from `npm test` (it needs a free port and ~10 s); run both.
