// Sweep the remaining read endpoints for other users' private fields.
const L = require('./lib');
const { api, must, check } = L;
function leaks(obj, me, path = '$', out = []) {
  if (Array.isArray(obj)) obj.forEach((x, i) => leaks(x, me, `${path}[${i}]`, out));
  else if (obj && typeof obj === 'object') {
    if ('username' in obj && obj.id !== me) for (const k of ['mail', 'role', 'banUntil', 'twoFactorEnabled', 'isEmailVerified', 'passwordHash', 'firstName', 'lastName', 'status']) if (k in obj) out.push(`${path}.${k}`);
    for (const k of ['passwordHash', 'twoFactorCode', 'verificationToken']) if (k in obj) out.push(`${path}.${k}`);
    for (const [k, v] of Object.entries(obj)) leaks(v, me, `${path}.${k}`, out);
  }
  return out;
}
(async () => {
  const a = await L.newUser('sa'), b = await L.newUser('sb'), c = await L.newUser('sc');
  // KNOWN: fields the product deliberately sends about other users on some routes (users.service.ts
  // selects them explicitly): `status` is the presence indicator shown in the friends list and the
  // player search, `role` lets the search tell admins from players. They are reported as "known"
  // lines, not failures; anything else, or these fields on any other route, still fails the check.
  // If the product stops sending them, remove the entry (a stale entry only prints nothing).
  const KNOWN = { '/social/friends': ['status'], '/users/search?q=s': ['role', 'status'] };
  const show = async (u, m, p, body) => {
    const r = await api(u, m, p, body);
    const allowed = (m === 'GET' && KNOWN[p]) || [];
    const all = leaks(r.body, u.id);
    const l = all.filter((x) => !allowed.includes(x.split('.').pop()));
    const known = [...new Set(all.filter((x) => allowed.includes(x.split('.').pop())).map((x) => x.split('.').pop()))];
    check(r.status < 500, `${m} ${p} -> ${r.status} (no 5xx)`, r.body);
    check(l.length === 0, `${m} ${p} leaks nothing about others`, l.slice(0, 8));
    if (known.length) console.log(`  known ${m} ${p} exposes ${known.join(', ')} of other users (by design, see KNOWN)`);
    return r;
  };
  await show(a, 'POST', '/social/friends', { friendId: b.id });
  await show(b, 'POST', '/social/friends', { friendId: a.id });
  await show(a, 'GET', '/social/friends');
  await show(b, 'GET', '/social/friends');
  await show(a, 'POST', '/social/blocks', { targetId: c.id });
  await show(a, 'GET', '/social/blocks');
  const dm = await show(a, 'POST', '/chat/rooms', { participantIds: [b.id] });
  await show(a, 'POST', '/chat/rooms', { participantIds: [b.id, c.id], title: 'grp' });
  await show(b, 'GET', '/chat/rooms');
  if (dm.body && dm.body.id) {
    await show(a, 'POST', '/chat/messages', { chatId: dm.body.id, content: 'hi' });
    await show(b, 'GET', `/chat/rooms/${dm.body.id}/messages`);
  }
  await show(a, 'GET', '/notifications');
  await show(b, 'GET', '/notifications');
  await show(a, 'GET', '/organizations');
  const org = await show(a, 'POST', '/organizations', { name: 'Org' + Date.now() % 1e5 });
  if (org.body && org.body.id) {
    await show(a, 'POST', `/organizations/${org.body.id}/members`, { userId: b.id });
    await show(c, 'GET', `/organizations/${org.body.id}`);
    await show(c, 'GET', `/organizations/${org.body.id}/members`);
  }
  await show(c, 'GET', '/tournaments');
  await show(c, 'GET', '/games');
  await show(c, 'GET', `/matches/history/${a.id}`);
  await show(c, 'GET', '/users/search?q=s');
  process.exit(L.summary() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
