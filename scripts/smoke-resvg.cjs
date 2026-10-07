/*
 * smoke-resvg.cjs — proves the og-image renderer works inside the production backend image.
 *
 * Run from the backend directory (the image's WORKDIR), e.g. in CI and by hand:
 *
 *   docker build -f backend/Dockerfile.prod -t transcendence-backend:check backend
 *   docker run --rm -i transcendence-backend:check node - < scripts/smoke-resvg.cjs
 *
 * Checks, resolving modules and files from the current directory:
 *   1. require('@resvg/resvg-js') loads (the native musl binding is present on alpine);
 *   2. a trivial SVG renders to a valid PNG;
 *   3. the fonts the nest build copies into dist/ are there, and text rendered with them
 *      (system fonts off, as in og-image.service.ts) differs from the same SVG without text.
 */
const { createRequire } = require('module');
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const req = createRequire(path.join(cwd, 'noop.js'));

function fail(msg) {
    console.error('smoke-resvg: FAILED - ' + msg);
    process.exit(1);
}

let Resvg;
try {
    ({ Resvg } = req('@resvg/resvg-js'));
} catch (e) {
    fail("require('@resvg/resvg-js') threw: " + e.message);
}

const isPng = (b) => b.length > 60 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

const rect = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#e00"/></svg>';
const rectPng = new Resvg(rect).render().asPng();
if (!isPng(rectPng)) fail('trivial SVG did not render to a PNG');

const fontDir = path.join(cwd, 'dist', 'modules', 'tournaments', 'public', 'fonts');
let fonts;
try {
    fonts = fs.readdirSync(fontDir).filter((f) => f.endsWith('.ttf')).map((f) => path.join(fontDir, f));
} catch {
    fonts = [];
}
if (fonts.length === 0) fail('no .ttf fonts in ' + fontDir + ' (nest-cli.json assets not applied?)');

const opts = { font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Orbitron' } };
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80"><rect width="400" height="80" fill="#111"/>${inner}</svg>`;
const withText = new Resvg(svg('<text x="10" y="55" font-family="Orbitron" font-size="48" fill="#fff">GG</text>'), opts).render().asPng();
const without = new Resvg(svg(''), opts).render().asPng();
if (!isPng(withText)) fail('SVG with text did not render to a PNG');
if (Buffer.compare(Buffer.from(withText), Buffer.from(without)) === 0) fail('text rendered nothing: bundled fonts did not load');

console.log(`smoke-resvg: ok (${rectPng.length} byte rectangle, ${withText.length} byte text card, ${fonts.length} fonts)`);
