// QA helpers for driving the esportendence API locally.
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
// QA_BASE is read per call site (migration/t08 sets it before requiring this file).
const BASE = process.env.QA_BASE || cfg.BASE;
const MAIL = cfg.MAIL_LOG; // the SMTP sink (smtp.js) appends every outgoing mail here
fs.mkdirSync(cfg.WORK, { recursive: true });

let failures = 0, passes = 0;
function check(cond, label, extra) {
  if (cond) { passes++; console.log('  ok   ' + label); }
  else { failures++; console.log('  FAIL ' + label + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 600) : '')); }
  return cond;
}
function summary() { console.log(`\n${passes} passed, ${failures} failed`); return failures; }

async function api(token, method, path, body) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + (token.token || token);
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
}
const ok = (r) => r.status >= 200 && r.status < 300;
async function must(p, label) {
  const r = await p;
  if (!ok(r)) throw new Error(`${label || 'request'} -> ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

function decodeQP(s) {
  return s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
function mails() {
  if (!fs.existsSync(MAIL)) return [];
  return fs.readFileSync(MAIL, 'utf8').split('=====END=====').map(decodeQP);
}
async function waitMail(pred, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const m = mails().reverse().find(pred);
    if (m) return m;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('mail not received');
}

const PW = cfg.PW;
let seq = Date.now() % 100000;
async function newUser(prefix = 'u') {
  const username = `${prefix}${seq++}`;
  const mail = `${username}@example.test`;
  const reg = await must(api(null, 'POST', '/auth/register', { username, mail, password: PW }), 'register ' + username);
  const m = await waitMail(x => x.includes(`To: ${mail}`) && x.includes('verify-email?token='));
  const token = m.match(/verify-email\?token=([A-Za-z0-9_\-]+)/)[1];
  await must(api(null, 'GET', '/auth/verify-email?token=' + token), 'verify ' + username);
  const login = await must(api(null, 'POST', '/auth/login', { username, password: PW }), 'login ' + username);
  return { id: reg.user.id, username, mail, token: login.accessToken, refreshToken: login.refreshToken };
}

// The first admin of a database is made through the bootstrap secret; later scripts reuse that
// super admin to mint invites. It is remembered per API base URL in the work dir.
const SA = path.join(cfg.WORK, 'superadmin-' + BASE.replace(/\W/g, '') + '.json');
async function makeAdmin(user) {
  if (!global.__superAdmin && fs.existsSync(SA)) {
    const sa = JSON.parse(fs.readFileSync(SA, 'utf8'));
    const lg = await api(null, 'POST', '/auth/login', { username: sa.username, password: PW });
    if (ok(lg)) global.__superAdmin = { ...sa, token: lg.body.accessToken };
  }
  let r = await api(null, 'POST', '/auth/admin-invites/bootstrap', { secret: cfg.BOOTSTRAP_SECRET });
  if (ok(r)) fs.writeFileSync(SA, JSON.stringify(user));
  let tok;
  if (ok(r)) tok = r.body.token;
  else {
    // bootstrap done: need an existing super admin
    if (!global.__superAdmin) throw new Error('no super admin to create invite: ' + JSON.stringify(r.body));
    tok = (await must(api(global.__superAdmin, 'POST', '/auth/admin-invites', {}), 'admin invite')).token;
  }
  await must(api(user, 'POST', '/auth/admin-invites/redeem', { token: tok }), 'redeem');
  if (!global.__superAdmin) global.__superAdmin = user;
  return user;
}

async function game(admin, teamSize = 1) {
  return must(api(admin, 'POST', '/games', { name: 'G' + seq++, team_count: 2, team_size: teamSize }), 'game');
}

async function tournament(admin, gameId, opts = {}) {
  const phases = opts.phases || [{ order: 1, type: 'SINGLE_ELIMINATION', game_id: gameId, teams_limit_start: 64, teams_limit_end: 1 }];
  return must(api(admin, 'POST', '/tournaments', { name: opts.name || 'T' + seq++, max_participants: opts.max ?? 64, phases, ...(opts.extra || {}) }), 'tournament');
}

/** n teams of `size` players each, created and locked. Returns [{team, captain, members}]. */
async function teams(tid, n, size = 1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const captain = await newUser('c');
    const team = await must(api(captain, 'POST', '/teams', { name: `Team${seq++}`, tournament_id: tid }), 'team');
    const members = [captain];
    for (let k = 1; k < size; k++) {
      const u = await newUser('m');
      const code = (await must(api(captain, "GET", `/teams/${team.id}/join-code`), "code")).joinCode;
      await must(api(u, 'POST', '/teams/join', { code }), 'join');
      members.push(u);
    }
    await must(api(captain, 'PATCH', `/teams/${team.id}/lock`), 'lock');
    out.push({ team, captain, members });
  }
  return out;
}

module.exports = { api, ok, must, check, summary, newUser, makeAdmin, game, tournament, teams, mails, waitMail, BASE, PW, cfg };
