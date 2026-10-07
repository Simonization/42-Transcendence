// Drive the migrated prod-like DB with the new app.
// Run by migration/run.js, which sets QA_BASE to the new backend's URL.
const L = require('../lib');
const { api, must, check } = L;
const S = JSON.parse(require('fs').readFileSync(require('path').join(L.cfg.WORK, 'state-prod.json'), 'utf8')); // written by t08
const login = async (u) => { const r = await must(api(null, 'POST', '/auth/login', { username: u.username, password: L.PW }), 'login ' + u.username); return { ...u, token: r.accessToken }; };
const allMatches = (t) => t.phases.flatMap(p => p.matches || []);

(async () => {
  const admin = await login(S.admin);
  let r = await api(admin, 'GET', '/tournaments');
  check(r.status === 200 && r.body.length >= 3, 'tournament list', r.status);

  console.log('# old group tournament continues');
  let t = await must(api(admin, 'GET', `/tournaments/${S.tournaments.groups}`));
  check(t.status === 'ONGOING', 'groups ONGOING');
  // captains of group teams: log in via team captain ids -> we do not have their creds in state; use admin resolve
  for (const m of allMatches(t).filter(m => m.status === 'READY')) {
    r = await api(admin, 'POST', `/matches/${m.id}/resolve`, { team1Score: 2, team2Score: 0 });
    check(r.status === 200 && r.body.status === 'FINISHED', `resolve old group match ${m.id}`, r.body);
  }
  t = await must(api(admin, 'GET', `/tournaments/${S.tournaments.groups}`));
  const ko = t.phases.find(p => p.order === 2);
  check(ko.matches.length === 1 && ko.matches[0].status === 'READY', 'knockout phase generated from old groups', ko.matches);
  r = await api(admin, 'POST', `/matches/${ko.matches[0].id}/resolve`, { team1Score: 1, team2Score: 0 });
  t = await must(api(admin, 'GET', `/tournaments/${S.tournaments.groups}`));
  check(t.status === 'COMPLETED' && t.podium, 'old group tournament completes', { s: t.status, p: t.podium });
  r = await fetch(`${L.BASE}/share/t/${S.tournaments.groups}/og.png`);
  check(r.status === 200 && r.headers.get('content-type') === 'image/png', 'og.png on migrated tournament');

  console.log('# old open tournament');
  const a3cap = await login(S.users.a3cap), a3admin = await login(S.users.a3admin), b3cap = await login(S.users.b3cap), pending = await login(S.users.pending);
  let mine = await must(api(a3admin, 'GET', `/teams/mine?tournament_id=${S.tournaments.open}`));
  check(mine.team && mine.team.admins && mine.team.admins.length === 1, 'team admin carried over', mine.team && mine.team.admins);
  const inv = (await must(api(pending, 'GET', '/teams/invitations/my')));
  check(inv.length === 1 && inv[0].status === 'PENDING', 'old pending invitation visible', inv);
  r = await api(pending, 'PATCH', `/teams/invitations/${inv[0].id}/accept`);
  check(r.status === 200, 'old pending invitation can be accepted', r.body);
  const code = (await must(api(b3cap, 'GET', `/teams/${mine.team.id + 1}/join-code`).catch(() => ({})))).joinCode;
  mine = await must(api(b3cap, 'GET', `/teams/mine?tournament_id=${S.tournaments.open}`));
  const jc = await must(api(b3cap, 'GET', `/teams/${mine.team.id}/join-code`));
  check(/^[A-Za-z0-9]{10}$/.test(jc.joinCode), 'migrated team has a join code', jc);
  const newbie = await L.newUser('nb');
  r = await api(newbie, 'POST', '/teams/join', { code: jc.joinCode });
  check(r.status === 200 || r.status === 201, 'join migrated team by code', r.status + JSON.stringify(r.body));
  r = await api(b3cap, 'PATCH', `/teams/${mine.team.id}/lock`);
  check(r.status === 200, 'lock migrated draft team', r.body);
  r = await api(admin, 'POST', `/tournaments/${S.tournaments.open}/start`);
  check(r.status === 201, 'start migrated open tournament', r.body);
  t = await must(api(admin, 'GET', `/tournaments/${S.tournaments.open}`));
  const fm = allMatches(t)[0];
  check(fm && fm.status === 'READY', 'final READY', fm);
  const capOf = { [mine.team.id]: b3cap };
  const other = fm.team1_id === mine.team.id ? fm.team2_id : fm.team1_id;
  capOf[other] = a3admin; // team admin can report
  r = await api(capOf[fm.team1_id], 'POST', `/matches/${fm.id}/report`, { team1Score: 3, team2Score: 1 });
  check(r.status === 200, 'report on migrated data', r.body);
  r = await api(capOf[fm.team2_id], 'POST', `/matches/${fm.id}/confirm`);
  check(r.status === 200, 'confirm on migrated data', r.body);
  t = await must(api(admin, 'GET', `/tournaments/${S.tournaments.open}`));
  check(t.status === 'COMPLETED', 'completed', t.status);

  console.log('# old chat + friends');
  r = await api(b3cap, 'GET', '/chat/rooms');
  check(r.status === 200 && JSON.stringify(r.body).includes('hello from prod'), 'old DM visible', r.body);
  // Not rooms[0]: finishing a match above created match-chat rooms, which can sort first.
  const room = r.body.find((x) => JSON.stringify(x).includes('hello from prod')) || r.body[0];
  r = await api(b3cap, 'GET', `/chat/rooms/${room.id}/messages`);
  check(r.status === 200 && r.body.length === 1, 'old messages readable', r.body);
  r = await api(b3cap, 'GET', '/social/friends');
  check(r.status === 200 && r.body.length === 1, 'old friendship intact', r.body);

  console.log('# old SE tournament (old-engine damage)');
  t = await must(api(admin, 'GET', `/tournaments/${S.tournaments.se}`));
  const ms = allMatches(t).map(m => `${m.id}:r${m.round_order}:${m.status}:${m.team1_id ?? '-'}v${m.team2_id ?? '-'}`);
  console.log('   ', ms.join('  '));
  const ready = allMatches(t).filter(m => m.status === 'READY');
  console.log('   READY matches:', ready.length);
  r = await api(admin, 'DELETE', `/tournaments/${S.tournaments.se}`);
  check(r.status === 200, 'delete old started tournament after migration', r.status + ' ' + JSON.stringify(r.body));
  process.exit(L.summary() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
