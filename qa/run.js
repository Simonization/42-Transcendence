// Runs the QA suite: boots the stack (stack.js), runs the scripts one after the other against one
// shared database, prints one result line per script and a total, and tears the stack down.
//
//   node qa/run.js                  whole suite (t01-t07, t14, then the browser scripts t10, t13)
//   node qa/run.js t04 t05          only these (prefix of the file name, e.g. t04 or t04-matchloop)
//   node qa/run.js --no-ui          skip the browser scripts (no Playwright / Chromium needed)
//   node qa/run.js --keep           leave the stack running afterwards (Ctrl-C to stop)
//   node qa/run.js --attach         do not boot anything: run against an already running stack
//   node qa/run.js --verbose        print every check, not only the failures
//   node qa/run.js --migration      the production-upgrade scenario instead (see migration/run.js)
//
// Exit code: 0 when every script passed, 1 otherwise.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const cfg = require('./config');
const { startStack } = require('./stack');

// Order matters a little: t01 creates the first (bootstrap) admin that the others reuse.
const SUITE = [
  { name: 't01-auth', ui: false },
  { name: 't02-brackets', ui: false },
  { name: 't03-groups', ui: false },
  { name: 't04-matchloop', ui: false },
  { name: 't05-teams', ui: false },
  { name: 't06-public-realtime-chat', ui: false },
  { name: 't07-leak-sweep', ui: false },
  { name: 't14-edges', ui: false },
  { name: 't10-ui', ui: true },
  { name: 't13-ui-matchloop', ui: true },
];

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const picks = args.filter((a) => !a.startsWith('--'));

if (flag('--migration')) {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'migration', 'run.js'), ...args.filter((a) => a !== '--migration')], { stdio: 'inherit' });
  process.exit(r.status === null ? 1 : r.status);
}

const selected = SUITE.filter((s) => (picks.length ? picks.some((p) => s.name === p || s.name.startsWith(p)) : true) && !(flag('--no-ui') && s.ui));
if (!selected.length) { console.error('no script matches', picks.join(' ')); process.exit(2); }
const needsUi = selected.some((s) => s.ui);

(async () => {
  const t0 = Date.now();
  let stack = null;
  if (!flag('--attach')) {
    process.stdout.write(`booting the stack (Postgres :${cfg.PG_PORT}, SMTP :${cfg.SMTP_PORT}, API :${cfg.API_PORT}${needsUi ? `, SPA :${cfg.UI_PORT}` : ''}) ... `);
    stack = await startStack({ ui: needsUi });
    console.log(`up in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  fs.mkdirSync(path.join(cfg.WORK, 'logs'), { recursive: true });
  let passed = 0, failed = 0, bad = 0;
  const rows = [];
  try {
    for (const s of selected) {
      const t1 = Date.now();
      const r = spawnSync(process.execPath, [path.join(__dirname, s.name + '.js')], { encoding: 'utf8', cwd: __dirname, timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
      const out = (r.stdout || '') + (r.stderr || '');
      fs.writeFileSync(path.join(cfg.WORK, 'logs', s.name + '.log'), out);
      const m = out.match(/(\d+) passed, (\d+) failed/);
      const p = m ? +m[1] : 0, f = m ? +m[2] : 0;
      const crashed = !m || /^CRASH/m.test(out);
      passed += p; failed += f; if (crashed) bad++;
      rows.push({ name: s.name, p, f, crashed, secs: (Date.now() - t1) / 1000 });
      console.log(`${s.name.padEnd(28)} ${crashed ? 'CRASH' : f ? 'FAIL ' : 'ok   '} ${String(p).padStart(4)} passed ${String(f).padStart(3)} failed  ${((Date.now() - t1) / 1000).toFixed(1)}s`);
      const shown = out.split('\n').filter((l) => flag('--verbose') || /^\s+FAIL|^CRASH|^\s+at |Error/.test(l) && (f || crashed));
      if (shown.length) console.log(shown.map((l) => '    ' + l).join('\n'));
    }
  } finally {
    if (stack && !flag('--keep')) await stack.stop();
  }
  console.log(`\n${passed} checks passed, ${failed} failed, ${bad} script(s) crashed, in ${((Date.now() - t0) / 1000).toFixed(0)}s. Per-script output: ${path.relative(process.cwd(), path.join(cfg.WORK, 'logs')) || cfg.WORK}`);
  if (stack && flag('--keep')) { console.log('stack left running (Ctrl-C to stop)'); process.on('SIGINT', async () => { await stack.stop(); process.exit(0); }); setInterval(() => {}, 1 << 30); return; }
  process.exit(failed || bad ? 1 : 0);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
