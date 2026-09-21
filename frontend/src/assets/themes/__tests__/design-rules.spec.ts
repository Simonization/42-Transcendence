/**
 * Design-rule guards.
 *
 * These are the rules from frontend/DESIGN.md that a single careless edit re-introduces, and
 * that nothing else in the suite can see: vitest never compiles scoped CSS, so a component can
 * drift all the way back to the SaaS default while every test stays green. Each rule here was
 * violated somewhere in the codebase before the redesign — these are regressions, not theory.
 */

import { describe, it, expect } from 'vitest'

const sources = import.meta.glob(
  [
    '../../../pages/**/*.vue',
    '../../../layouts/**/*.vue',
    '../../../components/**/*.vue',
    '../*.css',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

/** Collapse whitespace so multi-line `box-shadow:` values match as one declaration. */
const flat = (src: string) => src.replace(/\s*\n\s*/g, ' ')

const offenders = (re: RegExp) =>
  Object.entries(sources)
    .filter(([, src]) => re.test(flat(src)))
    .map(([path]) => path.replace(/^(\.\.\/)+/, ''))

describe('design rules', () => {
  // Guard the guards: a broken glob would make every rule below pass vacuously.
  it('scans the whole UI', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50)
  })

  // 49 hand-written copies of `box-shadow: 0 0 10px var(--accent-primary-subtle)` had
  // accumulated on hover states. instrument-cluster draws the line precisely: emissive glow
  // (light out of a lit readout) is right for Dragon; a halo painted around a shape is not.
  it('has no decorative glow halos', () => {
    expect(offenders(/box-shadow:\s*(?![^;]*inset)[^;]*0 0 [1-9]\d*px/)).toEqual([])
  })

  // Elevation shadows: separation is a hairline rule on a flat field, not a floating card.
  it('has no elevation shadows', () => {
    expect(offenders(/box-shadow:\s*[^;]*?\b\d+px \d+px \d+px/)).toEqual([])
  })

  // The white top-edge inset plus a backdrop blur is the glassmorphism tell, and both tokens
  // are flattened now, so any survivor is a dead declaration as well as an off-brief one.
  it('has no glassmorphism', () => {
    expect(offenders(/inset 0 1px 0 rgba\(255, ?255, ?255/)).toEqual([])
    expect(offenders(/backdrop-filter:\s*(?!none)[^;]/)).toEqual([])
  })

  // A card that rises toward the cursor is the SaaS lift; a HUD changes state, it doesn't hover.
  it('has no hover lift', () => {
    expect(offenders(/:hover[^{]*\{[^}]*transform:\s*translateY\(-\d/)).toEqual([])
  })

  // Overshoot easing reads as a toy. --ease-bounce is now an alias of the sharp default, so
  // this catches a fresh literal rather than the token.
  it('has no overshoot easing', () => {
    expect(offenders(/cubic-bezier\(\s*[\d.]+,\s*1\.\d/)).toEqual([])
  })
})
