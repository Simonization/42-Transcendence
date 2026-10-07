// Applies only the Baseline migration to a database: the schema production had before migrations
// existed (what deploy-transcendence records on a database that predates them).
// usage: node baseline-only.js <db>      (uses backend/dist, so build the backend first)
const fs = require('fs');
const path = require('path');
const cfg = require('../config');

const dir = path.join(cfg.BACKEND_ROOT, 'dist', 'database', 'migrations');
const file = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => /-Baseline\.js$/.test(f));
if (!file) { console.error(`no *-Baseline.js in ${dir}: build the backend first`); process.exit(1); }
const mod = require(path.join(dir, file));
const Baseline = Object.values(mod).find((v) => typeof v === 'function');

cfg.backendRequire('reflect-metadata');
const { DataSource } = cfg.backendRequire('typeorm');
(async () => {
  const ds = new DataSource({ type: 'postgres', host: 'localhost', port: cfg.PG_PORT, username: cfg.PG_USER, password: cfg.PG_PASSWORD, database: process.argv[2], migrations: [Baseline], migrationsTableName: 'migrations' });
  await ds.initialize();
  await ds.runMigrations({ transaction: 'all' });
  await ds.destroy();
  console.log('baseline applied to', process.argv[2]);
})().catch((e) => { console.error(e); process.exit(1); });
