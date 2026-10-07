// Match loop and admin start driven by clicks in the built SPA.
const { chromium } = require('playwright'); // qa/package.json; browser: npx playwright install chromium
const L = require('./lib');
const { api, must, check } = L;
const UI = L.cfg.UI;
const SHOTS = L.cfg.SHOTS;
require('fs').mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function watch(page, label) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 160)}`); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/')) problems.push(`${r.status()} ${r.request().method()} ${r.url().replace(UI, '')}`); });
  page.problems = problems; page.label = label;
  return page;
}
async function uiLogin(browser, user, label) {
  const page = watch(await (await browser.newContext()).newPage(), label);
  await page.goto(UI + '/auth');
  await page.fill('#username', user.username);
  await page.fill('#password', L.PW);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/menu/, { timeout: 10000 });
  return page;
}
const card = (page, teamName) => page.locator('article.match-card', { hasText: teamName }).first();

(async () => {
  const admin = await L.makeAdmin(await L.newUser('admin'));
  const g = await L.game(admin, 2);
  const tour = await L.tournament(admin, g.id, { name: 'Click Cup ' + Date.now() % 1e4 });
  const [A, B] = await L.teams(tour.id, 2, 2);
  const draftCap = await L.newUser('dr');
  await must(api(draftCap, 'POST', '/teams', { name: 'Leftover', tournament_id: tour.id }));
  const browser = await chromium.launch();
  try {
    console.log('# admin starts the tournament from the admin UI');
    const AD = await uiLogin(browser, admin, 'admin');
    await AD.goto(UI + '/menu/admin');
    await AD.getByRole('button', { name: /tournaments/i }).first().click();
    await sleep(1000);
    const row = AD.locator('tr, li, article, div.tournament-row, .row').filter({ hasText: tour.name }).last();
    const startBtn = AD.getByRole('button', { name: /^start$/i });
    let clicked = false;
    // find the START button nearest to our tournament
    const rows = AD.locator(`:text("${tour.name}")`);
    if (await rows.count()) {
      const container = rows.first().locator('xpath=ancestor::*[.//button[normalize-space()="START" or normalize-space()="Start"]][1]');
      if (await container.count()) { await container.getByRole('button', { name: /^start$/i }).first().click(); clicked = true; }
    }
    if (!clicked && await startBtn.count() === 1) { await startBtn.click(); clicked = true; }
    check(clicked, 'found START for the tournament in the admin UI');
    await sleep(600);
    await AD.screenshot({ path: `${SHOTS}/admin-start-dialog.png`, fullPage: true });
    const dlgText = await AD.locator('[role=dialog], .confirm-dialog, .dialog').first().innerText().catch(() => '');
    check(/Leftover/.test(dlgText), 'start dialog lists the team that will be archived', dlgText.slice(0, 300));
    await AD.locator('[role=dialog], .confirm-dialog, .dialog').first().getByRole('button', { name: /start|confirm/i }).last().click();
    await sleep(1500);
    let t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
    check(t.status === 'ONGOING', 'tournament ONGOING after UI start', t.status);
    check(AD.problems.length === 0, 'admin UI had no errors', AD.problems);

    console.log('# captain A reports through the bracket UI, captain B confirms');
    const m = t.phases[0].matches[0];
    const PA = await uiLogin(browser, A.captain, 'A');
    const PB = await uiLogin(browser, B.captain, 'B');
    const PM = await uiLogin(browser, B.members[1], 'Bmember');
    for (const p of [PA, PB, PM]) { await p.goto(UI + `/menu/brackets/${tour.id}`); await p.waitForLoadState('networkidle'); await sleep(500); }
    await card(PM, A.team.name).click();
    await sleep(300);
    check(await PM.getByRole('button', { name: 'REPORT SCORE' }).count() === 0, 'plain member sees no REPORT SCORE');
    await card(PA, A.team.name).click();
    await sleep(300);
    const inputs = card(PA, A.team.name).locator('input.score-input');
    check(await inputs.count() === 2, 'captain A sees the score form');
    const aIs1 = m.team1_id === A.team.id;
    await inputs.nth(0).fill(aIs1 ? '3' : '1');
    await inputs.nth(1).fill(aIs1 ? '1' : '3');
    await card(PA, A.team.name).getByRole('button', { name: 'REPORT SCORE' }).click();
    await sleep(800);
    const dlgA = PA.locator('[role=dialog]');
    if (await dlgA.count()) await dlgA.getByRole('button').last().click();
    await sleep(1200);
    let mm = await must(api(admin, 'GET', `/matches/${m.id}`));
    check(mm.status === 'AWAITING_CONFIRMATION' && mm.reported_by_team_id === A.team.id, 'report reached the backend', mm);
    await PA.screenshot({ path: `${SHOTS}/ui-after-report.png`, fullPage: true });
    // B: without reload, the card should now offer CONFIRM
    await sleep(1000);
    if (!(await card(PB, A.team.name).getByRole('button', { name: 'CONFIRM' }).count())) await card(PB, A.team.name).click();
    await sleep(500);
    const confirmBtn = card(PB, A.team.name).getByRole('button', { name: 'CONFIRM' });
    check(await confirmBtn.count() === 1, 'captain B sees CONFIRM live (no reload)');
    await PB.screenshot({ path: `${SHOTS}/ui-b-before-confirm.png`, fullPage: true });
    await confirmBtn.click();
    await sleep(600);
    await PB.screenshot({ path: `${SHOTS}/ui-b-confirm-dialog.png`, fullPage: true });
    const dlgB = PB.locator('[role=dialog]');
    if (await dlgB.count()) await dlgB.getByRole('button', { name: /confirm/i }).last().click();
    await sleep(1500);
    t = await must(api(admin, 'GET', `/tournaments/${tour.id}`));
    check(t.status === 'COMPLETED' && t.podium && t.podium.first.teamId === A.team.id, 'UI confirm completes the tournament, A wins', { s: t.status, p: t.podium });
    await sleep(1000);
    await PA.screenshot({ path: `${SHOTS}/ui-a-after-complete.png`, fullPage: true });
    const txt = await PA.innerText('body');
    check(/podium|champion|winner|1st/i.test(txt), 'A page shows the result/podium live', txt.slice(0, 400));

    console.log('# match chat from the bracket');
    await card(PA, A.team.name).click().catch(() => {});
    await sleep(300);
    const chatBtn = PA.getByRole('button', { name: /chat/i }).first();
    if (await chatBtn.count()) {
      await chatBtn.click();
      await sleep(1500);
      check(/\/menu\/chat/.test(PA.url()), 'match chat button opens the chat page', PA.url());
      await PA.screenshot({ path: `${SHOTS}/ui-match-chat.png`, fullPage: true });
    } else check(false, 'match chat button present on a finished match card');
    for (const p of [PA, PB, PM]) check(p.problems.filter(x => !/409|403/.test(x)).length === 0, `${p.label} page had no errors`, p.problems);
  } finally {
    await browser.close();
  }
  process.exit(L.summary() ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
