// Start single-elimination tournaments with 3,5,6,8 teams and play each to completion.
const L = require('./lib');
const { api, must, check } = L;

const seedPositions = (size) => { let p = [1]; while (p.length < size) { const t = p.length * 2 + 1; p = p.flatMap(s => [s, t - s]); } return p; };

async function details(admin, tid) { return must(api(admin, 'GET', `/tournaments/${tid}`), 'details'); }
const allMatches = (t) => t.phases.flatMap(p => (p.matches || []).map(m => ({ ...m, phaseOrder: p.order })));

async function playOut(admin, tid, entrants, opts = {}) {
  const capOf = new Map(entrants.map(e => [e.team.id, e.captain]));
  const seedOf = new Map(); // filled from seed_order
  let t = await details(admin, tid);
  (t.seed_order || []).forEach((id, i) => seedOf.set(id, i + 1));
  let guard = 0;
  while (t.status === 'ONGOING' && guard++ < 200) {
    const ready = allMatches(t).filter(m => m.status === 'READY');
    if (!ready.length) { check(false, 'ONGOING tournament has READY matches', allMatches(t).map(m => [m.id, m.status, m.team1_id, m.team2_id])); return t; }
    if (process.env.RANDOM_WIN) ready.reverse();
    for (const m of ready) {
      // the better seed wins (or a coin flip with RANDOM_WIN); team1 captain reports, team2 captain confirms
      const t1wins = process.env.RANDOM_WIN ? Math.random() < 0.5 : (seedOf.get(m.team1_id) ?? 999) < (seedOf.get(m.team2_id) ?? 999);
      const score = t1wins ? { team1Score: 2, team2Score: 1 } : { team1Score: 0, team2Score: 2 };
      await must(api(capOf.get(m.team1_id), 'POST', `/matches/${m.id}/report`, score), 'report');
      const r = await must(api(capOf.get(m.team2_id), 'POST', `/matches/${m.id}/confirm`), 'confirm');
      const winner = t1wins ? m.team1_id : m.team2_id;
      if (r.winner_id !== winner || r.status !== 'FINISHED') check(false, `match ${m.id} finished with winner`, r);
      if (m.winner_next_match_id) {
        const next = await must(api(admin, 'GET', `/matches/${m.winner_next_match_id}`), 'next');
        const slot = m.winner_next_match_slot === 2 ? next.team2_id : next.team1_id;
        if (slot !== winner) check(false, `winner of ${m.id} lands in slot ${m.winner_next_match_slot} of ${next.id}`, next);
      }
    }
    t = await details(admin, tid);
  }
  return t;
}

async function run(admin, gameId, n) {
  console.log(`# single elimination, ${n} teams`);
  const tour = await L.tournament(admin, gameId, { name: `SE${n}-${Date.now() % 1e5}` });
  const entrants = await L.teams(tour.id, n);
  // one extra DRAFT team that must be archived at start
  const drafter = await L.newUser('d');
  const draft = await must(api(drafter, 'POST', '/teams', { name: 'Draft' + Date.now() % 1e5, tournament_id: tour.id }), 'draft team');
  const preview = await must(api(admin, 'GET', `/tournaments/${tour.id}/seeding`), 'seeding');
  check(preview.teams.length === n, 'preview has the locked teams only');
  check(preview.excluded.some(e => e.id === draft.id && e.reason === 'not_locked'), 'preview lists the draft team as excluded');
  let r = await api(admin, 'POST', `/tournaments/${tour.id}/start`);
  check(r.status === 201, 'start 201', r.body);
  let t = await details(admin, tour.id);
  check(t.status === 'ONGOING', 'ONGOING');
  const draftNow = t.teams.find(x => x.id === draft.id);
  check(draftNow && draftNow.status === 'ARCHIVED', 'draft team ARCHIVED at start', draftNow && draftNow.status);
  check(JSON.stringify(t.seed_order) === JSON.stringify(preview.teams.map(x => x.id)), 'seed order = preview');
  const ms = allMatches(t);
  let size = 2; while (size < n) size *= 2;
  check(ms.length === size - 1, `${size - 1} matches`, ms.length);
  const r1 = ms.filter(m => m.round_order === 1).sort((a, b) => a.id - b.id);
  check(r1.every(m => m.team1_id != null || m.team2_id != null), 'no empty first-round match');
  const byes = r1.filter(m => m.status === 'BYE');
  check(byes.length === size - n, `${size - n} byes`, byes.map(m => m.id));
  check(byes.every(m => m.winner_id != null), 'byes have a winner');
  const seeds = t.seed_order;
  const byeTeams = byes.map(m => m.winner_id).sort();
  const expectByes = seeds.slice(0, size - n).sort();
  check(JSON.stringify(byeTeams) === JSON.stringify(expectByes), 'byes go to the top seeds', { byeTeams, expectByes });
  // byes advanced
  for (const b of byes) {
    const next = ms.find(m => m.id === b.winner_next_match_id);
    const slot = b.winner_next_match_slot === 2 ? next.team2_id : next.team1_id;
    check(slot === b.winner_id, `bye ${b.id} advanced to ${next.id} slot ${b.winner_next_match_slot}`, next);
  }
  // round 1 pairing follows standard seeding 1 v N
  const pos = seedPositions(size);
  // matches ordered by generation: final first then round by round; identify r1 ordering by winner_next chain is complex; check pairs as sets
  const expectPairs = []; for (let i = 0; i < pos.length; i += 2) expectPairs.push([pos[i], pos[i + 1]].filter(s => s <= n).map(s => seeds[s - 1]).sort().join('v'));
  const gotPairs = r1.map(m => [m.team1_id, m.team2_id].filter(x => x != null).sort().join('v'));
  check(JSON.stringify([...expectPairs].sort()) === JSON.stringify([...gotPairs].sort()), 'first-round pairs follow standard seeding', { expectPairs, gotPairs });
  // seed 1 and 2 on opposite halves: they meet only in the final
  r = await api(admin, 'POST', `/tournaments/${tour.id}/start`);
  check(r.status === 400, 'second start refused');

  t = await playOut(admin, tour.id, entrants);
  check(t.status === 'COMPLETED', 'COMPLETED', t.status);
  check(!!t.finished_at, 'finished_at set');
  check(t.teams.every(x => x.status === 'ARCHIVED'), 'all teams ARCHIVED', t.teams.map(x => x.status));
  check(t.podium && (t.podium.first?.teamId ?? t.podium.first?.id ?? JSON.stringify(t.podium)) !== undefined, 'podium present', t.podium);
  const champion = allMatches(t).find(m => !m.winner_next_match_id).winner_id;
  check(t.podium.first.teamId === champion, 'podium first = final winner');
  if (!process.env.RANDOM_WIN) check(champion === seeds[0], 'top seed (always winning) is champion', { champion, seed1: seeds[0] });
  console.log('   podium:', JSON.stringify(t.podium).slice(0, 300));
  return { tour, entrants, t };
}

(async () => {
  const admin = await L.makeAdmin(await L.newUser('admin'));
  const g = await L.game(admin, 1);
  const out = {};
  for (const n of (process.argv[2] || '3,5,6,8').split(',').map(Number)) out[n] = await run(admin, g.id, n);
  require('fs').writeFileSync(require('path').join(L.cfg.WORK, 'state-t02.json'), JSON.stringify({ admin, gameId: g.id, tids: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.tour.id])) }));
  process.exit(L.summary() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
