// Boots (and tears down) the whole local QA stack, as child processes with logs in <work>/logs:
//
//   embedded Postgres (pg.js)  <-  built backend dist (run-backend.js)  <-  nginx-like proxy (serve.js) -> frontend/dist
//                                          |
//                                   SMTP sink (smtp.js) -> <work>/mail.log   (verification links and 2FA codes)
//
// As a library:  const { startStack } = require('./stack');  const stack = await startStack({ ui: true });  ... await stack.stop();
// As a command:  node qa/stack.js   boots everything, prints the URLs and stays up until Ctrl-C, so a
//                single script can then be run by hand:  node qa/t04-matchloop.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const cfg = require('./config');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function service(name, script, args = [], env = {}) {
  fs.mkdirSync(path.join(cfg.WORK, 'logs'), { recursive: true });
  const log = fs.openSync(path.join(cfg.WORK, 'logs', `${name}.log`), 'w');
  const child = spawn(process.execPath, [path.join(__dirname, script), ...args], { stdio: ['ignore', log, log], env: { ...process.env, ...env }, cwd: __dirname });
  child.exitedEarly = false;
  child.on('exit', () => { child.exitedEarly = true; });
  child.logFile = path.join(cfg.WORK, 'logs', `${name}.log`);
  child.serviceName = name;
  return child;
}
async function waitLog(child, re, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (re.test(fs.readFileSync(child.logFile, 'utf8'))) return;
    if (child.exitedEarly) break;
    await sleep(150);
  }
  throw new Error(`${child.serviceName} did not become ready; see ${child.logFile}:\n${fs.readFileSync(child.logFile, 'utf8').slice(-1500)}`);
}
async function waitHttp(child, url, ms = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { await fetch(url); return; } catch { /* not listening yet */ }
    if (child.exitedEarly) break;
    await sleep(250);
  }
  throw new Error(`${child.serviceName} did not answer on ${url}; see ${child.logFile}:\n${fs.readFileSync(child.logFile, 'utf8').slice(-1500)}`);
}
function kill(child) {
  return new Promise((resolve) => {
    if (!child || child.exitedEarly) return resolve();
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } resolve(); }, 15000);
    child.once('exit', () => { clearTimeout(t); resolve(); });
    child.kill('SIGTERM');
  });
}

/** Start Postgres + SMTP sink (no app yet). The data dir persists between runs; databases are recreated on demand. */
async function startInfra() {
  fs.mkdirSync(cfg.WORK, { recursive: true });
  fs.writeFileSync(cfg.MAIL_LOG, '');
  const pg = service('postgres', 'pg.js');
  const smtp = service('smtp', 'smtp.js');
  await waitLog(pg, /PG READY/, 120000);
  await waitLog(smtp, /SMTP sink on/, 10000);
  return { pg, smtp, children: [pg, smtp], stop: async () => { await kill(smtp); await kill(pg); } };
}

/** Drop and recreate an empty database, so every run starts from nothing. */
async function freshDb(name) {
  const { Client } = cfg.backendRequire('pg');
  const c = new Client({ host: 'localhost', port: cfg.PG_PORT, user: cfg.PG_USER, password: cfg.PG_PASSWORD, database: 'postgres' });
  await c.connect();
  try {
    await c.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await c.query(`CREATE DATABASE "${name}"`);
  } finally { await c.end(); }
}

/** Start one built backend (BACKEND_ROOT env decides which checkout) on `port` against `db`. */
async function startBackend({ db = cfg.DB, port = cfg.API_PORT, root, extra = [], name = 'backend' } = {}) {
  const child = service(name, 'run-backend.js', [db, String(port), ...extra], root ? { BACKEND_ROOT: root } : {});
  await waitHttp(child, `http://localhost:${port}/`);
  return child;
}

async function startProxy() {
  const child = service('proxy', 'serve.js');
  await waitLog(child, /serving/, 10000);
  return child;
}

/** Full stack: Postgres, SMTP sink, a fresh database, the backend, and (ui: true) the SPA proxy. */
async function startStack({ ui = true, fresh = true, extra = [] } = {}) {
  const infra = await startInfra();
  const children = [...infra.children];
  const stack = {
    children,
    stop: async () => { for (const c of [...children].reverse()) await kill(c); },
  };
  try {
    if (fresh) {
      for (const f of fs.readdirSync(cfg.WORK)) if (/^(superadmin-|state-).*\.json$/.test(f)) fs.rmSync(path.join(cfg.WORK, f));
      await freshDb(cfg.DB);
    }
    children.push(await startBackend({ extra }));
    if (ui) children.push(await startProxy());
  } catch (e) {
    await stack.stop();
    throw e;
  }
  return stack;
}

module.exports = { startStack, startInfra, startBackend, startProxy, freshDb, service, waitHttp, waitLog, kill, sleep };

if (require.main === module) {
  (async () => {
    const stack = await startStack({ ui: !process.argv.includes('--no-ui') });
    console.log(`QA stack is up. API ${cfg.BASE}  SPA ${cfg.UI}  mail log ${cfg.MAIL_LOG}`);
    console.log('Run scripts against it with e.g.:  node qa/t04-matchloop.js   (Ctrl-C stops the stack)');
    const bye = async () => { await stack.stop(); process.exit(0); };
    process.on('SIGINT', bye); process.on('SIGTERM', bye);
    setInterval(() => {}, 1 << 30);
  })().catch((e) => { console.error(e.message); process.exit(1); });
}
