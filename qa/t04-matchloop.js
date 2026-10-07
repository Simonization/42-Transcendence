// Match loop: report / confirm / dispute / resolve / undo, and permission checks.
const L = require('./lib');
const { api, must, check } = L;
const allMatches = (t) => t.phases.flatMap(p => (p.matches || []));
const PRIVATE_KEYS = ['mail', 'role', 'status_user', 'banUntil', 'twoFactorEnabled', 'isEmailVerified', 'firstName', 'lastName', 'passwordHash', 'verificationToken', 'twoFactorCode', 'join_code'];
function userLeaks(obj, path = '$', out = []) {
  if (Array.isArray(obj)) obj.forEach((x, i) => userLeaks(x, `${path}[${i}]`, out));
  else if (obj && typeof obj === 'object') {
    if ('username' in obj) for (const k of ['mail', 'role', 'banUntil', 'twoFactorEnabled', 'isEmailVerified', 'passwordHash', 'firstName', 'lastName']) if (k in obj) out.push(`${path}.${k}`);
    if ('join_code' in obj && obj.join_code) out.push(`${path}.join_code`);
    for (const [k, v] of Object.entries(obj)) userLeaks(v, `${path}.${k}`, out);
  }
  return out;
}

(async () => {
  const admin = await L.makeAdmin(await L.newUser('admin'));
  const g = await L.game(admin, 2);
  const tour = await L.tournament(admin, g.id);
  const ent = await L.teams(tour.id, 4, 2); // 4 teams of 2
  const [A, B, C, D] = ent;
  const outsider = await L.newUser('x');

  console.log('# permissions before start');
  for (const [m, p, b] of [['PATCH', `/tournaments/${tour.id}`, { name: 'hacked' }], ['DELETE', `/tournaments/${tour.id}`], ['POST', `/tournaments/${tour.id}/start`], ['PUT', `/tournaments/${tour.id}/seeding`, { teamIds: [A.team.id] }], ['POST', '/tournaments', { name: 'x', phases: [] }], ['POST', '/games', { name: 'x', team_count: 2, team_size: 1 }], ['POST', '/matches', {}]]) {
    const r = await api(outsider, m, p, b);
    check(r.status === 403, `non-admin ${m} ${p} -> 403`, r.status);
  }
  let r = await api(null, 'POST', `/tournaments/${tour.id}/start`);
  check(r.status === 401, 'anonymous start -> 401');

  // promote A's member to team admin
  r = await api(A.captain, 'PATCH', `/teams/${A.team.id}/promote`, { userId: A.members[1].id });
  check(r.status === 200, 'captain promotes member to team admin', r.body);

  // seeding: set D first
  r = await api(admin, 'PUT', `/tournaments/${tour.id}/seeding`, { teamIds: [A.team.id, B.team.id, C.team.id, D.team.id] });
  check(r.status === 200, 'admin sets seeding', r.body);

  await must(api(admin, 'POST', `/tournaments/${tour.id}/start`), 'start');
  let t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
  check(JSON.stringify(t.seed_order) === JSON.stringify([A.team.id, B.team.id, C.team.id, D.team.id]), 'seed order respected');
  check(userLeaks(t).length === 0, 'tournament details leak no private user fields', userLeaks(t));
  r = await api(null, 'GET', `/tournaments/${tour.id}`);
  console.log('   anonymous GET /tournaments/:id ->', r.status);
  const ms = allMatches(t);
  const mAD = ms.find(m => m.round_order === 1 && [m.team1_id, m.team2_id].includes(A.team.id));
  const mBC = ms.find(m => m.round_order === 1 && [m.team1_id, m.team2_id].includes(B.team.id));
  const final = ms.find(m => m.round_order === 2);
  check(mAD && [mAD.team1_id, mAD.team2_id].includes(D.team.id), 'seed 1 plays seed 4');
  const capOf = new Map(ent.map(e => [e.team.id, e.captain]));

  console.log('# report / confirm rules');
  r = await api(outsider, 'POST', `/matches/${mAD.id}/report`, { team1Score: 1, team2Score: 0 });
  check(r.status === 403, 'outsider cannot report', r.status);
  r = await api(D.members[1], 'POST', `/matches/${mAD.id}/report`, { team1Score: 1, team2Score: 0 });
  check(r.status === 403, 'plain member cannot report', r.status);
  r = await api(A.members[1], 'POST', `/matches/${mAD.id}/report`, { team1Score: 1, team2Score: 1 });
  check(r.status === 400, 'draw refused', r.status);
  r = await api(A.members[1], 'POST', `/matches/${mAD.id}/report`, { team1Score: -1, team2Score: 1 });
  check(r.status === 400, 'negative refused', r.status);
  r = await api(final.id ? A.captain : null, 'POST', `/matches/${final.id}/report`, { team1Score: 1, team2Score: 0 });
  check(r.status === 409, 'report on WAITING match refused', r.status);
  const aIs1 = mAD.team1_id === A.team.id;
  const aWins = aIs1 ? { team1Score: 2, team2Score: 0 } : { team1Score: 0, team2Score: 2 };
  r = await api(A.members[1], 'POST', `/matches/${mAD.id}/report`, aWins);
  check(r.status === 200 && r.body.status === 'AWAITING_CONFIRMATION', 'team admin (non-captain) reports', r.body);
  check(userLeaks(r.body).length === 0, 'report response leaks nothing', userLeaks(r.body));
  r = await api(A.captain, 'POST', `/matches/${mAD.id}/confirm`);
  check(r.status === 403, 'reporting side cannot confirm', r.status);
  r = await api(D.captain, 'POST', `/matches/${mAD.id}/report`, aWins);
  check(r.status === 409, 'other side cannot counter-report', r.status);
  r = await api(A.captain, 'POST', `/matches/${mAD.id}/report`, aIs1 ? { team1Score: 3, team2Score: 0 } : { team1Score: 0, team2Score: 3 });
  check(r.status === 200 && r.body.reported_by_team_id === A.team.id, 'reporter may correct', r.body);
  r = await api(D.members[1], 'POST', `/matches/${mAD.id}/confirm`);
  check(r.status === 403, 'plain member of opponent cannot confirm', r.status);
  r = await api(outsider, 'POST', `/matches/${mAD.id}/dispute`);
  check(r.status === 403, 'outsider cannot dispute', r.status);
  r = await api(D.captain, 'POST', `/matches/${mAD.id}/confirm`);
  check(r.status === 200 && r.body.status === 'FINISHED' && r.body.winner_id === A.team.id, 'opponent captain confirms', r.body);
  r = await api(D.captain, 'POST', `/matches/${mAD.id}/confirm`);
  check(r.status === 409, 'confirm twice refused', r.status);
  let fin = await must(api(admin, 'GET', `/matches/${final.id}`));
  const slotA = mAD.winner_next_match_slot === 2 ? fin.team2_id : fin.team1_id;
  check(slotA === A.team.id, 'A advanced into its slot of the final', fin);

  console.log('# dispute -> admin resolve');
  const bIs1 = mBC.team1_id === B.team.id;
  r = await api(B.captain, 'POST', `/matches/${mBC.id}/report`, bIs1 ? { team1Score: 2, team2Score: 1 } : { team1Score: 1, team2Score: 2 });
  check(r.status === 200, 'B reports');
  r = await api(C.captain, 'POST', `/matches/${mBC.id}/dispute`);
  check(r.status === 200 && r.body.status === 'DISPUTED', 'C disputes', r.body);
  r = await api(C.captain, 'POST', `/matches/${mBC.id}/confirm`);
  check(r.status === 409, 'confirm on disputed refused', r.status);
  r = await api(B.captain, 'POST', `/matches/${mBC.id}/report`, { team1Score: 5, team2Score: 0 });
  check(r.status === 409, 'report on disputed refused', r.status);
  r = await api(C.captain, 'POST', `/matches/${mBC.id}/resolve`, { team1Score: 0, team2Score: 1 });
  check(r.status === 403, 'captain cannot resolve', r.status);
  r = await api(C.captain, 'PATCH', `/matches/${mBC.id}`, { winner_id: C.team.id });
  check(r.status === 403, 'non-admin cannot PATCH match', r.status);
  r = await api(C.captain, 'DELETE', `/matches/${mBC.id}`);
  check(r.status === 403, 'non-admin cannot DELETE match', r.status);
  r = await api(C.captain, 'POST', `/matches/${mBC.id}/undo`);
  check(r.status === 403, 'non-admin cannot undo', r.status);
  r = await api(admin, 'PATCH', `/matches/${mBC.id}`, { winner_id: A.team.id });
  check(r.status === 400, 'admin PATCH winner not in match refused', r.status);
  const cWins = bIs1 ? { team1Score: 1, team2Score: 3 } : { team1Score: 3, team2Score: 1 };
  r = await api(admin, 'POST', `/matches/${mBC.id}/resolve`, cWins);
  check(r.status === 200 && r.body.winner_id === C.team.id && r.body.status === 'FINISHED', 'admin resolves for C', r.body);
  fin = await must(api(admin, 'GET', `/matches/${final.id}`));
  check(fin.status === 'READY' && [fin.team1_id, fin.team2_id].includes(C.team.id) && [fin.team1_id, fin.team2_id].includes(A.team.id), 'final READY with A and C', fin);

  console.log('# undo');
  r = await api(admin, 'POST', `/matches/${mBC.id}/undo`);
  check(r.status === 200 && r.body.status === 'READY' && r.body.winner_id == null, 'admin undoes BC', r.body);
  fin = await must(api(admin, 'GET', `/matches/${final.id}`));
  check(fin.status === 'WAITING' && ![fin.team1_id, fin.team2_id].includes(C.team.id), 'final back to WAITING without C', fin);
  r = await api(admin, 'POST', `/matches/${mBC.id}/resolve`, bIs1 ? { team1Score: 3, team2Score: 1 } : { team1Score: 1, team2Score: 3 });
  check(r.status === 200 && r.body.winner_id === B.team.id, 're-resolve for B');
  fin = await must(api(admin, 'GET', `/matches/${final.id}`));
  check([fin.team1_id, fin.team2_id].includes(B.team.id), 'B now in the final');
  // report the final, then undo of a semi must be refused
  const aIs1f = fin.team1_id === A.team.id;
  r = await api(A.captain, 'POST', `/matches/${final.id}/report`, aIs1f ? { team1Score: 1, team2Score: 0 } : { team1Score: 0, team2Score: 1 });
  check(r.status === 200, 'A reports the final');
  r = await api(admin, 'POST', `/matches/${mBC.id}/undo`);
  check(r.status === 409, 'undo semi after final reported refused', r.status);
  r = await api(B.captain, 'POST', `/matches/${final.id}/confirm`);
  check(r.status === 200, 'B confirms final');
  t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
  check(t.status === 'COMPLETED' && t.podium.first.teamId === A.team.id, 'completed, A champion', { s: t.status, p: t.podium });
  r = await api(admin, 'POST', `/matches/${final.id}/undo`);
  check(r.status === 200, 'undo the final');
  t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
  check(t.status === 'ONGOING' && !t.finished_at && t.podium == null, 'tournament back to ONGOING', { s: t.status, f: t.finished_at, p: t.podium });
  const st = Object.fromEntries(t.teams.map(x => [x.id, x.status]));
  check(st[A.team.id] === 'LOCKED' && st[B.team.id] === 'LOCKED', 'finalists LOCKED again', st);
  r = await api(admin, 'POST', `/matches/${final.id}/resolve`, aIs1f ? { team1Score: 0, team2Score: 1 } : { team1Score: 1, team2Score: 0 });
  t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
  check(t.status === 'COMPLETED' && t.podium.first.teamId === B.team.id, 'admin override: B champion', t.podium);

  console.log('# history / private fields on matches');
  r = await api(A.members[1], 'GET', '/matches/my-history');
  check(r.status === 200, 'my-history 200', r.body);
  console.log('   my-history entries:', Array.isArray(r.body) ? r.body.length : r.body);
  check(userLeaks(r.body).length === 0, 'history leaks nothing', userLeaks(r.body));
  r = await api(outsider, 'GET', `/matches/${final.id}`);
  check(r.status === 200 && userLeaks(r.body).length === 0, 'match details leak nothing', userLeaks(r.body));
  r = await api(outsider, 'GET', `/matches/phase/${t.phases[0].id}`);
  check(r.status === 200 && userLeaks(r.body).length === 0, 'phase matches leak nothing', userLeaks(r.body));
  r = await api(outsider, 'GET', `/teams/${A.team.id}/profile`);
  check(r.status === 200 && userLeaks(r.body).length === 0, 'team profile leaks nothing', userLeaks(r.body));

  console.log('# delete a started tournament');
  const t2 = await L.tournament(admin, g.id);
  const e2 = await L.teams(t2.id, 3, 2);
  await must(api(admin, 'POST', `/tournaments/${t2.id}/start`), 'start t2');
  const t2d = await must(api(admin, 'GET', `/tournaments/${t2.id}`));
  const rm = allMatches(t2d).find(m => m.status === 'READY');
  await must(api(e2.find(e => e.team.id === rm.team1_id).captain, 'POST', `/matches/${rm.id}/report`, { team1Score: 1, team2Score: 0 }), 'r');
  r = await api(admin, 'DELETE', `/tournaments/${t2.id}`);
  check(r.status === 200, 'delete started tournament 200', r.status + ' ' + JSON.stringify(r.body));
  r = await api(admin, 'GET', `/tournaments/${t2.id}`);
  check(r.status === 404, 'deleted tournament 404');
  r = await api(admin, 'GET', `/matches/${rm.id}`);
  check(r.status === 404, 'its matches are gone', r.status);
  r = await api(e2[0].captain, 'GET', '/matches/my-history');
  check(r.status === 200, 'history still works after delete', r.status);
  r = await api(admin, 'DELETE', `/tournaments/${tour.id}`);
  check(r.status === 200, 'delete completed tournament 200', r.status + ' ' + JSON.stringify(r.body));
  process.exit(L.summary() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
