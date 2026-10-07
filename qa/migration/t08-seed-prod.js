// Seed the OLD (pre-migrations production) backend with realistic data through its own API.
// Run by migration/run.js, which sets QA_BASE to the old backend's URL.
const L = require('../lib');
const { api, must } = L;
const fs = require('fs');
const path = require('path');

async function team(tid, size, name) {
  const cap = await L.newUser('pc');
  const t = await must(api(cap, 'POST', '/teams', { name, tournament_id: tid }), 'team ' + name);
  const members = [cap];
  for (let i = 1; i < size; i++) {
    const u = await L.newUser('pm');
    const inv = await must(api(cap, 'PATCH', `/teams/${t.id}/invite`, { userId: u.id }), 'invite');
    await must(api(u, 'PATCH', `/teams/invitations/${inv.id}/accept`), 'accept');
    members.push(u);
  }
  return { team: t, captain: cap, members };
}

(async () => {
  const admin = await L.makeAdmin(await L.newUser('padmin'));
  const g = await must(api(admin, 'POST', '/games', { name: 'Valorant', team_count: 2, team_size: 2 }), 'game');
  const out = { admin, gameId: g.id, tournaments: {} };

  // T1: SE with 5 locked teams, started; finish two matches via the old PATCH (winner propagation)
  const t1 = await must(api(admin, 'POST', '/tournaments', { name: 'Prod SE Cup', max_participants: 16, phases: [{ order: 1, type: 'SINGLE_ELIMINATION', game_id: g.id, teams_limit_start: 5, teams_limit_end: 1 }] }), 't1');
  const e1 = [];
  for (let i = 0; i < 5; i++) { const e = await team(t1.id, 2, `SE Team ${i + 1}`); await must(api(e.captain, 'PATCH', `/teams/${e.team.id}/lock`), 'lock'); e1.push(e); }
  const draft1 = await team(t1.id, 1, 'SE Draft');
  await must(api(admin, 'POST', `/tournaments/${t1.id}/start`), 'start t1');
  let d1 = await must(api(admin, 'GET', `/tournaments/${t1.id}`), 'd1');
  const ms1 = d1.phases.flatMap(p => p.matches || []);
  console.log('T1 matches after old start:', JSON.stringify(ms1.map(m => ({ id: m.id, r: m.round_order, st: m.status, teams: (m.teams || []).map(t => t.id), next: m.winner_next_match_id, slot: m.winner_next_match_slot }))));
  // finish every round-1 match that has two teams
  for (const m of ms1.filter(m => m.round_order === 1 && (m.teams || []).length === 2)) {
    const r = await api(admin, 'PATCH', `/matches/${m.id}`, { winner_id: m.teams[1].id, status: 'FINISHED', score: '1-2' });
    console.log('  old PATCH finish', m.id, '->', r.status, JSON.stringify(r.body).slice(0, 120));
  }
  out.tournaments.se = t1.id;

  // T2: group stage with 4 teams, started, one match finished
  const t2 = await must(api(admin, 'POST', '/tournaments', { name: 'Prod Groups', max_participants: 8, phases: [
    { order: 1, type: 'GROUP_STAGE', game_id: g.id, teams_limit_start: 4, teams_limit_end: 2, group_size: 2, group_winners_count: 1 },
    { order: 2, type: 'SINGLE_ELIMINATION', game_id: g.id, teams_limit_start: 2, teams_limit_end: 1 }] }), 't2');
  for (let i = 0; i < 4; i++) { const e = await team(t2.id, 2, `GS Team ${i + 1}`); await must(api(e.captain, 'PATCH', `/teams/${e.team.id}/lock`), 'lock'); }
  const st2 = await api(admin, 'POST', `/tournaments/${t2.id}/start`);
  console.log('T2 start ->', st2.status);
  out.tournaments.groups = t2.id;

  // T3: registration open: a locked team, a draft team with pending invitation, a team admin
  const t3 = await must(api(admin, 'POST', '/tournaments', { name: 'Prod Open', max_participants: 8, phases: [{ order: 1, type: 'SINGLE_ELIMINATION', game_id: g.id, teams_limit_start: 2, teams_limit_end: 1 }] }), 't3');
  const a3 = await team(t3.id, 2, 'Open Locked');
  await must(api(a3.captain, 'PATCH', `/teams/${a3.team.id}/promote`, { userId: a3.members[1].id }), 'promote');
  await must(api(a3.captain, 'PATCH', `/teams/${a3.team.id}/lock`), 'lock');
  const b3 = await team(t3.id, 1, 'Open Draft');
  const pending = await L.newUser('pp');
  await must(api(b3.captain, 'PATCH', `/teams/${b3.team.id}/invite`, { userId: pending.id }), 'pending invite');
  const declined = await L.newUser('pd');
  const dinv = await must(api(b3.captain, 'PATCH', `/teams/${b3.team.id}/invite`, { userId: declined.id }), 'inv2');
  await must(api(declined, 'PATCH', `/teams/invitations/${dinv.id}/decline`), 'decline');
  out.tournaments.open = t3.id;
  out.users = { a3cap: a3.captain, a3admin: a3.members[1], b3cap: b3.captain, pending, se: e1.map(e => ({ team: e.team.id, cap: e.captain, m: e.members[1] })) };

  // social + chat
  await must(api(a3.captain, 'POST', '/social/friends', { friendId: b3.captain.id }), 'friend');
  await must(api(b3.captain, 'POST', '/social/friends', { friendId: a3.captain.id }), 'friend back');
  const room = await must(api(a3.captain, 'POST', '/chat/rooms', { participantIds: [b3.captain.id] }), 'dm');
  await must(api(a3.captain, 'POST', '/chat/messages', { chatId: room.id, content: 'hello from prod' }), 'msg');
  fs.writeFileSync(path.join(L.cfg.WORK, 'state-prod.json'), JSON.stringify(out, null, 1));
  console.log('seeded', JSON.stringify(out.tournaments));
})().catch(e => { console.error('CRASH', e); process.exit(2); });
