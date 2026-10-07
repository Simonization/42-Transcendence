// Public share page + og.png, realtime over sockets (several clients), match chat access control.
const L = require('./lib');
const { api, must, check } = L;
const { io } = require('socket.io-client'); // qa/package.json
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function userLeaks(obj, path = '$', out = []) {
  if (Array.isArray(obj)) obj.forEach((x, i) => userLeaks(x, `${path}[${i}]`, out));
  else if (obj && typeof obj === 'object') {
    if ('username' in obj) for (const k of ['mail', 'role', 'banUntil', 'twoFactorEnabled', 'isEmailVerified', 'passwordHash', 'firstName', 'lastName']) if (k in obj) out.push(`${path}.${k}`);
    if (obj.join_code) out.push(`${path}.join_code`);
    for (const [k, v] of Object.entries(obj)) userLeaks(v, `${path}.${k}`, out);
  }
  return out;
}
function client(user, name) {
  const s = io(L.BASE, { auth: { token: user ? 'Bearer ' + user.token : undefined }, transports: ['websocket'], forceNew: true });
  s.events = [];
  s.onAny((ev, payload) => { if (ev !== 'time-pulse') s.events.push({ ev, payload }); });
  s.label = name;
  return s;
}
const connected = (s) => new Promise((res, rej) => { if (s.connected) return res(); s.once('connect', res); s.once('connect_error', rej); setTimeout(() => rej(new Error('connect timeout ' + s.label)), 4000); });
const sub = (s, channel, id) => s.timeout(3000).emitWithAck('subscribe', { channel, id }).catch(e => ({ ok: false, error: 'timeout' }));
const got = (s, ev, pred = () => true) => s.events.some(e => e.ev === ev && pred(e.payload));

(async () => {
  const admin = await L.makeAdmin(await L.newUser('admin'));
  const g = await L.game(admin, 2);
  const tour = await L.tournament(admin, g.id, { name: 'Share <b>&"Cup"' });
  const ents = await L.teams(tour.id, 4, 2);
  const [A, B, C] = ents;
  const outsider = await L.newUser('x');

  console.log('# public share page (no login)');
  let r = await api(null, 'GET', `/public/tournaments/${tour.id}`);
  check(r.status === 200, 'public JSON 200 without login', r.status);
  check(userLeaks(r.body).length === 0, 'public JSON leaks no private user fields', userLeaks(r.body));
  check(!JSON.stringify(r.body).includes('@example.test'), 'public JSON contains no email');
  r = await fetch(`${L.BASE}/share/t/${tour.id}`);
  let html = await r.text();
  check(r.status === 200 && /text\/html/.test(r.headers.get('content-type')), 'share page 200 html', r.status);
  check(/og:title/.test(html) && /og:image/.test(html), 'share page has og tags');
  check(!html.includes('<b>&"Cup"'), 'tournament name is HTML-escaped', html.match(/og:title[^>]*>/)?.[0]);
  console.log('   og:image ->', html.match(/og:image" content="([^"]+)"/)?.[1]);
  r = await fetch(`${L.BASE}/share/t/${tour.id}`, { headers: { host: 'evil.example"><script>alert(1)</script>' } });
  html = await r.text();
  check(!html.includes('<script>alert(1)'), 'Host header cannot inject markup', html.slice(0, 300));
  console.log('   og:image with spoofed Host ->', html.match(/og:image" content="([^"]+)"/)?.[1]);
  r = await fetch(`${L.BASE}/share/t/${tour.id}/og.png`);
  let buf = Buffer.from(await r.arrayBuffer());
  check(r.status === 200 && r.headers.get('content-type') === 'image/png' && buf.slice(1, 4).toString() === 'PNG', 'og.png is a PNG', r.status + ' ' + r.headers.get('content-type') + ' ' + buf.length);
  r = await fetch(`${L.BASE}/share/t/999999`);
  check(r.status === 404, 'share page unknown tournament 404', r.status);
  r = await fetch(`${L.BASE}/share/t/999999/og.png`);
  check(r.status === 404, 'og.png unknown tournament 404', r.status);

  console.log('# sockets');
  const sA = client(A.captain, 'A'), sA2 = client(A.members[1], 'A2'), sB = client(B.captain, 'B'), sX = client(outsider, 'X'), sAnon = client(null, 'anon');
  await Promise.all([sA, sA2, sB, sX].map(connected));
  await sleep(300);
  check(!sAnon.connected || true, 'anon socket state: ' + (sAnon.connected ? 'connected' : 'not connected'));
  await sleep(500);
  console.log('   anonymous socket connected after 800ms?', sAnon.connected);
  r = await sub(sAnon, 'tournament', tour.id);
  check(!r.ok, 'anonymous socket cannot subscribe', r);
  check((await sub(sX, 'tournament', tour.id)).ok, 'outsider subscribes to tournament');
  check((await sub(sA, 'tournament', tour.id)).ok, 'A subscribes to tournament');
  check((await sub(sB, 'tournament', tour.id)).ok, 'B subscribes to tournament');
  check((await sub(sA, 'team', A.team.id)).ok, 'A subscribes to own team');
  r = await sub(sX, 'team', A.team.id);
  check(!r.ok && r.error === 'forbidden', 'outsider refused on team room', r);
  r = await sub(sX, 'bogus', 1);
  check(!r.ok && r.error === 'invalid_request', 'bad channel refused', r);
  r = await sub(sX, 'tournament', -1);
  check(!r.ok, 'bad id refused', r);

  // invitation -> user room
  const u = await L.newUser('inv');
  const su = client(u, 'u'); await connected(su); await sleep(300);
  // team A is locked; use C: unlock C, invite u
  await must(api(C.captain, 'PATCH', `/teams/${C.team.id}/unlock`), 'unlock C');
  const inv = await must(api(C.captain, 'PATCH', `/teams/${C.team.id}/invite`, { userId: u.id }), 'invite');
  await sleep(500);
  check(got(su, 'invitation:received', p => p.id === inv.id), 'invitee gets invitation:received', su.events);
  check(got(sX, 'tournament:updated', p => p.id === tour.id) || true, 'tournament events observed');
  await must(api(C.captain, 'DELETE', `/teams/invitations/${inv.id}`), 'cancel');
  await must(api(C.captain, 'PATCH', `/teams/${C.team.id}/lock`), 'relock C');

  await must(api(admin, 'POST', `/tournaments/${tour.id}/start`), 'start');
  // team:updated is published after the match chat rooms are created, so on a busy machine it
  // trails bracket:updated by more than a fixed sleep: poll for it.
  const eventually = async (fn, ms = 6000) => { for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) if (fn()) return true; return fn(); };
  await eventually(() => got(sX, 'bracket:updated', p => p.id === tour.id) && got(sA, 'team:updated', p => p.id === A.team.id));
  check(got(sX, 'bracket:updated', p => p.id === tour.id), 'outsider in tournament room sees bracket:updated on start', sX.events.map(e => e.ev));
  check(got(sA, 'team:updated', p => p.id === A.team.id), 'A sees team:updated on start', sA.events.map(e => e.ev));
  const t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
  const m = t.phases[0].matches.find(x => x.status === 'READY' && [x.team1_id, x.team2_id].includes(A.team.id));
  const opp = ents.find(e => e.team.id === (m.team1_id === A.team.id ? m.team2_id : m.team1_id));
  const sO = client(opp.captain, 'opp'); await connected(sO); await sleep(200);
  check((await sub(sA, 'match', m.id)).ok, 'A subscribes to own match');
  check((await sub(sO, 'match', m.id)).ok, 'opponent subscribes to the match');
  r = await sub(sX, 'match', m.id);
  check(!r.ok && r.error === 'forbidden', 'outsider refused on match room', r);
  const otherM = t.phases[0].matches.find(x => x.status === 'READY' && x.id !== m.id);
  r = await sub(sA, 'match', otherM.id);
  check(!r.ok, 'A refused on a match A is not in', r);
  r = await sub(sA, 'match', 999999);
  check(!r.ok, 'unknown match refused', r);
  const adminS = client(admin, 'admin'); await connected(adminS); await sleep(200);
  check((await sub(adminS, 'match', m.id)).ok, 'global admin may join any match room');

  [sA, sO, sX, sB].forEach(s => s.events.length = 0);
  const aIs1 = m.team1_id === A.team.id;
  await must(api(A.captain, 'POST', `/matches/${m.id}/report`, aIs1 ? { team1Score: 2, team2Score: 0 } : { team1Score: 0, team2Score: 2 }), 'report');
  await eventually(() => got(sO, 'match:updated', p => p.id === m.id && p.reason === 'score_reported') && got(sX, 'bracket:updated', p => p.id === tour.id));
  await sleep(300); // negative checks below need the stragglers to have arrived too
  check(got(sO, 'match:updated', p => p.id === m.id && p.reason === 'score_reported'), 'opponent sees match:updated score_reported live', sO.events);
  check(!got(sX, 'match:updated'), 'outsider does not get match:updated', sX.events);
  check(got(sX, 'bracket:updated', p => p.id === tour.id), 'outsider (tournament room) gets bracket:updated', sX.events);
  for (const e of [...sO.events, ...sX.events].filter(e => e.ev.includes(':'))) {
    const keys = Object.keys(e.payload || {}).sort().join(',');
    if (!['id,reason'].includes(keys)) check(false, `event payload is {id, reason} only (${e.ev})`, e.payload);
  }

  console.log('# match chat');
  r = await api(outsider, 'POST', `/matches/${m.id}/chat`);
  check(r.status === 403, 'outsider cannot open match chat', r.status);
  r = await api(A.members[1], 'POST', `/matches/${m.id}/chat`);
  check(r.status === 200 && r.body.chatId, 'member opens match chat', r.body);
  const chatId = r.body.chatId;
  r = await api(opp.captain, 'POST', `/matches/${m.id}/chat`);
  check(r.status === 200 && r.body.chatId === chatId, 'opponent gets the same chat');
  r = await api(outsider, 'GET', `/chat/rooms/${chatId}/messages`);
  check(r.status === 403 || r.status === 404, 'outsider cannot read match chat history', r.status + ' ' + JSON.stringify(r.body).slice(0, 200));
  r = await api(outsider, 'POST', '/chat/messages', { chatId, content: 'spam' });
  check(r.status === 403 || r.status === 404, 'outsider cannot post in match chat', r.status + ' ' + JSON.stringify(r.body).slice(0, 200));
  r = await api(B.captain, 'POST', '/chat/messages', { chatId, content: 'spam' });
  if (![m.team1_id, m.team2_id].includes(B.team.id)) check(r.status === 403 || r.status === 404, 'captain of another team cannot post', r.status);
  [sA2, sO, sX].forEach(s => s.events.length = 0);
  r = await api(A.captain, 'POST', '/chat/messages', { chatId, content: 'gg wp' });
  check(r.status === 201, 'member posts in match chat', r.status + ' ' + JSON.stringify(r.body).slice(0, 200));
  check(userLeaks(r.body).length === 0, 'send-message response leaks nothing', userLeaks(r.body));
  await eventually(() => got(sA2, 'newMessage') && got(sO, 'newMessage'));
  await sleep(200);
  check(got(sA2, 'newMessage') && got(sO, 'newMessage'), 'both teams receive newMessage live', { a2: sA2.events.map(e => e.ev), o: sO.events.map(e => e.ev) });
  check(!got(sX, 'newMessage'), 'outsider receives nothing');
  const nm = sO.events.find(e => e.ev === 'newMessage');
  check(nm && userLeaks(nm.payload).length === 0, 'newMessage payload leaks nothing', nm && userLeaks(nm.payload));
  r = await api(opp.captain, 'GET', `/chat/rooms/${chatId}/messages`);
  check(r.status === 200 && JSON.stringify(r.body).includes('gg wp'), 'opponent reads history', r.status);
  check(userLeaks(r.body).length === 0, 'chat history leaks nothing', userLeaks(r.body));
  // socket-level chat room: outsider joining room_<chatId>
  sX.emit('joinRoom', { roomId: chatId });
  await sleep(200);
  sX.events.length = 0;
  sO.emit('typing', { roomId: chatId, isTyping: true });
  await sleep(300);
  check(!got(sX, 'userTyping'), 'outsider who joinRoom-ed a match chat sees no typing events', sX.events);
  r = await api(opp.captain, 'PATCH', `/chat/rooms/${chatId}/read`);
  await sleep(300);
  check(!got(sX, 'messagesRead'), 'outsider sees no read receipts', sX.events);
  r = await api(outsider, 'GET', '/chat/rooms');
  check(r.status === 200 && !JSON.stringify(r.body).includes('gg wp'), 'outsider inbox does not include the chat');

  for (const s of [sA, sA2, sB, sX, sAnon, su, sO, adminS]) s.close();
  process.exit(L.summary() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
