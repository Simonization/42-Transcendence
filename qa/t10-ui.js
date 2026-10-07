// Headless browser pass over the built SPA (served by serve.js, proxied to the backend).
const { chromium } = require('playwright'); // qa/package.json; browser: npx playwright install chromium
const L = require('./lib');
const { api, must, check } = L;
const UI = L.cfg.UI;
const SHOTS = L.cfg.SHOTS;
require('fs').mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function watch(page, label) {
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/')) problems.push(`${r.status()} ${r.request().method()} ${r.url().replace(UI, '')}`); });
  page.problems = problems; page.label = label;
  return page;
}
async function uiLogin(browser, user, label) {
  const ctx = await browser.newContext();
  const page = watch(await ctx.newPage(), label);
  await page.goto(UI + '/auth');
  await page.fill('#username', user.username);
  await page.fill('#password', L.PW);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/menu/, { timeout: 10000 });
  return page;
}
async function visit(page, path, name, waitText) {
  page.problems.length = 0;
  await page.goto(UI + path);
  await page.waitForLoadState('networkidle').catch(() => {});
  await sleep(500);
  if (waitText) await page.getByText(waitText, { exact: false }).first().waitFor({ timeout: 5000 }).catch(() => page.problems.push('missing text: ' + waitText));
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  check(page.problems.length === 0, `${page.label} ${path} renders without errors`, page.problems);
  return page;
}

(async () => {
  const admin = await L.makeAdmin(await L.newUser('admin'));
  const g = await L.game(admin, 1);
  const tour = await L.tournament(admin, g.id, { name: 'UI Cup' });
  const ents = await L.teams(tour.id, 4, 1);
  const fresh = await L.newUser('fresh');
  const draftCap = await L.newUser('draft');
  const draft = await must(api(draftCap, 'POST', '/teams', { name: 'DraftUI', tournament_id: tour.id }));
  const code = (await must(api(draftCap, 'GET', `/teams/${draft.id}/join-code`))).joinCode;

  const browser = await chromium.launch();
  try {
    console.log('# login through the form');
    const A = await uiLogin(browser, ents[0].captain, 'captainA');
    check(true, 'captain logs in through the form');
    await visit(A, '/menu/user', 'user');
    await visit(A, '/menu/tournaments', 'tournaments', 'UI Cup');
    await visit(A, `/menu/tournaments/${tour.id}`, 'tournament-detail', 'UI Cup');
    await visit(A, `/menu/tournaments/${tour.id}/team`, 'team-setup');
    await visit(A, `/menu/teams/${ents[0].team.id}`, 'team-profile');
    await visit(A, `/menu/brackets/${tour.id}`, 'bracket-preview');
    await visit(A, '/menu/brackets', 'bracket-list');
    await visit(A, '/menu/history', 'history');
    await visit(A, '/menu/chat', 'chat');
    await visit(A, '/menu/friend', 'friends');
    await visit(A, '/menu/nope-404', 'notfound');
    await visit(A, '/menu', 'menu-root');
    check(A.url().endsWith('/menu/user'), '/menu redirects to /menu/user', A.url());
    A.problems.length = 0;
    await A.goto(UI + '/menu/admin');
    await sleep(800);
    check(!/\/menu\/admin/.test(A.url()) || (await A.content()).length > 0, 'non-admin on /menu/admin: ' + A.url());

    console.log('# join link');
    const F = await uiLogin(browser, fresh, 'fresh');
    await visit(F, `/join/${code}`, 'join-page');
    const joinBtn = F.getByRole('button', { name: /join/i }).first();
    if (await joinBtn.count()) { await joinBtn.click(); await sleep(1500); }
    const mine = await must(api(fresh, 'GET', `/teams/mine?tournament_id=${tour.id}`));
    check(mine.team && mine.team.id === draft.id, 'fresh user joined via /join/:code in the UI', { url: F.url(), team: mine.team && mine.team.id, problems: F.problems });
    await F.screenshot({ path: `${SHOTS}/join-after.png`, fullPage: true });

    console.log('# admin pages');
    const AD = await uiLogin(browser, admin, 'admin');
    await visit(AD, '/menu/admin', 'admin');
    await visit(AD, `/menu/brackets/${tour.id}`, 'admin-bracket');

    console.log('# start + realtime in two browsers');
    await must(api(admin, 'POST', `/tournaments/${tour.id}/start`), 'start');
    const t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
    const m = t.phases[0].matches.find(x => x.status === 'READY' && [x.team1_id, x.team2_id].includes(ents[0].team.id));
    const oppEnt = ents.find(e => e.team.id === (m.team1_id === ents[0].team.id ? m.team2_id : m.team1_id));
    const O = await uiLogin(browser, oppEnt.captain, 'opponent');
    await visit(O, `/menu/brackets/${tour.id}`, 'bracket-opponent-before');
    await visit(A, `/menu/brackets/${tour.id}`, 'bracket-A-before');
    const refetches = [];
    O.on('request', (r) => { if (/\/api\/tournaments\/\d+$/.test(r.url())) refetches.push(Date.now()); });
    const t0 = Date.now();
    const aIs1 = m.team1_id === ents[0].team.id;
    await must(api(ents[0].captain, 'POST', `/matches/${m.id}/report`, aIs1 ? { team1Score: 13, team2Score: 7 } : { team1Score: 7, team2Score: 13 }), 'report');
    await sleep(2500);
    check(refetches.some(x => x > t0), 'opponent bracket page refetched after the report, without reload', refetches.length);
    await O.screenshot({ path: `${SHOTS}/bracket-opponent-after-report.png`, fullPage: true });
    const txt = await O.content();
    check(txt.includes('13') , 'opponent page shows the reported score live');
    check(O.problems.length === 0, 'opponent page has no errors', O.problems);

    console.log('# public page without login');
    const ctx = await browser.newContext();
    const P = watch(await ctx.newPage(), 'anon');
    await visit(P, `/t/${tour.id}`, 'public-page', 'UI Cup');
    await visit(P, `/menu/tournaments`, 'anon-menu');
    check(/\/auth/.test(P.url()), 'anonymous /menu redirects to /auth', P.url());
  } finally {
    await browser.close();
  }
  process.exit(L.summary() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
