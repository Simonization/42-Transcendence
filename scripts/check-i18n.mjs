#!/usr/bin/env node
/*
 * check-i18n.mjs — consistency check for the frontend locale files (no dependencies).
 *
 *   node scripts/check-i18n.mjs [localesDir]
 *
 * Default dir: frontend/src/i18n/locales (en.json, fr.json, tr.json). Fails (exit 1) on:
 *   1. duplicate keys inside one object (JSON.parse silently keeps the last one, so a
 *      duplicated "common" block quietly drops translations);
 *   2. key-set mismatches: any key present in one locale and missing from another
 *      (reported per locale, with the keys that locale lacks);
 *   3. {placeholder} mismatches: the same key using different {names} across locales
 *      (e.g. en "{count} teams" vs fr "{nombre} équipes" renders the raw token).
 *
 * Plural variants ("a | b | c") are compared as one message: the set of placeholders
 * used anywhere in the message. Vue-i18n literal interpolation {'x'} is ignored.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LOCALES = ['en', 'fr', 'tr'];
const REFERENCE = 'en';

/**
 * Strict JSON parser that records duplicate keys. Returns { value, duplicates } where
 * duplicates are dotted paths ("auth.login" appearing twice in the same object).
 * Throws SyntaxError (with line/column) on invalid JSON.
 */
export function parseJsonStrict(text) {
    const duplicates = [];
    let i = 0;

    const fail = (msg) => {
        const upTo = text.slice(0, i);
        const line = upTo.split('\n').length;
        const col = i - upTo.lastIndexOf('\n');
        throw new SyntaxError(`${msg} at line ${line}, column ${col}`);
    };
    const ws = () => {
        while (i < text.length && ' \t\r\n'.includes(text[i])) i++;
    };
    const expect = (ch) => {
        if (text[i] !== ch) fail(`expected '${ch}' but found ${text[i] === undefined ? 'end of input' : `'${text[i]}'`}`);
        i++;
    };
    const string = () => {
        const start = i;
        expect('"');
        while (i < text.length && text[i] !== '"') {
            if (text[i] === '\\') i++;
            else if (text[i] === '\n') fail('unterminated string');
            i++;
        }
        if (i >= text.length) fail('unterminated string');
        i++;
        return JSON.parse(text.slice(start, i));
    };
    const value = (path) => {
        ws();
        const c = text[i];
        if (c === '{') return object(path);
        if (c === '[') return array(path);
        if (c === '"') return string();
        const m = /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i, i + 40));
        if (!m) fail(`unexpected ${c === undefined ? 'end of input' : `'${c}'`}`);
        i += m[0].length;
        return JSON.parse(m[0]);
    };
    const object = (path) => {
        const out = Object.create(null);
        expect('{');
        ws();
        if (text[i] === '}') {
            i++;
            return out;
        }
        for (;;) {
            ws();
            const key = string();
            ws();
            expect(':');
            const full = path ? `${path}.${key}` : key;
            if (key in out) duplicates.push(full);
            out[key] = value(full);
            ws();
            if (text[i] === ',') {
                i++;
                continue;
            }
            expect('}');
            return out;
        }
    };
    const array = (path) => {
        const out = [];
        expect('[');
        ws();
        if (text[i] === ']') {
            i++;
            return out;
        }
        for (;;) {
            out.push(value(`${path}[${out.length}]`));
            ws();
            if (text[i] === ',') {
                i++;
                continue;
            }
            expect(']');
            return out;
        }
    };

    const result = value('');
    ws();
    if (i < text.length) fail('unexpected trailing content');
    return { value: result, duplicates };
}

/** { a: { b: "x" } } -> Map("a.b" -> "x"). Arrays flatten by index; non-strings are kept as-is. */
export function flatten(node, prefix = '', out = new Map()) {
    if (node !== null && typeof node === 'object') {
        const entries = Array.isArray(node) ? node.map((v, idx) => [String(idx), v]) : Object.entries(node);
        for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out);
        if (entries.length === 0 && prefix) out.set(prefix, node);
    } else {
        out.set(prefix, node);
    }
    return out;
}

/** Sorted unique {name} placeholders of a message; {'literal'} interpolations are ignored. */
export function placeholders(message) {
    if (typeof message !== 'string') return [];
    const found = new Set();
    for (const m of message.matchAll(/\{([^{}]*)\}/g)) {
        const name = m[1].trim();
        if (name && !/^['"]/.test(name)) found.add(name);
    }
    return [...found].sort();
}

/**
 * Check locale file contents. `texts` maps locale -> raw JSON text.
 * Returns { errors: string[], counts: {locale: number} }.
 */
export function checkLocales(texts, locales = LOCALES) {
    const errors = [];
    const flat = {};

    for (const locale of locales) {
        try {
            const { value, duplicates } = parseJsonStrict(texts[locale]);
            for (const d of duplicates) errors.push(`[${locale}] duplicate key: ${d}`);
            flat[locale] = flatten(value);
        } catch (e) {
            errors.push(`[${locale}] invalid JSON: ${e.message}`);
        }
    }

    const parsed = locales.filter((l) => flat[l]);
    const ref = flat[REFERENCE];

    // Key-set parity: every locale must have exactly the union of all keys.
    const union = new Set(parsed.flatMap((l) => [...flat[l].keys()]));
    for (const locale of parsed) {
        const missing = [...union].filter((k) => !flat[locale].has(k)).sort();
        if (missing.length) {
            errors.push(`[${locale}] missing ${missing.length} key(s) present in other locales:\n` + missing.map((k) => `      ${k}`).join('\n'));
        }
    }

    // Non-string leaves are almost always a mistake (vue-i18n expects strings).
    for (const locale of parsed) {
        for (const [k, v] of flat[locale]) {
            if (typeof v !== 'string') errors.push(`[${locale}] ${k}: value is not a string`);
        }
    }

    // Placeholder parity, against en where the key exists there, else against the first locale having it.
    for (const key of [...union].sort()) {
        const holders = parsed.filter((l) => flat[l].has(key));
        const base = ref?.has(key) ? REFERENCE : holders[0];
        const expected = placeholders(flat[base].get(key));
        for (const locale of holders) {
            if (locale === base) continue;
            const actual = placeholders(flat[locale].get(key));
            if (actual.join(',') !== expected.join(',')) {
                errors.push(`[${locale}] ${key}: placeholders {${actual.join('}, {')}} differ from ${base} {${expected.join('}, {')}}`);
            }
        }
    }

    const counts = Object.fromEntries(parsed.map((l) => [l, flat[l].size]));
    return { errors, counts };
}

function main() {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const dir = resolve(process.argv[2] || join(root, 'frontend', 'src', 'i18n', 'locales'));
    const texts = {};
    for (const locale of LOCALES) {
        try {
            texts[locale] = readFileSync(join(dir, `${locale}.json`), 'utf8');
        } catch (e) {
            console.error(`check-i18n: cannot read ${join(dir, `${locale}.json`)}: ${e.message}`);
            process.exit(1);
        }
    }
    const { errors, counts } = checkLocales(texts);
    if (errors.length) {
        console.error(`check-i18n: FAILED (${errors.length} problem(s))`);
        for (const e of errors) console.error(`  ${e}`);
        process.exit(1);
    }
    console.log(`check-i18n: ok ${JSON.stringify(counts)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
