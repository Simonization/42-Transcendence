// Group stage -> single elimination, and a round robin, played out.
const L = require('./lib');
const { api, must, check } = L;
const allMatches = (t) => t.phases.flatMap(p => (p.matches || []).map(m => ({ ...m, phaseOrder: p.order })));

async function playReady(admin, tid, capOf, decide) {
  let t = await must(api(admin, 'GET', `/tournaments/${tid}`));
  const ready = allMatches(t).filter(m => m.status === 'READY');
  for (const m of ready) {
    const t1wins = decide(m);
    const score = t1wins ? { team1Score: 3, team2Score: 1 } : { team1Score: 1, team2Score: 3 };
    await must(api(capOf.get(m.team1_id), 'POST', `/matches/${m.id}/report`, score), 'report');
    await must(api(capOf.get(m.team2_id), 'POST', `/matches/${m.id}/confirm`), 'confirm');
  }
  return ready.length;
}

(async () => {
  const admin = await L.makeAdmin(await L.newUser('admin'));
  const g = await L.game(admin, 1);

  console.log('# GROUP_STAGE (6 teams, groups of 3, 2 go through) -> SINGLE_ELIMINATION');
  const tour = await L.tournament(admin, g.id, {
    phases: [
      { order: 1, type: 'GROUP_STAGE', game_id: g.id, teams_limit_start: 6, teams_limit_end: 4, group_size: 3, group_winners_count: 2 },
      { order: 2, type: 'SINGLE_ELIMINATION', game_id: g.id, teams_limit_start: 4, teams_limit_end: 1 },
    ],
  });
  const ent = await L.teams(tour.id, 6);
  const capOf = new Map(ent.map(e => [e.team.id, e.captain]));
  const prev = await must(api(admin, 'GET', `/tournaments/${tour.id}/seeding`));
  check(prev.groups.length === 2 && prev.groups.every(g => g.length === 3), 'preview: 2 groups of 3', prev.groups);
  await must(api(admin, 'POST', `/tournaments/${tour.id}/start`), 'start');
  let t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
  const p1 = t.phases.find(p => p.order === 1);
  check(p1.matches.length === 6, '6 group matches (3 per group)', p1.matches.length);
  check(p1.matches.every(m => m.status === 'READY'), 'all group matches READY');
  check(new Set(p1.matches.map(m => m.group_index)).size === 2, 'two group indexes');
  const groupsFromMatches = [0, 1].map(gi => [...new Set(p1.matches.filter(m => m.group_index === gi).flatMap(m => [m.team1_id, m.team2_id]))].sort());
  check(JSON.stringify(groupsFromMatches) === JSON.stringify(prev.groups.map(g => [...g].sort())), 'groups = preview', { groupsFromMatches, prev: prev.groups });
  for (const gi of [0, 1]) {
    const rounds = p1.matches.filter(m => m.group_index === gi).map(m => m.round_order);
    check(new Set(rounds).size === 3, `group ${gi}: 3 distinct matchdays`, rounds);
  }
  // nobody plays twice per matchday
  // Wins: lower team id wins -> deterministic standings
  await playReady(admin, tour.id, capOf, m => m.team1_id < m.team2_id);
  t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
  const st = await must(api(admin, 'GET', `/tournaments/${tour.id}/standings`));
  console.log('   standings:', JSON.stringify(st).slice(0, 500));
  const p2 = t.phases.find(p => p.order === 2);
  check(t.active_phase_id === p2.id && t.current_phase_order === 2, 'phase 2 active after groups');
  check(p2.matches && p2.matches.length === 3, 'knockout has 3 matches', p2.matches && p2.matches.length);
  const koTeams = new Set(p2.matches.flatMap(m => [m.team1_id, m.team2_id]).filter(x => x != null));
  const expectQ = prev.groups.flatMap(g => [...g].sort((a, b) => a - b).slice(0, 2));
  check(koTeams.size === 4 && expectQ.every(id => koTeams.has(id)), 'top 2 of each group qualify', { ko: [...koTeams], expectQ });
  // cross-over: group winners must not meet each other in the semi
  const winners = prev.groups.map(g => Math.min(...g));
  const semis = p2.matches.filter(m => m.round_order === 1);
  check(!semis.some(m => winners.includes(m.team1_id) && winners.includes(m.team2_id)), 'group winners do not meet in the semis', semis.map(m => [m.team1_id, m.team2_id]));
  let r = await api(admin, 'POST', `/matches/${p1.matches[0].id}/undo`);
  check(r.status === 409, 'undo a group match after phase 2 started refused', r.status);
  while ((await playReady(admin, tour.id, capOf, m => Math.random() < 0.5)) > 0);
  t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
  check(t.status === 'COMPLETED', 'group+KO tournament COMPLETED', t.status);
  const fin = p2.matches.find(m => !m.winner_next_match_id);
  const finNow = allMatches(t).find(m => m.id === fin.id);
  check(t.podium && t.podium.first.teamId === finNow.winner_id, 'podium first = KO final winner', t.podium);

  console.log('# ROUND_ROBIN, 5 teams');
  const rr = await L.tournament(admin, g.id, { phases: [{ order: 1, type: 'ROUND_ROBIN', game_id: g.id, teams_limit_start: 5, teams_limit_end: 1 }] });
  const ent2 = await L.teams(rr.id, 5);
  const cap2 = new Map(ent2.map(e => [e.team.id, e.captain]));
  await must(api(admin, 'POST', `/tournaments/${rr.id}/start`), 'start rr');
  t = await must(api(admin, 'GET', `/tournaments/${rr.id}`));
  check(allMatches(t).length === 10, '10 round-robin matches', allMatches(t).length);
  // team with highest id wins all
  await playReady(admin, rr.id, cap2, m => m.team1_id > m.team2_id);
  t = await must(api(admin, 'GET', `/tournaments/${rr.id}`));
  check(t.status === 'COMPLETED', 'round robin COMPLETED', t.status);
  const top = Math.max(...ent2.map(e => e.team.id));
  check(t.podium && t.podium.first.teamId === top, 'round robin podium first = most wins', t.podium);
  const st2 = await must(api(admin, 'GET', `/tournaments/${rr.id}/standings`));
  console.log('   rr standings:', JSON.stringify(st2).slice(0, 400));
  process.exit(L.summary() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
