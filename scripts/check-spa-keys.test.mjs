// Run with: node --test scripts/check-spa-keys.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractKeys, looksLikeRawKey } from './check-spa-keys.mjs';

test('extractKeys finds literal keys in t(), $t(), te() and tc()', () => {
    const src = `
        <h1>{{ $t('auth.signIn') }}</h1>
        const a = t("common.cancel"); const b = te('x.y'); const c = tc(\`plural.items\`, n);
        label: t( 'friends.title' )
    `;
    assert.deepEqual([...extractKeys(src).literal].sort(), ['auth.signIn', 'common.cancel', 'friends.title', 'plural.items', 'x.y']);
});

test('extractKeys reports template-literal keys as prefixes', () => {
    const { literal, prefixes } = extractKeys('t(`join.blocker.${p.blocker}`) + t(`ok.key`)');
    assert.deepEqual([...prefixes], ['join.blocker.']);
    assert.deepEqual([...literal], ['ok.key']);
});

test('extractKeys ignores things that are not i18n calls', () => {
    const src = `split('a.b'); format('x.y'); obj.t('not.counted'); const t = 5; get('z.z')`;
    assert.deepEqual([...extractKeys(src).literal], []);
});

test('looksLikeRawKey flags namespace.key tokens but not prose', () => {
    const ns = new Set(['auth', 'common']);
    assert.equal(looksLikeRawKey('SIGN IN auth.signIn', ns), true);
    assert.equal(looksLikeRawKey('common.cancel', ns), true);
    assert.equal(looksLikeRawKey('Visit example.com or version 1.2', ns), false);
    assert.equal(looksLikeRawKey('unknown.thing', ns), false);
    assert.equal(looksLikeRawKey('Sign in to your account.', ns), false);
});
