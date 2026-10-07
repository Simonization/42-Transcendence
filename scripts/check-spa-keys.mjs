#!/usr/bin/env node
/*
 * check-spa-keys.mjs — "would raw i18n keys show up in the built SPA?" (no new dependencies).
 *
 *   node scripts/check-spa-keys.mjs [--dist frontend/dist] [--skip-dist]
 *
 * Run it AFTER `npm run build` in frontend/. It reuses packages the frontend already installs
 * (@intlify/message-compiler), so run it after `npm ci` there.
 *
 * What it checks
 *   1. SOURCE   every literal key passed to t('a.b') / $t('a.b') / te() / tc() in frontend/src
 *               (tests excluded) exists in en.json; a template key t(`a.${x}`) needs at least one
 *               en key under the prefix "a.". A missing key renders as the raw key text.
 *   2. COMPILE  every message of en/fr/tr compiles with vue-i18n's own message compiler. A message
 *               that fails (a stray "@" as in an e-mail address, an unbalanced "{", a lone "|"
 *               misuse) is shown to the user as the raw key, in prod, with no build error.
 *   3. DIST     the built bundle (frontend/dist) is intact and can actually translate:
 *               index.html and every asset it references exist; the JS contains the vue-i18n
 *               message compiler (runtime-only builds cannot compile JSON string messages, which
 *               shows every key raw); and the en/fr/tr messages (a set of required keys plus every
 *               plain-ASCII message) are present verbatim in the shipped JS.
 *   4. BROWSER  (opt-in, E2E=1) serves dist, opens /login in headless Chromium and fails if any
 *               visible text looks like a raw key. Needs Playwright with a Chromium browser; skipped
 *               with a notice when unavailable (set PLAYWRIGHT_PATH to a dir containing it).
 *
 * What it can NOT catch
 *   - Dynamic keys that are not template literals (t(someVariable), keys stored in objects such as
 *     { labelKey: 'x.y' } and translated later) — only literal t('...') calls are verified.
 *   - Template keys beyond the prefix: t(`join.blocker.${p}`) only proves some join.blocker.* exists,
 *     not that every runtime value of ${p} has an entry.
 *   - Runtime state: wrong locale selected, messages overridden/loaded lazily, fallback behaviour.
 *   - Without E2E=1 nothing is actually rendered: a page that fails to boot for another reason
 *     still passes the static checks. E2E=1 only looks at /login (what an unauthenticated visitor sees).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { flatten, LOCALES, parseJsonStrict } from './check-i18n.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');
const LOCALE_DIR = join(FRONTEND, 'src', 'i18n', 'locales');

/** Keys that must be translatable on the pages every visitor sees. */
export const REQUIRED_KEYS = ['auth.signIn', 'auth.createAccount', 'auth.email', 'auth.password', 'common.create'];

/**
 * Messages that already fail to compile on main but are referenced nowhere in the source (checked by
 * grep when this was written), so nothing renders them. Warned about, not failed. Delete the entry
 * when the key is fixed or removed; never add a key that the UI actually uses.
 */
const KNOWN_UNCOMPILABLE = new Set();

// ---------------------------------------------------------------- helpers (exported for tests)

/** Literal and template i18n keys used in a source file. */
export function extractKeys(source) {
    const literal = new Set();
    const prefixes = new Set();
    const call = /(?<![\w.$])\$?t[ce]?\(\s*(['"`])([A-Za-z][\w.-]*?)(\1|\$\{)/g;
    for (const m of source.matchAll(call)) {
        if (m[3] === '${') {
            if (m[1] === '`') prefixes.add(m[2]);
        } else if (m[2].includes('.') || m[1] !== '`') {
            literal.add(m[2]);
        }
    }
    return { literal, prefixes };
}

/** Does a "raw key" such as auth.signIn or common.cancel show up as visible text? */
export function looksLikeRawKey(text, knownNamespaces) {
    return text
        .split(/\s+/)
        .some((w) => /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/.test(w) && knownNamespaces.has(w.split('.')[0]));
}

// ---------------------------------------------------------------- checks

function loadLocales() {
    const flat = {};
    for (const l of LOCALES) {
        flat[l] = flatten(parseJsonStrict(readFileSync(join(LOCALE_DIR, `${l}.json`), 'utf8')).value);
    }
    return flat;
}

function walk(dir, files = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
            if (name === '__tests__' || name === 'node_modules') continue;
            walk(p, files);
        } else if (/\.(vue|ts)$/.test(name) && !/\.(spec|test)\.ts$/.test(name) && !name.endsWith('.d.ts')) {
            files.push(p);
        }
    }
    return files;
}

function checkSource(en) {
    const errors = [];
    const enKeys = [...en.keys()];
    for (const file of walk(join(FRONTEND, 'src'))) {
        const rel = file.slice(ROOT.length + 1).split(sep).join('/');
        const { literal, prefixes } = extractKeys(readFileSync(file, 'utf8'));
        for (const k of literal) if (!en.has(k)) errors.push(`${rel}: key "${k}" is not in en.json`);
        for (const p of prefixes) if (!enKeys.some((k) => k.startsWith(p))) errors.push(`${rel}: no en.json key under prefix "${p}"`);
    }
    return errors;
}

function checkCompile(flat) {
    const require = createRequire(join(FRONTEND, 'package.json'));
    let baseCompile;
    try {
        ({ baseCompile } = require('@intlify/message-compiler'));
    } catch (e) {
        return [`cannot load @intlify/message-compiler from frontend/node_modules (run npm ci in frontend/): ${e.message}`];
    }
    const errors = [];
    for (const locale of LOCALES) {
        for (const [key, msg] of flat[locale]) {
            if (typeof msg !== 'string') continue;
            const problems = [];
            try {
                baseCompile(msg, { location: false, mode: 'arrow', onError: (e) => problems.push(e.message) });
            } catch (e) {
                problems.push(e.message);
            }
            if (problems.length && KNOWN_UNCOMPILABLE.has(key)) {
                console.warn(`check-spa-keys: warning: [${locale}] ${key} does not compile (known, unused key; fix: write the "@" as {'@'} or delete the key)`);
            } else if (problems.length) errors.push(`[${locale}] ${key}: message does not compile (${problems[0]}): ${JSON.stringify(msg)}`);
        }
    }
    return errors;
}

function checkDist(dist, flat) {
    const errors = [];
    const indexPath = join(dist, 'index.html');
    if (!existsSync(indexPath)) return [`${dist}/index.html not found (run "npm run build" in frontend/ first)`];
    const html = readFileSync(indexPath, 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="(\/?assets\/[^"]+)"/g)].map((m) => m[1].replace(/^\//, ''));
    if (!refs.some((r) => r.endsWith('.js'))) errors.push('index.html references no JS bundle');
    for (const r of refs) if (!existsSync(join(dist, r))) errors.push(`index.html references missing asset ${r}`);

    const assetsDir = join(dist, 'assets');
    const jsFiles = existsSync(assetsDir) ? readdirSync(assetsDir).filter((f) => f.endsWith('.js')) : [];
    const js = jsFiles.map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');
    if (!js) return [...errors, 'no JS found in dist/assets'];

    // vue-i18n's message compiler is what turns the JSON strings into functions. The runtime-only
    // build (vue-i18n.runtime.*) lacks it and only accepts pre-compiled messages -> every key shows
    // raw. Minification keeps string literals, and the compiler's code generator contains
    // "function __msg__ (ctx) {" and "message.intl", which the runtime-only build does not (verified
    // against vue-i18n 11.4 by diffing the two dist builds). If a vue-i18n upgrade moves these,
    // this check fails loudly: re-derive the fingerprint rather than deleting it.
    for (const marker of ['function __msg__ (ctx) {', 'message.intl']) {
        if (!js.includes(marker)) errors.push(`the built JS lacks the vue-i18n message compiler (marker ${JSON.stringify(marker)} not found; runtime-only vue-i18n build?)`);
    }

    for (const locale of LOCALES) {
        const msgs = flat[locale];
        for (const k of REQUIRED_KEYS) {
            const v = msgs.get(k);
            if (typeof v !== 'string') errors.push(`[${locale}] required key ${k} missing from locale file`);
            else if (!js.includes(v) && !js.includes(escapeNonAscii(v))) errors.push(`[${locale}] ${k} = ${JSON.stringify(v)} not found in the built JS`);
        }
        let checked = 0;
        const absent = [];
        for (const [k, v] of msgs) {
            if (typeof v !== 'string' || v.length < 6 || !/^[\x20-\x7e]+$/.test(v) || /["'\\`<>&]/.test(v)) continue;
            checked++;
            if (!js.includes(v)) absent.push(k);
        }
        if (absent.length) errors.push(`[${locale}] ${absent.length}/${checked} plain messages missing from the built JS, e.g. ${absent.slice(0, 5).join(', ')}`);
    }
    return errors;
}

function escapeNonAscii(s) {
    return s.replace(/[^\x20-\x7e]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' };

async function checkBrowser(dist, flat) {
    const require = createRequire(join(process.env.PLAYWRIGHT_PATH || FRONTEND, 'package.json'));
    let chromium;
    try {
        ({ chromium } = require('playwright'));
    } catch {
        try {
            ({ chromium } = require('@playwright/test'));
        } catch {
            console.log('check-spa-keys: BROWSER check skipped (E2E=1 but Playwright is not installed; set PLAYWRIGHT_PATH to a directory that has it)');
            return [];
        }
    }
    const server = createServer((req, res) => {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        let file = join(dist, urlPath);
        if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html'); // SPA fallback
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(readFileSync(file));
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    const namespaces = new Set([...flat.en.keys()].map((k) => k.split('.')[0]));
    const errors = [];
    let browser;
    try {
        browser = await chromium.launch();
    } catch (e) {
        server.close();
        console.log(`check-spa-keys: BROWSER check skipped (Chromium cannot launch: ${e.message.split('\n')[0]})`);
        return [];
    }
    try {
        for (const locale of LOCALES) {
            const ctx = await browser.newContext({ locale });
            await ctx.addInitScript((l) => localStorage.setItem('locale', l), locale);
            const page = await ctx.newPage();
            const pageErrors = [];
            page.on('pageerror', (e) => pageErrors.push(e.message));
            await page.goto(`http://127.0.0.1:${port}/login`, { waitUntil: 'networkidle' });
            const text = await page.evaluate(() => document.body.innerText);
            const attrs = await page.evaluate(() => [...document.querySelectorAll('[placeholder],[title],[aria-label]')].map((e) => [e.getAttribute('placeholder'), e.getAttribute('title'), e.getAttribute('aria-label')].filter(Boolean).join(' ')).join(' '));
            if (!text.trim()) errors.push(`[${locale}] /login rendered no text`);
            const expected = ['auth.signIn', 'auth.email', 'auth.password'].map((k) => flat[locale].get(k)).filter(Boolean);
            const lower = (text + ' ' + attrs).toLowerCase();
            if (text.trim() && !expected.some((m) => lower.includes(m.toLowerCase()))) errors.push(`[${locale}] /login shows none of the expected translated labels (${expected.join(' / ')}): ${JSON.stringify(text.slice(0, 200))}`);
            if (looksLikeRawKey(text + ' ' + attrs, namespaces)) errors.push(`[${locale}] /login shows a raw i18n key: ${JSON.stringify(text.slice(0, 200))}`);
            for (const e of pageErrors) errors.push(`[${locale}] /login page error: ${e}`);
            await ctx.close();
        }
    } finally {
        await browser.close();
        server.close();
    }
    return errors;
}

// ---------------------------------------------------------------- main

async function main() {
    const argv = process.argv.slice(2);
    const di = argv.indexOf('--dist');
    const dist = resolve(di >= 0 ? argv[di + 1] : join(FRONTEND, 'dist'));
    const flat = loadLocales();

    const sections = [
        ['source', () => checkSource(flat.en)],
        ['compile', () => checkCompile(flat)],
    ];
    if (!argv.includes('--skip-dist')) sections.push(['dist', () => checkDist(dist, flat)]);
    if (process.env.E2E === '1' && !argv.includes('--skip-dist')) sections.push(['browser', () => checkBrowser(dist, flat)]);
    else console.log('check-spa-keys: BROWSER check not run (set E2E=1 to render /login in headless Chromium)');

    let failed = 0;
    for (const [name, run] of sections) {
        const errors = await run();
        if (errors.length) {
            failed += errors.length;
            console.error(`check-spa-keys: ${name.toUpperCase()} FAILED (${errors.length})`);
            for (const e of errors) console.error(`  ${e}`);
        } else {
            console.log(`check-spa-keys: ${name} ok`);
        }
    }
    if (failed) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
