# esportendence — design system

Locked direction for the frontend. Derived from `~/ui-vault`: `aesthetics/fury-hud.md` for
structure, `aesthetics/instrument-cluster.md` for readouts, `playbooks/typography.md` for the
scale, `techniques/motion.md` for motion. Checked against Anthropic's live `frontend-design`
skill, which outranks the vault on anything about generic AI design.

## Subject

A tournament platform for 42 Belgium. Its audience runs or enters tournaments; the page's single
job is **see where your team stands and what happens next**.

The hook that makes Fury fit rather than decorate: Fury's conceit is *the interface is branding for
corporations that do not exist* — Feisar, Auricom, Qirex. Here the teams **are** those entities.
A team is a named identity with a roster, a seed and a record. Treating the interface as that
identity system is the subject's own world, not a borrowed skin.

## The conflict, and how it is resolved

The live skill names three things as current AI defaults that are also Fury's signature moves:

| Live skill calls it a default | Fury requires it |
|---|---|
| near-black ground + one bright accent | `#0B0D14` ground, one hot accent |
| ALL-CAPS labels, tracked out | "wide tracking on small caps is the most recognisable tell of this family" |
| a monospace face for small data labels | "monospace for anything numeric" |

The skill's own tie-breaker settles it: *"Where the brief pins down a visual direction, follow it
exactly — the brief's own words always win, including when it asks for one of these looks."*
Simon asked for Fury/HUD. So the direction stands.

But the vault's warning is the binding constraint: **"A near-black page with one vermilion accent
and no instrument furniture isn't fury-hud. It's slop with a citation."** So the distinguishing
features are load-bearing, not garnish, and this document commits to them:

- tick rules, registration marks and crop marks as real furniture
- corner-anchored clusters with the centre left for content
- weight extremes only — 200 against 800, never 400/600
- tabular figures on every number, so digits never jitter
- flat fields; no gradient used as decoration
- caps are used **only** for instrument labels, never as an eyebrow above a heading

## Where instrument-cluster applies, and where it does not

The pack sets an honest test: *"If a dashboard is monitored, this language is functionally better.
If it's browsed, use editorial-dragone and stop pretending."*

Most of this app is **browsed** — chat, profile, tournament lists. So the emissive treatment is
**not** applied wholesale to the dark theme. It applies only to genuine readouts, which are
monitored: scores, seeds, team counts, roster fill, match status, countdowns.

Consequence: surfaces stay flat and print-derived in both themes. Light emits only from things
that have a reason to emit. Per the pack, emissive glow is tight (1–2px falloff) and must increase
legibility; decorative `box-shadow` in a hot colour is forbidden.

## Colour

Six named values. Black + white + one bright, and the accent is decided first.

| Token | Value | Role |
|---|---|---|
| `--ink` | `#070B0F` | Dragon ground. Near-black carrying a trace of the emission hue, never `#000`. |
| `--paper` | `#E8E9ED` | Stellar ground. Fury's own "Zone-mode inversion". |
| `--rule` | `#2A2F3E` | Structure: rules, ticks, registration marks, dead furniture. |
| `--type` | `#E6E9F2` | Text on ink. Never pure white. |
| `--data` | `#00E5FF` | The emissive readout hue. One per screen. |
| `--live` | `#FF2D55` | The single hot accent. **Live or urgent only.** |

`--data` and `--live` are not interchangeable, and that is the point: colour encodes state rather
than decorating. Cyan means *this is a value*; red means *this is happening now*. One warning hue
(`#C6FF00`) exists for genuine warnings and appears nowhere else.

Stellar inverts ground and text and drops emission entirely — ink on paper, flat, no glow. The two
themes are the same system lit differently, which is what Fury's Zone mode already is.

## Type

Three faces, two voices. All already installed, so this is a decision about use, not a dependency.

| Face | Role |
|---|---|
| **Orbitron** | Display and instrument labels. The geometric grotesque the project already chose; period-correct for this lineage. |
| **Exo 2** | Body. Same geometric family, so proportions match — Obys' rule 2, the one most pairs fail. |
| **JetBrains Mono** | Every numeral, always with `font-variant-numeric: tabular-nums`. |

Mono is a *role*, not a third voice: it appears only where there are digits.

### Scale

Four sizes with large steps, replacing the previous ten-step ramp, which was too closely spaced to
establish hierarchy. Obys: *"avoid small differences in font size."*

| Token | Size | Leading | Tracking | Use |
|---|---|---|---|---|
| `--t-display` | 88px | 0.92 | −0.03em | One per page. Champion, hero, the big numeral. |
| `--t-head` | 40px | 1.00 | −0.01em | Section and card headings. |
| `--t-body` | 15px | 1.35 | 0 | Everything readable. |
| `--t-micro` | 11px | 1.20 | 0.16em | Instrument labels only, in caps. |

The inverse relationship is the rule: the bigger the type, the tighter the leading and the more
negative the tracking. Display type is never shipped at body settings.

Weights: **200 and 800 only.** No 400, no 600.

Numbers are enormous relative to their labels, and right-aligned.

## Layout

Hard rectilinear grid, kept strictly, with corner-anchored instrument clusters and the centre left
for content. Left-aligned by default; the grid is broken deliberately once, on the bracket.

```
 ┌─ ESPORTENDENCE ────────────────────────┬──── SYS ─┐   registration marks at the corners
 │ ╷                                              ╷ │   tick rule under the header, not a border
 │                                                  │
 │   PROVISIONAL                    SEED  TEAM   W  │   labels whisper in micro caps
 │   ────────────────────────────    01   ALPHA  2  │   numbers dominate, tabular, right-aligned
 │                                   02   BRAVO  1  │
 │                                                  │
 │ ╵                                              ╵ │
 └──── ESP-2026 ──────────────────────────┴─────────┘
```

## Signature

**The bracket as an instrument.** It is the app's reason to exist and the one surface that is
genuinely monitored rather than browsed, so it earns the instrument-cluster language in full:
segmented fill rather than smooth bars, tick rules between rounds, bracket reticles on the live
match, seeds and scores in tabular mono at display size, labels whispering beneath them.

Boldness is spent here and nowhere else. Everything around it stays quiet.

## Motion

Two languages, per `techniques/motion.md`: chrome articulates, content flows.

- **Chrome**: 120–200ms, sharp easing, no overshoot, no bounce. Slide and clip, never fade.
- **Readouts**: segments snap between states — a segment is lit or it is not, never tweened.
  Numerals tick, never blur. Needle-style values may overshoot slightly and settle, because that
  is physically true of an instrument; it is the only overshoot permitted.
- **One orchestrated moment**: the HUD boots on first paint, panel by panel, in a deliberate
  order. Not a fade-and-slide on every section, which is the generic default.
- Nothing animates for decoration. If no state changed, there is no motion.
- `prefers-reduced-motion` disables all of it, including the boot.

## Quality floor

Not announced, just met: responsive to 360px, visible keyboard focus, reduced motion respected,
WCAG AA contrast on body text.

## Explicitly rejected

- Gradient washes as decoration (the current `.bg-gradient` radial pulse).
- Uniform rounded cards with one radius and the same soft grey shadow — the SaaS-card kit the live
  skill names, which is what the current `glass-panel` treatment is.
- Bloom, haze, scanlines, CRT curvature. That is synthwave costume, not an instrument.
- Caps as an eyebrow label above headings.
- More than one emissive hue.
- `→` appended to button text; meta strings joined with middle dots.
