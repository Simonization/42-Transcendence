# Database migrations

The backend's schema is versioned with TypeORM migrations in
`backend/src/database/migrations/`. The built app runs any pending ones on boot, so a deploy
that changes entities ships its migration with it and needs no manual schema step.

## Pieces

| File | Role |
|---|---|
| `backend/src/database/database-options.ts` | Connection settings (the `DB_*` variables), entity and migration globs. Used by both the app and the CLI. |
| `backend/src/database/data-source.ts` | The DataSource the TypeORM CLI loads. Never synchronizes, never auto-runs. |
| `backend/src/database/migrations/` | The migrations. They compile to `dist/database/migrations/*.js`, which the production image already contains (it copies all of `dist/`). |
| `backend/scripts/verify-migrations.ts` | `npm run migration:verify`, see below. |

Current migrations:

| Timestamp | Class | What |
|---|---|---|
| `1790793062515` | `Baseline1790793062515` | The schema as `synchronize` built it before migrations existed. |
| `1790793133773` | `TournamentFlowWaves1790793133773` | Match slots and scores, match chat, check-in, registration deadline, seeding, join codes, join requests, looking-for-team. Carries existing brackets over from the old `match_teams` table. |

## Environment

| Variable | Effect |
|---|---|
| `DB_SYNCHRONIZE` | `true`: TypeORM rebuilds the schema from the entities on every boot. Local development only; never in production. |
| `DB_MIGRATIONS_RUN` | `true` / `false`: apply pending migrations on boot. Unset, it follows `DB_SYNCHRONIZE`: migrations run exactly when synchronize is off. |

So production (`DB_SYNCHRONIZE=false`, `DB_MIGRATIONS_RUN` unset) migrates itself on boot, and a
local database built by synchronize is left alone. All pending migrations run in one
transaction: if one fails, none is applied and the app does not start.

## Commands

Run from `backend/`. The CLI reads the same `DB_*` variables as the app, so point them at the
database you mean, e.g. the dev compose database from the host:

```bash
export DB_HOST=localhost DB_PORT=5433 DB_USERNAME=user DB_PASSWORD=password DB_DATABASE=transcendence_db
```

| Command | Does |
|---|---|
| `npm run migration:show` | Lists migrations, `[X]` = applied. |
| `npm run migration:run` | Applies the pending ones. |
| `npm run migration:revert` | Reverts the last applied one (run again to go further back). |
| `npm run migration:generate -- src/database/migrations/AddSomething` | Writes a migration with the difference between the entities and the database. |
| `npm run migration:create -- src/database/migrations/Something` | Writes an empty migration. |
| `npm run migration:verify` | See below. |

In the production image (no ts-node, compiled files only), the same through
`npm run migration:show:prod`, `migration:run:prod` and `migration:revert:prod`.

### Changing an entity

1. Change the entity.
2. Bring a local database to the latest migration (`npm run migration:run`, on a database
   that was built by migrations, not by synchronize).
3. `npm run migration:generate -- src/database/migrations/DescribeTheChange`.
4. Read the generated file. The generator does not know about data: it drops and re-adds a
   column when its type changes, recreates an enum type when its values change (rows holding a
   removed value make the cast fail), leaves behind tables that no entity maps any more, and adds `NOT NULL` columns without a value for existing rows. Rewrite those
   parts so existing rows survive, and keep `down()` the inverse of `up()`.
5. `npm run migration:verify`, then commit the migration with the entity change.

### `npm run migration:verify`

Starts a throwaway Postgres 15 (the `embedded-postgres` dev dependency, no Docker needed; port
`MIGRATION_VERIFY_PORT`, default 55440) and checks that:

- an empty database migrated with every migration has exactly the schema `synchronize` builds
  from the current entities, and `migration:generate` would find nothing to do. It fails when
  an entity changed without a migration;
- a database at the Baseline, holding rows in the old shape, goes through the later migrations
  with its data carried over, reverts, and migrates again.

It is not part of `npm test` (it needs ~30 s and a free port).

## One-time switch-over of an existing database

A database that `synchronize` built from the entities of the last deploy before migrations
(the production database) already has the Baseline schema but no `migrations` table. Tell
TypeORM so once, **before** the first deploy with migrations, by running this SQL against it
(for example with `psql` inside the database container):

```sql
BEGIN;
CREATE TABLE IF NOT EXISTS "migrations" (
    "id" SERIAL NOT NULL,
    "timestamp" bigint NOT NULL,
    "name" character varying NOT NULL,
    CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
);
INSERT INTO "migrations" ("timestamp", "name")
SELECT 1790793062515, 'Baseline1790793062515'
WHERE NOT EXISTS (SELECT 1 FROM "migrations" WHERE "name" = 'Baseline1790793062515');
COMMIT;
```

The table definition is the one TypeORM itself creates; the statement is safe to run twice.
Then deploy as usual with `DB_SYNCHRONIZE=false`: on boot the app applies every migration after
the Baseline. Take a database dump first, as for any deploy.

Do not boot that database with `DB_SYNCHRONIZE=true` any more: synchronize would apply the
entity changes itself, bypassing the data carry-over in the migrations, and the next migration
run would then fail on columns that already exist.

If the SQL is forgotten, the app tries to run the Baseline, fails on the first
`CREATE TABLE` of a table that already exists, rolls back, and does not start. Nothing is
changed; run the SQL and restart.

### What the tournament-flow migration does to existing rows

- **Match slots.** `match_teams` never recorded which team was in which slot. A team that
  reached a match by winning an earlier one takes the slot that earlier match names in
  `winner_next_match_slot`; the other teams fill the free slots by ascending team id. Then
  `match_teams` is dropped.
- **Old generator gaps.** `tournament_id` and `game_id` are filled from the match's phase,
  `group_index` from `game_data.group` ("A" is 0), and a `WAITING` match with both slots filled
  becomes `READY` (the old app created every match as `WAITING`).
- **Join codes.** Every existing team gets a random 10-character code in the app's format.
- **Invitations.** Existing rows become `INVITE`s; the status enum gains `CANCELLED` without
  touching rows.

Reverting it rebuilds `match_teams` from the slots, turns `CANCELLED` invitations into
`DECLINED`, and deletes join requests (the old schema cannot tell them from invitations). The
new columns and the looking-for-team board are dropped with their data.
