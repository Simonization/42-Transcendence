// Probe the running app's i18n instance. usage: node t12-i18n-probe.js <url>
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto(process.argv[2]);
  await p.waitForTimeout(1500);
  const out = await p.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const g = app.config.globalProperties;
    const i18n = g.$i18n;
    const msgs = i18n.messages?.value ?? i18n.messages;
    const en = msgs?.en;
    let direct; try { direct = g.$t('auth.login'); } catch (e) { direct = 'THROW ' + e; }
    return {
      locale: i18n.locale?.value ?? i18n.locale,
      localesLoaded: Object.keys(msgs || {}),
      enTopKeys: en ? Object.keys(en).slice(0, 8) : null,
      authLoginType: en && en.auth ? typeof en.auth.login : 'no auth',
      authLoginValue: en && en.auth ? JSON.stringify(en.auth.login).slice(0, 200) : null,
      t: direct,
      te: i18n.te ? i18n.te('auth.login') : 'n/a',
      i18nKeys: Object.keys(i18n).slice(0, 40),
      gm: (() => { try { const m = (i18n.getLocaleMessage || i18n.global?.getLocaleMessage)?.('en'); return m ? { keys: Object.keys(m).length, login: JSON.stringify(m.auth?.login).slice(0, 200) } : 'none'; } catch (e) { return 'THROW ' + e; } })(),
      tm: (() => { try { return JSON.stringify(i18n.tm ? i18n.tm('auth') : null).slice(0, 200); } catch (e) { return 'THROW ' + e; } })(),
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
