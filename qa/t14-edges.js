// Remaining edges: withdraw, seeding validation, capacity, phase edit after start, join requests,
// team delete, account delete, concurrent confirm.
const L = require('./lib');
const { api, must, check } = L;
const allMatches = (t) => t.phases.flatMap(p => p.matches || []);

(async () => {
  const admin = await L.makeAdmin(await L.newUser('admin'));
  const g = await L.game(admin, 1);

  console.log('# seeding validation + capacity at start');
  const t1 = await L.tournament(admin, g.id, { max: 3 });
  const e1 = await L.teams(t1.id, 3);
  const other = await L.tournament(admin, g.id);
  const eo = await L.teams(other.id, 1);
  let r = await api(admin, 'PUT', `/tournaments/${t1.id}/seeding`, { teamIds: [eo[0].team.id, e1[0].team.id] });
  console.log('   seeding with a team of another tournament ->', r.status, JSON.stringify(r.body).slice(0, 150));
  check(r.status === 400, 'seeding refuses foreign team ids', r.status);
  r = await api(admin, 'PUT', `/tournaments/${t1.id}/seeding`, { teamIds: [e1[2].team.id, e1[2].team.id] });
  check(r.status === 400, 'seeding refuses duplicates', r.status);
  r = await api(admin, 'PUT', `/tournaments/${t1.id}/seeding`, { teamIds: [e1[2].team.id, e1[0].team.id, e1[1].team.id] });
  check(r.status === 200, 'valid seeding accepted');
  await must(api(admin, 'POST', `/tournaments/${t1.id}/start`), 'start t1');
  r = await api(admin, 'PATCH', `/tournaments/${t1.id}`, { phases: [{ order: 1, type: 'ROUND_ROBIN', game_id: g.id, teams_limit_start: 3, teams_limit_end: 1 }] });
  check(r.status === 400, 'phases cannot change after start', r.status);
  r = await api(admin, 'PUT', `/tournaments/${t1.id}/seeding`, { teamIds: [e1[0].team.id] });
  check(r.status === 400, 'seeding cannot change after start', r.status);
  r = await api(admin, 'PATCH', `/tournaments/${t1.id}`, { max_participants: 1 });
  console.log('   PATCH max_participants=1 on a running 3-team tournament ->', r.status);
  let t = await must(api(admin, 'GET', `/tournaments/${t1.id}`));
  check(t.seed_order[0] === e1[2].team.id, 'seed 1 = admin choice');
  const bye = allMatches(t).find(m => m.status === 'BYE');
  check(bye && bye.winner_id === e1[2].team.id, 'bye goes to admin seed 1');

  console.log('# withdraw');
  const ready = allMatches(t).find(m => m.status === 'READY');
  const loser = ready.team1_id;
  r = await api(admin, 'POST', `/tournaments/${t1.id}/teams/${loser}/withdraw`);
  check(r.status === 201 || r.status === 200, 'admin withdraws a team', r.status + ' ' + JSON.stringify(r.body).slice(0, 200));
  let m = await must(api(admin, 'GET', `/matches/${ready.id}`));
  check(m.status === 'FINISHED' && m.winner_id === ready.team2_id && m.game_data.walkover, 'walkover to the opponent', m);
  t = await must(api(admin, 'GET', `/tournaments/${t1.id}`));
  const fin = allMatches(t).find(x => !x.winner_next_match_id);
  check(fin.status === 'READY', 'final READY after walkover', fin);
  r = await api(admin, 'POST', `/tournaments/${t1.id}/teams/${loser}/withdraw`);
  check(r.status === 400, 'withdraw twice refused', r.status);
  r = await api(e1[0].captain, 'POST', `/tournaments/${t1.id}/teams/${e1[0].team.id}/withdraw`);
  check(r.status === 403, 'non-admin cannot withdraw', r.status);

  console.log('# concurrent confirms');
  const capOf = new Map(e1.map(e => [e.team.id, e.captain]));
  await must(api(capOf.get(fin.team1_id), 'POST', `/matches/${fin.id}/report`, { team1Score: 1, team2Score: 0 }), 'report final');
  const results = await Promise.all([1, 2, 3].map(() => api(capOf.get(fin.team2_id), 'POST', `/matches/${fin.id}/confirm`)));
  const codes = results.map(x => x.status).sort();
  check(codes.filter(c => c === 200).length === 1 && codes.filter(c => c === 409).length === 2, 'exactly one of three concurrent confirms wins', codes);
  t = await must(api(admin, 'GET', `/tournaments/${t1.id}`));
  check(t.status === 'COMPLETED', 'completed after concurrent confirms');

  console.log('# join requests');
  const t2 = await L.tournament(admin, g.id);
  const cap = await L.newUser('jr');
  const team = await must(api(cap, 'POST', '/teams', { name: 'Reqs', tournament_id: t2.id }));
  const g2 = await L.game(admin, 2);
  const [u1, u2] = [await L.newUser('rq'), await L.newUser('rq')];
  const rq1 = await must(api(u1, 'POST', `/teams/${team.id}/requests`, { note: 'hi' }), 'req1');
  const rq2 = await must(api(u2, 'POST', `/teams/${team.id}/requests`, {}), 'req2');
  r = await api(u2, 'GET', `/teams/${team.id}/requests`);
  check(r.status === 403, 'requester cannot list team requests', r.status);
  r = await api(cap, 'GET', `/teams/${team.id}/requests`);
  check(r.status === 200 && r.body.length === 2, 'captain lists requests', r.body);
  r = await api(u1, 'PATCH', `/teams/requests/${rq1.id}/accept`);
  check(r.status === 403, 'requester cannot accept own request', r.status);
  r = await api(cap, 'PATCH', `/teams/requests/${rq1.id}/accept`);
  check(r.status === 200, 'captain accepts request', r.body);
  r = await api(cap, 'PATCH', `/teams/requests/${rq2.id}/decline`);
  check(r.status === 200, 'captain declines request', r.body);
  const rq3 = await must(api(u2, 'POST', `/teams/${team.id}/requests`, {}), 'req3');
  r = await api(u2, 'DELETE', `/teams/invitations/${rq3.id}`);
  check(r.status === 200, 'requester withdraws own request', r.status);

  console.log('# delete team with pending invite, then delete accounts');
  const u3 = await L.newUser('pi');
  await must(api(cap, 'PATCH', `/teams/${team.id}/invite`, { userId: u3.id }), 'invite u3');
  r = await api(u1, 'DELETE', `/teams/${team.id}`);
  check(r.status === 403, 'member cannot delete team', r.status);
  r = await api(cap, 'DELETE', `/teams/${team.id}`);
  check(r.status === 200, 'captain deletes team with pending invites', r.status + ' ' + JSON.stringify(r.body).slice(0, 200));
  const inv = await must(api(u3, 'GET', '/teams/invitations/my'));
  check(inv.length === 0, 'pending invite gone', inv);
  // account deletion: a player with match history and a captain of a running tournament team
  const t3 = await L.tournament(admin, g.id);
  const e3 = await L.teams(t3.id, 2);
  await must(api(admin, 'POST', `/tournaments/${t3.id}/start`));
  const tt = await must(api(admin, 'GET', `/tournaments/${t3.id}`));
  const fm = allMatches(tt)[0];
  r = await api(e1[0].captain, 'DELETE', `/users/${e1[0].captain.id}`);
  console.log('   delete account with match history ->', r.status, JSON.stringify(r.body).slice(0, 200));
  check(r.status < 500, 'deleting an account with history does not 500', r.status);
  r = await api(e3[0].captain, 'DELETE', `/users/${e3[0].captain.id}`);
  console.log('   delete account that captains a team in a running tournament ->', r.status, JSON.stringify(r.body).slice(0, 200));
  check(r.status < 500, 'deleting a running captain does not 500', r.status);
  const after = await api(admin, 'GET', `/tournaments/${t3.id}`);
  check(after.status === 200, 'tournament still readable after captain deletion', after.status);
  if (after.status === 200) console.log('   match after captain delete:', JSON.stringify(allMatches(after.body).map(x => [x.status, x.team1_id, x.team2_id])));
  r = await api(admin, 'POST', `/matches/${fm.id}/resolve`, { team1Score: 1, team2Score: 0 });
  console.log('   admin resolves that match ->', r.status, JSON.stringify(r.body).slice(0, 150));
  check(r.status < 500, 'resolve after captain deletion does not 500', r.status);
  process.exit(L.summary() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
