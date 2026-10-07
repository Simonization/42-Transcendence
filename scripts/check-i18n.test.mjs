// Run with: node --test scripts/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLocales, flatten, parseJsonStrict, placeholders } from './check-i18n.mjs';

const ok = JSON.stringify({ a: { b: 'Hello {name}', c: 'Plain' }, d: '{n} item | {n} items' });

test('identical locales pass', () => {
    const r = checkLocales({ en: ok, fr: ok, tr: ok });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.counts, { en: 3, fr: 3, tr: 3 });
});

test('parseJsonStrict reports duplicate keys with their path', () => {
    const { value, duplicates } = parseJsonStrict('{"a":{"x":1,"x":2},"b":1,"b":2}');
    assert.deepEqual(duplicates, ['a.x', 'b']);
    assert.equal(value.b, 2); // last one wins, like JSON.parse
});

test('same key in different objects is not a duplicate', () => {
    const { duplicates } = parseJsonStrict('{"a":{"x":1},"b":{"x":2}}');
    assert.deepEqual(duplicates, []);
});

test('parseJsonStrict matches JSON.parse on valid input, including escapes and arrays', () => {
    const text = '{"s":"q\\"uote \\u00e9 \\n","n":-1.5e2,"t":true,"z":null,"arr":[1,{"k":"v"}],"e":{}}';
    assert.deepEqual(JSON.parse(JSON.stringify(parseJsonStrict(text).value)), JSON.parse(text));
});

test('parseJsonStrict rejects invalid JSON with a position', () => {
    assert.throws(() => parseJsonStrict('{"a": }'), /line 1, column 7/);
    assert.throws(() => parseJsonStrict('{"a": 1,}'), SyntaxError);
    assert.throws(() => parseJsonStrict('{"a": 1} x'), /trailing/);
    assert.throws(() => parseJsonStrict('{"a": "x'), /unterminated/);
});

test('duplicate keys fail the check', () => {
    const dup = '{"a":{"b":"x","b":"y","c":"z"},"d":"w"}';
    const clean = '{"a":{"b":"x","c":"z"},"d":"w"}';
    const r = checkLocales({ en: clean, fr: dup, tr: clean });
    assert.equal(r.errors.length, 1);
    assert.match(r.errors[0], /\[fr\] duplicate key: a\.b/);
});

test('missing keys are listed per locale', () => {
    const en = JSON.stringify({ a: { b: '1', c: '2' }, d: '3' });
    const fr = JSON.stringify({ a: { b: '1' }, d: '3' });
    const tr = JSON.stringify({ a: { b: '1', c: '2' }, d: '3', extra: '4' });
    const r = checkLocales({ en, fr, tr });
    const text = r.errors.join('\n');
    assert.match(text, /\[fr\] missing 2 key\(s\)[\s\S]*a\.c[\s\S]*extra/);
    assert.match(text, /\[en\] missing 1 key\(s\)[\s\S]*extra/);
    // tr has every key, so it must not be reported
    assert.doesNotMatch(text, /\[tr\] missing/);
});

test('placeholder mismatches fail, order and plural variants do not', () => {
    const en = JSON.stringify({ x: '{a} and {b}', y: '{n} team | {n} teams', z: 'Hi {name}' });
    const fr = JSON.stringify({ x: '{b} et {a}', y: '{n} équipe | {n} équipes', z: 'Salut {nom}' });
    const tr = JSON.stringify({ x: '{a} ve', y: '{n} takım', z: 'Selam {name}' });
    const r = checkLocales({ en, fr, tr });
    assert.equal(r.errors.length, 2);
    assert.match(r.errors.find((e) => e.startsWith('[fr]')), /z: placeholders \{nom\} differ from en \{name\}/);
    assert.match(r.errors.find((e) => e.startsWith('[tr]')), /x: placeholders \{a\} differ from en \{a\}, \{b\}/);
});

test('placeholders() ignores literal interpolation and dedupes', () => {
    assert.deepEqual(placeholders("{b} {a} {a} {'@'} {\"x\"}"), ['a', 'b']);
    assert.deepEqual(placeholders('no braces'), []);
    assert.deepEqual(placeholders(undefined), []);
});

test('invalid JSON in one locale is reported and the others are still checked', () => {
    const r = checkLocales({ en: ok, fr: '{"a": ', tr: ok });
    assert.equal(r.errors.length, 1);
    assert.match(r.errors[0], /\[fr\] invalid JSON/);
});

test('non-string leaves are flagged', () => {
    const bad = JSON.stringify({ a: 1 });
    const r = checkLocales({ en: bad, fr: bad, tr: bad });
    assert.equal(r.errors.length, 3);
    assert.match(r.errors[0], /not a string/);
});

test('flatten dots nested keys and indexes arrays', () => {
    const flat = flatten({ a: { b: 'x' }, l: ['p', 'q'] });
    assert.deepEqual([...flat.keys()], ['a.b', 'l.0', 'l.1']);
});
