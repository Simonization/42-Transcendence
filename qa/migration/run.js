// The production-upgrade scenario: does the CURRENT backend migrate a database that the OLD
// (pre-migrations) backend filled, and does the app keep working on that data?
//
//   1. build the old backend (git ref OLD_REF, default bb033ea, the last release before migrations)
//      into <work>/old, unless OLD_BACKEND_ROOT points at an already built checkout
//   2. database qa_prod: Baseline migration only (the schema production had)
//   3. old backend on it + t08-seed-prod.js: tournaments (started SE bracket, group stage, open
//      registration), teams, a team admin, invitations, friends, a DM
//   4. stop the old backend, copy the database (CREATE DATABASE ... TEMPLATE)
//   5. current backend on the copy: it applies the pending migrations on boot, then t09 drives it
//
// usage: node qa/migration/run.js      (or: node qa/run.js --migration)
// env:   OLD_REF=<git ref>   OLD_BACKEND_ROOT=<built backend dir>   plus the usual QA_* ports
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const cfg = require('../config');
const S = require('../stack');

const oldPort = cfg.API_PORT + 1;
const newPort = cfg.API_PORT + 2;
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`);
};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function oldBackend() {
  if (process.env.OLD_BACKEND_ROOT) return path.resolve(process.env.OLD_BACKEND_ROOT);
  const ref = process.env.OLD_REF || 'bb033ea';
  const base = path.join(cfg.WORK, 'old');
  const root = path.join(base, 'backend');
  if (fs.existsSync(path.join(root, 'dist', 'main.js')) && fs.existsSync(path.join(root, 'node_modules'))) return root;
  console.log(`building the old backend from ${ref} into ${root} (npm ci + build, a few minutes the first time) ...`);
  fs.rmSync(base, { recursive: true, force: true });
  fs.mkdirSync(base, { recursive: true });
  const tar = path.join(cfg.WORK, 'old.tar');
  run('git', ['-C', cfg.ROOT, 'archive', '--format=tar', '-o', tar, ref, 'backend']);
  run('tar', ['-xf', tar, '-C', base]);
  run(npm, ['ci', '--legacy-peer-deps'], { cwd: root });
  run(npm, ['run', 'build'], { cwd: root });
  return root;
}

function runScript(file, base) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8', env: { ...process.env, QA_BASE: base }, cwd: __dirname, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  fs.mkdirSync(path.join(cfg.WORK, 'logs'), { recursive: true });
  fs.writeFileSync(path.join(cfg.WORK, 'logs', file.replace(/\.js$/, '.log')), out);
  return { out, status: r.status };
}

async function pgClient(db) {
  const { Client } = cfg.backendRequire('pg');
  const c = new Client({ host: 'localhost', port: cfg.PG_PORT, user: cfg.PG_USER, password: cfg.PG_PASSWORD, database: db });
  await c.connect();
  return c;
}

(async () => {
  const t0 = Date.now();
  const oldRoot = oldBackend();
  const infra = await S.startInfra();
  const children = [];
  let ok = false;
  try {
    for (const f of fs.readdirSync(cfg.WORK)) if (/^(superadmin-|state-).*\.json$/.test(f)) fs.rmSync(path.join(cfg.WORK, f));
    await S.freshDb('qa_prod');
    run(process.execPath, [path.join(__dirname, 'baseline-only.js'), 'qa_prod']);

    console.log('# old backend + seed');
    const old = await S.startBackend({ db: 'qa_prod', port: oldPort, root: oldRoot, name: 'backend-old' });
    children.push(old);
    const seed = runScript('t08-seed-prod.js', `http://localhost:${oldPort}`);
    console.log(seed.out.split('\n').filter((l) => /seeded|CRASH|T1 |T2 |old PATCH/.test(l)).join('\n'));
    if (seed.status !== 0) { console.log(seed.out.slice(-2000)); throw new Error('seeding the old backend failed'); }
    await S.kill(old);

    // The old backend's pool may take a moment to disappear; a template copy needs zero sessions.
    const admin = await pgClient('postgres');
    for (let i = 0; ; i++) {
      try { await admin.query('DROP DATABASE IF EXISTS qa_migrated WITH (FORCE)'); await admin.query('CREATE DATABASE qa_migrated TEMPLATE qa_prod'); break; }
      catch (e) { if (i > 20) throw e; await S.sleep(500); }
    }
    await admin.end();

    console.log('# current backend migrates the copy on boot');
    const t1 = Date.now();
    children.push(await S.startBackend({ db: 'qa_migrated', port: newPort, name: 'backend-new' }));
    const c = await pgClient('qa_migrated');
    const names = (await c.query('SELECT name FROM migrations ORDER BY id')).rows.map((r) => r.name);
    await c.end();
    console.log(`migrations recorded after boot (${((Date.now() - t1) / 1000).toFixed(1)}s):`, names.join(', '));

    const after = runScript('t09-after-migration.js', `http://localhost:${newPort}`);
    console.log(after.out);
    const m = after.out.match(/(\d+) passed, (\d+) failed/);
    ok = !!m && +m[2] === 0 && after.status === 0 && !/^CRASH/m.test(after.out);
    console.log(`migration scenario: ${ok ? 'PASS' : 'FAIL'} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } finally {
    for (const ch of children.reverse()) await S.kill(ch);
    await infra.stop();
  }
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
