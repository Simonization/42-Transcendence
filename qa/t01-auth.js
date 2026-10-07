const L = require('./lib');
const { api, check } = L;
const PRIVATE = ['mail', 'passwordHash', 'password_hash', 'twoFactorCode', 'verificationToken', 'role', 'status', 'banUntil', 'twoFactorEnabled', 'firstName', 'lastName', 'isEmailVerified'];
function leaks(obj, path = '$', out = []) {
  if (Array.isArray(obj)) obj.forEach((x, i) => leaks(x, `${path}[${i}]`, out));
  else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (['passwordHash', 'password_hash', 'twoFactorCode', 'verificationToken'].includes(k)) out.push(`${path}.${k}`);
      leaks(v, `${path}.${k}`, out);
    }
  }
  return out;
}
(async () => {
  console.log('# register/verify/login');
  const name = 'auth' + Date.now() % 100000;
  let r = await api(null, 'POST', '/auth/register', { username: name, mail: name + '@example.test', password: L.PW });
  check(r.status === 201, 'register 201', r.body);
  check(!JSON.stringify(r.body).includes('verificationToken'), 'register response has no token');
  r = await api(null, 'POST', '/auth/login', { username: name, password: L.PW });
  check(r.status === 401, 'login before verify refused 401', r);
  r = await api(null, 'POST', '/auth/register', { username: name, mail: name + '2@example.test', password: L.PW });
  check(r.status === 409 || r.status === 400, 'duplicate username refused', r.status + ' ' + JSON.stringify(r.body));
  r = await api(null, 'POST', '/auth/register', { username: name + 'x', mail: name + '@example.test', password: L.PW });
  check(r.status === 409 || r.status === 400, 'duplicate mail refused', r.status + ' ' + JSON.stringify(r.body));
  r = await api(null, 'GET', '/auth/verify-email?token=bogus');
  check(r.status === 400, 'bogus verification token 400');
  const m = await L.waitMail(x => x.includes(`To: ${name}@example.test`));
  const tok = m.match(/verify-email\?token=([A-Za-z0-9_\-]+)/)[1];
  r = await api(null, 'GET', '/auth/verify-email?token=' + tok);
  check(r.status === 200, 'verify 200', r.body);
  r = await api(null, 'GET', '/auth/verify-email?token=' + tok);
  check(r.status === 400, 'token single-use');
  r = await api(null, 'POST', '/auth/login', { username: name, password: 'wrongpassword' });
  check(r.status === 400 || r.status === 401, 'wrong password refused');
  r = await api(null, 'POST', '/auth/login', { username: name, password: L.PW });
  check(r.status === 201 && r.body.accessToken, 'login ok', r.body);
  const user = { id: r.body.user.id, token: r.body.accessToken, refresh: r.body.refreshToken };
  r = await api(user, 'GET', '/users/me');
  check(r.status === 200 && r.body.username === name, '/users/me', r.body);
  check(leaks(r.body).length === 0, '/users/me leaks no secrets', leaks(r.body));
  r = await api(null, 'POST', '/auth/refresh', { refreshToken: user.refresh });
  check(r.status === 201 && r.body.accessToken, 'refresh ok', r.body);
  r = await api(user, 'POST', '/auth/login', { username: name, password: L.PW });
  check(r.status === 400, 'login while logged in refused');

  console.log('# 2FA');
  r = await api(user, 'POST', '/auth/2fa/enable');
  check(r.status === 201, '2fa enable', r.body);
  let mm = await L.waitMail(x => x.includes(`To: ${name}@example.test`) && x.includes('2FA'));
  let code = mm.match(/>\s*(\d{6})\s*</)[1];
  r = await api(user, 'POST', '/auth/2fa/confirm', { code: '000000' === code ? '111111' : '000000' });
  check(r.status === 400, '2fa confirm wrong code refused');
  r = await api(user, 'POST', '/auth/2fa/confirm', { code });
  check(r.status === 201, '2fa confirm', r.body);
  const before = L.mails().length;
  r = await api(null, 'POST', '/auth/login', { username: name, password: L.PW });
  check(r.status === 201 && r.body.requiresTwoFactor && !r.body.accessToken, 'login asks for 2fa, no token', r.body);
  const uid = r.body.userId;
  mm = await L.waitMail(x => x.includes(`To: ${name}@example.test`) && x.includes('2FA'));
  await new Promise(r => setTimeout(r, 300));
  const all = L.mails().filter(x => x.includes(`To: ${name}@example.test`) && x.includes('2FA'));
  code = all[all.length - 1].match(/>\s*(\d{6})\s*</)[1];
  r = await api(null, 'POST', '/auth/2fa/verify', { userId: uid, code: '123' });
  check(r.status === 400, '2fa verify wrong code refused');
  r = await api(null, 'POST', '/auth/2fa/verify', { userId: uid, code });
  check(r.status === 201 && r.body.accessToken, '2fa verify gives tokens', r.body);
  const t2 = r.body.accessToken;
  r = await api(null, 'POST', '/auth/2fa/verify', { userId: uid, code });
  check(r.status === 400, '2fa code single-use (replay refused)', r.status + ' ' + JSON.stringify(r.body).slice(0, 80));
  r = await api(t2, 'POST', '/auth/2fa/disable');
  check(r.status === 201, '2fa disable');
  r = await api(null, 'POST', '/auth/login', { username: name, password: L.PW });
  check(r.status === 201 && r.body.accessToken, 'login without 2fa after disable');
  user.token = r.body.accessToken;

  console.log('# private fields');
  const other = await L.newUser('o');
  r = await api(other, 'GET', '/users/search?q=' + name);
  check(r.status === 200, 'search 200');
  const s = JSON.stringify(r.body);
  check(!s.includes('@example.test'), 'search does not expose mail', r.body);
  check(leaks(r.body).length === 0, 'search leaks no secrets', leaks(r.body));
  r = await api(other, 'GET', '/users');
  check(r.status === 403, 'non-admin cannot list users');
  r = await api(other, 'PATCH', `/users/${user.id}/profile`, { bio: 'x' });
  check(r.status === 403, 'cannot edit someone else profile', r.status);
  r = await api(other, 'DELETE', `/users/${user.id}`);
  check(r.status === 403, 'cannot delete someone else', r.status);
  r = await api(other, 'PATCH', `/users/${user.id}`, { role: 2 });
  check(r.status === 403, 'non-admin cannot adminUpdate', r.status);
  process.exit(L.summary() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
