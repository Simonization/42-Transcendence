/**
 * The 1200x630 link-preview card, as an SVG string (og-image.service.ts turns it into a PNG).
 *
 * Palette and type follow frontend/DESIGN.md (Dragon theme): ink ground, rule-grey furniture,
 * cyan for values, the hot red only for "live", Orbitron for labels and names, JetBrains Mono for
 * every numeral. Nothing user-provided reaches the SVG unescaped: `svgText` drops characters the
 * bundled fonts cannot draw and escapes the rest.
 */

import { PublicTournament } from './public-tournament.view';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Families as the bundled font files name them (see ./fonts). */
export const FONT_DISPLAY = 'Orbitron';
export const FONT_MONO_HEAVY = 'JetBrains Mono ExtraBold';
export const FONT_MONO_LIGHT = 'JetBrains Mono Light';

const INK = '#070b0f';
const PANEL = '#0b1117';
const RULE = '#2a2f3e';
const TYPE = '#e6e9f2';
const DIM = '#8b97a8';
const DATA = '#00e5ff';
const LIVE = '#ff2d55';

export interface OgRow {
    /** "01", "02", ... */
    rank: string;
    name: string;
    tag: string;
}

/** Everything the card shows. Also the cache key: same model, same picture. */
export interface OgModel {
    title: string;
    status: string;
    statusLabel: string;
    teamsCount: number;
    game: string | null;
    rows: OgRow[];
}

const STATUS_LABEL: Record<string, string> = {
    DRAFT: 'DRAFT',
    REGISTRATION_OPEN: 'REGISTRATION OPEN',
    ONGOING: 'LIVE',
    COMPLETED: 'COMPLETED',
};

export const statusLabelOf = (status: string): string => STATUS_LABEL[status] ?? status;

const pad = (n: number) => String(n).padStart(2, '0');

/** Podium once completed, otherwise the top seeds; at most four rows. */
export function ogModelOf(t: PublicTournament): OgModel {
    let rows: OgRow[] = [];
    if (t.podium) {
        rows = [
            { rank: '01', name: t.podium.first.name, tag: 'CHAMPION' },
            ...(t.podium.second ? [{ rank: '02', name: t.podium.second.name, tag: 'FINALIST' }] : []),
            ...t.podium.third.map((team) => ({ rank: '03', name: team.name, tag: 'SEMI-FINAL' })),
        ];
    } else {
        rows = t.seeding.teams.map((team) => ({ rank: pad(team.seed), name: team.name, tag: 'SEED' }));
    }
    const phase1 = [...t.phases].sort((a, b) => a.order - b.order)[0];
    return {
        title: t.name,
        status: t.status,
        statusLabel: statusLabelOf(t.status),
        teamsCount: t.seeding.teams.length,
        game: phase1?.game?.name ?? null,
        rows: rows.slice(0, 4),
    };
}

// --- text safety ---------------------------------------------------------------------------

/** Code point ranges the bundled Orbitron draws (JetBrains Mono covers a superset of these). */
const DRAWABLE: [number, number][] = [
    [0x20, 0x5d], [0x5f, 0x7e], [0xa0, 0xa3], [0xa8, 0xa8], [0xaf, 0xb0], [0xb4, 0xb4], [0xb6, 0xb6],
    [0xb8, 0xb8], [0xbf, 0xcf], [0xd1, 0xd7], [0xd9, 0xdd], [0xdf, 0xef], [0xf1, 0xf7], [0xf9, 0xfd],
    [0xff, 0xff], [0x152, 0x153], [0x2013, 0x2014], [0x2018, 0x2019], [0x201c, 0x201d], [0x2022, 0x2022],
    [0x2026, 0x2026], [0x20ac, 0x20ac],
];

const drawable = (cp: number) => DRAWABLE.some(([a, b]) => cp >= a && cp <= b);

/**
 * Upper-cased, limited to what the fonts can draw (anything else becomes "?"), cut to `max`
 * characters with an ellipsis. The result is plain text, not yet XML-safe: use `svgText`.
 */
export function displayText(input: string, max: number): string {
    const chars = [...input.normalize('NFC').toUpperCase().replace(/\s+/g, ' ').trim()].map((c) =>
        drawable(c.codePointAt(0)!) ? c : '?',
    );
    return chars.length > max ? `${chars.slice(0, max - 1).join('').trimEnd()}…` : chars.join('');
}

export function escapeXml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export const svgText = (input: string, max: number): string => escapeXml(displayText(input, max));

/** Splits a title on spaces into at most two lines of about `width` characters. */
export function wrapTitle(title: string, width: number): string[] {
    const words = displayText(title, 200).split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        if (line && `${line} ${word}`.length > width) {
            lines.push(line);
            line = word;
        } else {
            line = line ? `${line} ${word}` : word;
        }
    }
    if (line) lines.push(line);
    if (lines.length <= 2) return lines.map((l) => displayText(l, width + 4));
    // Too long for two lines: keep the first line and squeeze the rest into the second.
    return [displayText(lines[0], width + 4), displayText(lines.slice(1).join(' '), width + 4)];
}

// --- card ----------------------------------------------------------------------------------

/** Tick rule along the top edge: the HUD's dead furniture. */
function ticks(): string {
    const out: string[] = [];
    for (let x = 64; x <= 1136; x += 24) {
        out.push(`<line x1="${x}" y1="24" x2="${x}" y2="${x % 96 === 64 ? 38 : 32}" stroke="${RULE}" stroke-width="2"/>`);
    }
    return out.join('');
}

/** Crop marks at the four corners of the frame, in the data hue. */
function cropMarks(): string {
    const l = 26;
    const [x1, y1, x2, y2] = [24, 24, OG_WIDTH - 24, OG_HEIGHT - 24];
    const mark = (x: number, y: number, dx: number, dy: number) =>
        `<path d="M${x + dx * l} ${y} L${x} ${y} L${x} ${y + dy * l}" fill="none" stroke="${DATA}" stroke-width="3"/>`;
    return mark(x1, y1, 1, 1) + mark(x2, y1, -1, 1) + mark(x1, y2, 1, -1) + mark(x2, y2, -1, -1);
}

export function buildOgSvg(model: OgModel): string {
    const live = model.status === 'ONGOING';
    const statusColor = live ? LIVE : DATA;

    const titleLines = wrapTitle(model.title, 22);
    const titleSize = titleLines.length > 1 ? 54 : 66;
    const titleY = titleLines.length > 1 ? 168 : 190;
    const title = titleLines
        .map(
            (line, i) =>
                `<text x="64" y="${titleY + i * (titleSize + 8)}" font-family="${FONT_DISPLAY}" font-size="${titleSize}" fill="${TYPE}">${escapeXml(line)}</text>`,
        )
        .join('');

    const rowTop = 330;
    const rowGap = 64;
    const rows = model.rows.length
        ? model.rows
              .map((row, i) => {
                  const y = rowTop + i * rowGap;
                  return (
                      `<text x="64" y="${y}" font-family="${FONT_MONO_HEAVY}" font-size="44" fill="${DATA}">${escapeXml(row.rank)}</text>` +
                      `<text x="150" y="${y - 2}" font-family="${FONT_DISPLAY}" font-size="32" fill="${TYPE}">${svgText(row.name, 17)}</text>` +
                      `<text x="790" y="${y - 2}" text-anchor="end" font-family="${FONT_MONO_LIGHT}" font-size="20" letter-spacing="3" fill="${DIM}">${escapeXml(row.tag)}</text>` +
                      `<line x1="64" y1="${y + 16}" x2="790" y2="${y + 16}" stroke="${RULE}" stroke-width="1"/>`
                  );
              })
              .join('')
        : `<text x="64" y="${rowTop}" font-family="${FONT_MONO_LIGHT}" font-size="24" letter-spacing="3" fill="${DIM}">NO TEAMS YET</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${INK}"/>
<rect x="24" y="24" width="${OG_WIDTH - 48}" height="${OG_HEIGHT - 48}" fill="${PANEL}" stroke="${RULE}" stroke-width="2"/>
${ticks()}
${cropMarks()}
<text x="64" y="92" font-family="${FONT_DISPLAY}" font-size="20" letter-spacing="6" fill="${DIM}">ESPORTENDENCE</text>
<rect x="${OG_WIDTH - 64 - 14}" y="76" width="14" height="14" fill="${statusColor}"/>
<text x="${OG_WIDTH - 64 - 28}" y="90" text-anchor="end" font-family="${FONT_DISPLAY}" font-size="20" letter-spacing="5" fill="${statusColor}">${escapeXml(model.statusLabel)}</text>
${title}
<line x1="64" y1="270" x2="${OG_WIDTH - 64}" y2="270" stroke="${RULE}" stroke-width="2"/>
${rows}
<text x="${OG_WIDTH - 64}" y="470" text-anchor="end" font-family="${FONT_MONO_HEAVY}" font-size="150" letter-spacing="-6" fill="${DATA}">${pad(model.teamsCount)}</text>
<text x="${OG_WIDTH - 64}" y="510" text-anchor="end" font-family="${FONT_MONO_LIGHT}" font-size="22" letter-spacing="6" fill="${DIM}">TEAMS</text>
<line x1="64" y1="548" x2="${OG_WIDTH - 64}" y2="548" stroke="${RULE}" stroke-width="1"/>
<text x="64" y="582" font-family="${FONT_MONO_LIGHT}" font-size="20" letter-spacing="4" fill="${DIM}">${model.game ? svgText(model.game, 32) : ''}</text>
</svg>`;
}
