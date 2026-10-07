# qa/ — end-to-end QA harness

A local, self-contained test rig that boots the **built** backend (`backend/dist`) and the
**built** SPA (`frontend/dist`) from this checkout against a throwaway embedded Postgres, then
drives them the way users and clients do: ~470 checks over HTTP, Socket.IO and a headless
Chromium. It complements the unit suites (`npm test` in `backend/` and `frontend/`) and
`npm run test:db`: those test pieces, this tests the assembled application, including auth,
migrations, the tournament engine, realtime and the UI.

It touches nothing outside this checkout: no Docker, no real database, no real mail, no network
beyond `localhost`. Every secret in here is a throwaway value for an empty local database
(`config.js`).

## What boots

```
 scripts t01..t14 ──HTTP/WS──>  backend dist (node)  ──>  embedded Postgres (pg.js)
        │                           │      ^                  migrations run on boot (DB_SYNCHRONIZE=false)
        │                           │      └── SMTP ──> smtp.js (sink)  ──>  <work>/mail.log
        └─ browser scripts ─> serve.js (nginx-like proxy) ──> frontend/dist
                                /api/* -> backend (prefix stripped), /socket.io/* -> backend (+ websocket upgrade),
                                everything else -> SPA with index.html fallback
```

- **Embedded Postgres** (`pg.js`) uses the `embedded-postgres` package that `backend/` already
  has as a dev dependency (the same one behind `npm run migration:verify` and `npm run test:db`),
  loaded from `backend/node_modules`. Its data dir lives in `qa/.work/pgdata`. Each run drops and
  recreates the `qa` database, and the backend builds the schema by running the real migrations
  on boot, exactly like production (`DB_SYNCHRONIZE=false`), so every run also exercises the
  migration chain on an empty database.
- **Email verification and 2FA** need mail. The backend is pointed at `smtp.js`, a 40-line SMTP
  sink that accepts anything and appends each message to `qa/.work/mail.log`. `lib.js` then does
  what a user does with their inbox: `newUser()` registers, polls the log for the
  `verify-email?token=...` link, calls it, and logs in; `t01` reads the 6-digit 2FA code out of the
  mail the same way. Nothing is stubbed or bypassed in the backend.
- **The proxy** (`serve.js`) mimics the production reverse proxy so the SPA runs unmodified: same
  origin, `/api` prefix stripped, websocket upgrade for `/socket.io`, SPA fallback for deep links
  such as `/menu/brackets/3` or `/join/<code>`.
- **Admins**: the first admin of each fresh database is created with the bootstrap secret
  (`POST /auth/admin-invites/bootstrap`); later scripts reuse that super admin to mint invites
  (`lib.js: makeAdmin`).

## Prerequisites

- Node.js 20+ (developed on 24), `git` and `tar` only for the migration scenario.
- The app built from this checkout:
  ```bash
  cd backend  && npm ci --legacy-peer-deps && npm run build   # -> backend/dist
  cd frontend && npm ci && npm run build                      # -> frontend/dist (skip for --no-ui)
  ```
- The harness' own two dependencies and the browser (browser scripts only):
  ```bash
  cd qa && npm ci
  npx playwright install chromium     # once; on a bare Linux box also: npx playwright install-deps chromium
  ```
- Free local ports (all overridable, see below): Postgres 55451, SMTP 2525, API 3311, SPA 8088.

`dist/` must be rebuilt after changing product code: the harness runs the build, not the sources.

## Running

```bash
node qa/run.js                 # the whole suite: boots the stack, runs t01..t14, prints one line per script, tears down
node qa/run.js t04             # a single script (prefix match: t04, t04-matchloop; several allowed: t04 t05)
node qa/run.js --no-ui         # everything except the two browser scripts (no frontend build, no Chromium)
node qa/run.js --verbose       # print every check of every script, not only failures
node qa/run.js --keep          # leave the stack running afterwards
node qa/run.js --attach        # boot nothing; use a stack that is already running
node qa/run.js --migration     # the production-upgrade scenario (below)
```

The same from `qa/` with npm: `npm test`, `npm run test:api`, `npm run test:migration`.

Exit code is 0 only when every script ran to its summary line with 0 failed checks. Output of each
script (all checks, with the failing ones marked `FAIL`) is saved in `qa/.work/logs/<script>.log`;
service logs (`postgres`, `smtp`, `backend`, `proxy`) are in the same folder.

To work on one script interactively, keep a stack up in one terminal and run scripts by hand in another:

```bash
node qa/stack.js                # boots Postgres, SMTP sink, backend, proxy; Ctrl-C stops it
node qa/t04-matchloop.js        # any tNN script, directly; prints "  ok ..." / "  FAIL ..." and "N passed, M failed"
```

(`node qa/stack.js --no-ui` skips the proxy.) Scripts create their own users/tournaments with
unique names, so they can be re-run against the same stack. A fresh database is only created when
the stack boots.

Runtime: a full run takes a few minutes on a laptop (see the table below); booting the stack is
about 15 s. The whole suite is serial on purpose: it shares one database and one super admin.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `QA_PG_PORT` | 55451 | embedded Postgres |
| `QA_SMTP_PORT` | 2525 | SMTP sink |
| `QA_API_PORT` | 3311 | backend |
| `QA_UI_PORT` | 8088 | SPA proxy |
| `QA_DB` | `qa` | database name |
| `QA_WORK` | `qa/.work` | generated files (Postgres data, logs, mail log, screenshots, state) |
| `QA_BASE` / `QA_UI` | `http://localhost:<port>` | URLs the scripts use; set them with `--attach` to test another stack |
| `BACKEND_ROOT` | `backend/` | backend checkout whose `dist/` is booted |
| `FRONTEND_ROOT`, `DIST` | `frontend/`, `frontend/dist` | SPA to serve |

Everything else (JWT secret, bootstrap secret, test password) is a fixed throwaway in `config.js`.
Only `qa/.work/`, `node_modules/` and similar generated files are ignored by `qa/.gitignore`.

## What each script covers

| Script | Covers |
|---|---|
| `t01-auth` | register, e-mail verification (token single use, login refused before it), duplicate username/mail, wrong password, login, refresh, `/users/me`, 2FA enable/confirm/login/verify/replay/disable, no secret ever in a response, user search does not expose mail |
| `t02-brackets` | single-elimination tournaments with 3, 5, 6 and 8 teams: seeding, byes resolved at start, played to the end, correct champion (`RANDOM_WIN=1` plays random winners instead of top seed) |
| `t03-groups` | group stage (6 teams, groups of 3) feeding single elimination; a 5-team round robin and its standings |
| `t04-matchloop` | permissions before start (403 for non-admins, 401 anonymous), seeding, report / confirm rules (outsider, plain member, draw, negative score), dispute then admin resolve, undo, history, private fields on matches, deleting a started tournament |
| `t05-teams` | team creation (one per user per tournament), invite / decline / cancel / accept, join codes and join requests, rename / transfer captaincy / team admin / leave, lock / unlock / looking-for-team, accepting an invite leaves DRAFT teams but never a LOCKED one, `max_participants`, registration deadline, check-in |
| `t06-public-realtime-chat` | public share page and `og.png` without login (no e-mails in the JSON), Socket.IO rooms with several clients (live bracket / roster events, who may join which room), per-match chat access control |
| `t07-leak-sweep` | the remaining read endpoints, scanned for other users' private fields |
| `t14-edges` | seeding validation and capacity at start, withdrawal, concurrent confirms, join requests, deleting a team with a pending invite, deleting (anonymising) accounts |
| `t10-ui` | browser: login through the form, every `/menu/*` page renders with no console / page errors and no 4xx/5xx API calls, 404 and `/menu` redirects, `/join/<code>` joins in the UI, admin pages, a second browser sees a reported score live (socket refetch), public `/t/<id>` page, anonymous redirect to `/auth`. Screenshots go to `qa/.work/shots/` |
| `t13-ui-matchloop` | browser: admin starts a tournament from the admin UI (confirm dialog lists the team that will be dropped), captain reports a score by clicking, opposing captain sees CONFIRM live and confirms, the tournament completes with a podium, match chat opens from the bracket; plain members get no REPORT button |

Not part of the default run:

| Script | What |
|---|---|
| `migration/run.js` (`--migration`) | the **production upgrade**: see below |
| `tools/i18n-console.js <url>`, `tools/i18n-probe.js <url>` | debugging probes for the SPA's i18n (why a label renders as a raw key); not tests |

### The production-upgrade scenario (`--migration`)

Answers "if we deploy now, does the real database survive?". `migration/run.js`:

1. builds the **old** backend from git ref `OLD_REF` (default `bb033ea`, the last release without
   migrations) into `qa/.work/old` with `git archive` + `npm ci` + `npm run build`, once; or uses
   `OLD_BACKEND_ROOT` if you already have a built checkout of it;
2. creates database `qa_prod` with only the `Baseline` migration (the schema production had);
3. boots the old backend on it and runs `migration/t08-seed-prod.js`, which fills it through its
   own API: a started single-elimination bracket with five teams (the old engine's broken byes),
   a started group stage, an open registration with a locked team, a team admin, a pending and a
   declined invitation, friends and a direct message;
4. stops it, copies the database (`CREATE DATABASE ... TEMPLATE`);
5. boots the **current** backend on the copy, which applies the pending migrations on boot, prints
   the recorded migration names, and runs `migration/t09-after-migration.js`: old group tournament
   plays on to a podium, old pending invitation is accepted, team admin survived, migrated teams
   got join codes, an old open tournament starts and finishes, old chat and friendship readable,
   the old stalled bracket can be deleted.

The old build needs network access for `npm ci` and a git history that contains `OLD_REF`. Its
first run takes several minutes.

## Extending it

- **A new script**: copy a small one (`t07-leak-sweep.js` is the shortest), name it `tNN-topic.js`,
  and add it to the `SUITE` array in `run.js`. The contract is only: print `  ok <label>` /
  `  FAIL <label>` through `check()` and end with `process.exit(L.summary() ? 1 : 0)`; `run.js`
  reads the `N passed, M failed` line and treats a missing summary or a `CRASH` line as a failure.
  Wrap the body in `.catch(e => { console.error('CRASH', e); process.exit(2); })`.
- **Helpers** (`lib.js`): `api(token, method, path, body)` returns `{status, body, headers}`;
  `must()` throws on non-2xx; `newUser(prefix)` registers, verifies through the mail sink and logs
  in; `makeAdmin(user)` makes an admin; `game()`, `tournament()`, `teams(tid, n, size)` build
  fixtures (n locked teams of `size` players); `waitMail(pred)` waits for a message in the sink.
  Tokens are passed as the user object (`{token}`) or a string.
- **Browser scripts** use Playwright's Chromium against `cfg.UI`; `watch(page)` in `t10-ui.js`
  collects console errors, page errors and failing `/api/` calls, so "renders without errors" is
  a one-line assertion per page. Add pages to the list in `t10-ui.js`.
- **Another environment variable for the backend**: pass it through `run.js`/`stack.js`
  (`startStack({ extra: ['TRUST_PROXY=1'] })`) or edit `run-backend.js`.
- Checks that depend on data left by an earlier script are fragile: build your own fixtures.

## Known limits

- The throttle on `/public` and `/share` is per IP (60/min); scripts that hit those routes in a
  loop must stay under it, since everything comes from one address.
- Browser checks are tied to the current markup (class names such as `article.match-card`,
  `input.score-input`, button labels in English). A UI redesign will need those selectors updated.
- Google OAuth and real SMTP are not covered (dummy credentials, mail sink).
- Postgres 15 via `embedded-postgres`; production runs the Postgres version of
  `docker-compose.prod.yml`.
