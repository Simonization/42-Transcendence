# Color Migration Mapping: Hex → CSS Variables

This document maps all 77 hardcoded hex colors found in the codebase to their corresponding CSS design token variables. This is part of ISSUE #8 refactoring to enable proper theme switching.

## Migration Principles

- **Auth pages** use hardcoded colors intentionally (dark theme-agnostic) - these are being converted to CSS variables from Dragon theme for consistency
- **Component colors** now use design tokens that adapt to the active theme (Stellar/Dragon)
- **Status colors** (success, error, warning, info) map to `--color-*` variables
- **Text colors** map to `--text-*` variables
- **Background colors** map to `--bg-*` or component-specific variables

## Color Mapping Table

### Status Colors (Most Common)

| Hardcoded | CSS Variable | Usage | Notes |
|-----------|--------------|-------|-------|
| #10b981 (green) | var(--color-success) | Win results, accepted status, success badges | Green across both themes |
| #ef4444 (red) | var(--color-error) | Loss results, error states, delete actions | Red across both themes |
| #f97316 (orange) | var(--color-warning) | Draw results, warning states | Orange/amber across both themes |
| #3b82f6 (blue) | var(--color-info) | Info badges, secondary status | Blue across both themes |

### Text Colors (Auth Pages)

| Hardcoded | CSS Variable | Usage | Notes |
|-----------|--------------|-------|-------|
| #e8e6e3 (warm light) | var(--text-primary) | Primary text in auth pages | Maps to Dragon theme light text |
| #6b7280 (medium gray) | var(--text-secondary) | Secondary/dim text | Consistent across themes |
| #9ca3af (light gray) | var(--text-tertiary) | Disabled, hints, placeholders | Lighter gray |
| #4b5563 (dark gray) | var(--text-secondary) | Alternative secondary text | Similar to #6b7280 |
| #0a0e1a (very dark) | var(--text-on-accent) OR hardcoded dark | Dark text on light backgrounds | Auth page specific |
| #ffffff (white) | var(--bg-secondary) OR #ffffff | Light backgrounds in auth | Keep white for auth card BG |

### Accent/Status Colors for Accessibility

| Hardcoded | CSS Variable | Usage | Context |
|-----------|--------------|-------|---------|
| #34d399 (bright green) | var(--color-success) | Success messages in auth | Dragon theme version |
| #f87171 (bright red) | var(--color-error) | Error messages in auth | Dragon theme version |
| #059669 (dark green) | - | Tournament status badge (WCAG AA) | Keep for high contrast (accessibility fix from Week 4) |
| #ea580c (dark orange) | - | Tournament status badge (WCAG AA) | Keep for high contrast (accessibility fix from Week 4) |

## Files Affected (15 files, 77 instances)

### Auth Pages (10 files, 46 instances)
These pages use dark theme-agnostic colors. Converting to CSS variables (Dragon theme values) for consistency.

1. **AuthPage.vue** (11 instances)
   - Lines 216, 223, 244, 253, 263, 280-281, 289, 305, 312, 334, 341, 345, 368, 374

2. **TwoFactorPage.vue** (14 instances)
   - Lines 131, 137, 154, 160, 179, 201-202, 210, 221, 227, 240, 247, 256, 265

3. **OAuthCallbackPage.vue** (2 instances)
   - Lines 51, 57

4. **VerifyEmailPage.vue** (11 instances)
   - Lines 76, 82, 99, 105, 118-119, 127, 133, 139

5. **BracketVisualization.vue** (4 instances)
   - Lines 396, 400, 456, 460
   - Map: #10b981 → var(--color-success), #ea580c → var(--color-warning)

### Tournament/Admin Components (5 files, 31 instances)

6. **TournamentDetailCard.vue** (2 instances)
   - Lines 700, 705
   - Note: #059669 and #ea580c are accessibility-fixed colors (WCAG AA), may need to create new high-contrast tokens

7. **FeaturedTournamentsSection.vue** (3 instances)
   - Lines 279, 284, 290
   - Same as above - accessibility colors

8. **AdminCard.vue** (2 instances)
   - Lines 888, 894
   - Gradient: #f97316 → var(--color-warning), #3b82f6 → var(--color-info)

9. **MatchHistoryCard.vue** (5 instances)
   - Lines 401, 405, 409, 419, 424
   - Status colors: green, red, orange

10. **TournamentCard.vue** (3 instances)
    - Lines 169, 174, 180
    - Status colors: #10b981, #f97316, #6b7280

### Registration/Modal Components (3 files, 8 instances)

11. **TournamentRegistrationModal.vue** (3 instances)
    - Lines 632-633, 1017, 1020
    - Errors and success states

12. **RegistrationStep1.vue** (2 instances)
    - Lines 131, 134
    - Error styling

13. **RegistrationStep2Solo.vue** (2 instances)
    - Lines 136, 139
    - Error styling

### Notification/Alert Components (2 files, 8 instances)

14. **NotificationToast.vue** (8 instances)
    - Lines 111, 115, 119, 123, 127, 131, 135, 139
    - Status-based toast colors: success, error, warning, info

15. **MessageAlert.vue** (4 instances)
    - Lines 34-35, 40-41
    - Success/error alert borders and text

## Implementation Strategy

1. **Phase 1: Create High-Contrast Tokens** (if needed)
   - If #059669 and #ea580c need to remain for accessibility, add to tokens.css as `--color-success-dark` and `--color-warning-dark`

2. **Phase 2: Batch Replace by Color**
   - Success (#10b981, #34d399): Replace with `var(--color-success)`
   - Error (#ef4444, #f87171): Replace with `var(--color-error)`
   - Warning (#f97316, #fbbf24): Replace with `var(--color-warning)`
   - Info (#3b82f6, #60a5fa): Replace with `var(--color-info)`
   - Text colors: Replace with appropriate `var(--text-*)` variables

3. **Phase 3: Test Theme Switching**
   - Set `data-theme="stellar"` and `data-theme="dragon"` in DevTools
   - Verify all colors adapt correctly

4. **Phase 4: Verify No Regressions**
   - Build: `npm run build` (expect 0 errors)
   - Tests: `npx vitest run` (expect 115/115 passing)
   - Spot-check: 5-10 components visually

## Verification Command

After migration is complete, verify no hardcoded colors remain:

```bash
grep -r "#[0-9a-fA-F]\{6\}" src/ --include="*.vue" | wc -l
```

Expected result: **0** (or only CSS variable declarations in tokens files)

## Notes

- Auth pages were intentionally dark/theme-agnostic. Converting to CSS variables makes them theme-aware while maintaining dark aesthetics.
- High-contrast colors (#059669, #ea580c) from Week 4 accessibility fixes should be preserved or moved to dedicated high-contrast tokens.
- All color changes are CSS-only; no component logic changes needed.
