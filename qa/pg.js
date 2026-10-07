// Throwaway Postgres for the QA stack, using the embedded-postgres package that backend/ already
// depends on (the same one `npm run migration:verify` and `npm run test:db` use).
// usage: node pg.js [port] [datadir]   (defaults from config.js; datadir is created on first run)
// Creates the QA database (config.DB, plus any names in QA_EXTRA_DBS=a,b) if it does not exist yet.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const cfg = require('./config');

(async () => {
  const entry = cfg.backendRequire.resolve('embedded-postgres');
  const { default: EmbeddedPostgres } = await import(pathToFileURL(entry).href);
  const port = Number(process.argv[2] || cfg.PG_PORT);
  const dir = path.resolve(process.argv[3] || path.join(cfg.WORK, 'pgdata'));
  const fresh = !fs.existsSync(path.join(dir, 'PG_VERSION'));
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: cfg.PG_USER, password: cfg.PG_PASSWORD, port, persistent: true, onLog: () => {}, onError: () => {} });
  if (fresh) await pg.initialise();
  await pg.start();
  const names = [cfg.DB, ...(process.env.QA_EXTRA_DBS || '').split(',').filter(Boolean)];
  for (const name of names) {
    try { await pg.createDatabase(name); } catch (e) { if (!/already exists/.test(String(e))) throw e; }
  }
  console.log('PG READY on', port);
  const stop = async () => { try { await pg.stop(); } finally { process.exit(0); } };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
  setInterval(() => {}, 1 << 30);
})().catch((e) => { console.error(e); process.exit(1); });
