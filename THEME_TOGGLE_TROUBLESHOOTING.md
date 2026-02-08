# Theme Toggle Troubleshooting Report

**Date**: 2026-02-08
**Status**: UNRESOLVED - Requires further investigation
**Last Action**: Applied direct DOM manipulation in ThemeToggle component - still not working

---

## Problem Summary

### Issue #1: Theme Toggle Colors Don't Update
- **Symptom**: Click theme button → button animates/updates BUT page colors don't change
- **Required Action**: Must refresh page (F5) to see color changes
- **Affected Component**: `/frontend/src/components/ThemeToggle.vue`
- **Affected Store**: `/frontend/src/stores/theme.ts`

### Issue #2: Bracket Tab Breaks All Tabs (SECONDARY)
- **Symptom**: Click bracket tab → nothing appears, then ALL other tabs blank until refresh
- **Status**: TEMPORARILY SET ASIDE (removed `glass-panel` class, back to `tab-pane` only)
- **Note**: May be related to Theme Toggle issue - both require refresh to work

---

## Attempted Fixes (In Order)

### Fix #1: Added `glass-panel` CSS Class to Bracket Tab
**File**: `/frontend/src/pages/menu/TournamentDetailCard.vue` (line 199)
**Change**:
```vue
<!-- Before -->
<section v-show="activeTab === 'bracket'" class="tab-pane">

<!-- After -->
<section v-show="activeTab === 'bracket'" class="tab-pane glass-panel">
```
**Result**: ❌ FAILED - Made bracket tab blank, broke all tabs
**Reverted**: Yes - removed glass-panel class

---

### Fix #2: Changed ThemeToggle to Use Computed Properties
**File**: `/frontend/src/components/ThemeToggle.vue`
**Change**:
```typescript
// Before: Direct destructuring (loses reactivity)
const themeStore = useThemeStore()
const { theme, toggleTheme, themeName } = themeStore

// After: Use computed properties
const theme = computed(() => themeStore.theme)
const themeName = computed(() => themeStore.themeName)
const toggleTheme = () => themeStore.toggleTheme()
```
**Result**: ✅ PARTIAL - Toggle button now visible and animates
**Impact**: Button animation works, but colors still require refresh

**HMR Timestamp**: 8:04:36 PM

---

### Fix #3: Added Watcher to Apply Theme Reactively
**File**: `/frontend/src/components/ThemeToggle.vue`
**Change**:
```typescript
// Added watcher to apply theme whenever it changes
watch(theme, (newTheme) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', newTheme)
    document.documentElement.style.colorScheme = newTheme === 'dragon' ? 'dark' : 'light'
  }
}, { immediate: true })
```
**Result**: ❌ FAILED - Watcher added but colors still don't update

**HMR Timestamp**: 8:06:19 PM

---

### Fix #4: Direct DOM Manipulation in Click Handler
**File**: `/frontend/src/components/ThemeToggle.vue`
**Change**:
```typescript
const toggleTheme = () => {
  const newTheme = theme.value === 'stellar' ? 'dragon' : 'stellar'

  // Update store
  themeStore.setTheme(newTheme)

  // Ensure DOM is updated immediately
  document.documentElement.setAttribute('data-theme', newTheme)
  document.documentElement.style.colorScheme = newTheme === 'dragon' ? 'dark' : 'light'

  // Persist to localStorage
  localStorage.setItem('theme', newTheme)
}
```
**Result**: ❌ FAILED - Still requires refresh to see color changes

**HMR Timestamp**: 8:07:52 PM

---

## Root Cause Analysis

### What IS Working:
- ✅ Vue reactivity for component UI (button animates)
- ✅ Computed properties are reactive
- ✅ Store's `setTheme()` method executes (verified by localStorage changes)
- ✅ `document.documentElement.setAttribute('data-theme', ...)` is being called
- ✅ localStorage is being updated

### What IS NOT Working:
- ❌ CSS color variables NOT updating when `data-theme` attribute changes
- ❌ Page colors only update after full page refresh
- ❌ Both store-based approach AND direct DOM manipulation failed

### Possible Root Causes:

1. **CSS Variable Scope Issue**
   - `data-theme` attribute is set correctly
   - But CSS `:root` or `html` selector isn't picking up the attribute change
   - May need to debug in DevTools: check computed styles

2. **Pinia Store State Not Updating**
   - `theme` ref in store might not be updating properly
   - Even though localStorage changes, the Vue ref might be stale

3. **HMR Module Reload Issue**
   - Hot module reloading might be serving stale code
   - Component might not have latest build

4. **Browser Cache/Service Worker**
   - Even after cache clear, browser might be caching CSS
   - Service worker (if any) might be intercepting requests

5. **CSS Specificity/Override Issue**
   - Theme CSS might not be applying due to specificity
   - Another CSS rule might be overriding theme variables

6. **Docker/Container Issue**
   - Code in container might not match what's running
   - Docker might need complete rebuild

---

## What Needs Investigation Tomorrow

### Priority 1: Browser Console Diagnostics
1. Open DevTools (F12)
2. Go to **Console** tab
3. Click theme toggle
4. Run these commands:
   ```javascript
   // Check if attribute is being set
   console.log(document.documentElement.getAttribute('data-theme'))

   // Check if CSS variable is working
   console.log(getComputedStyle(document.documentElement).getPropertyValue('--accent-primary'))

   // Manually set theme and see if colors change
   document.documentElement.setAttribute('data-theme', 'dragon')
   // Do colors change?

   // Check localStorage
   console.log(localStorage.getItem('theme'))
   ```

### Priority 2: Check Browser DevTools Elements
1. Open DevTools (F12) → Elements tab
2. Inspect the `<html>` element
3. After clicking toggle, verify:
   - `data-theme` attribute changes to correct value
   - Computed styles for color variables change
   - Check CSS applied to html element

### Priority 3: Check Theme CSS File
1. Verify `/frontend/src/assets/themes/theme-stellar.css` exists
2. Verify `/frontend/src/assets/themes/theme-dragon.css` exists
3. Check if CSS is being loaded properly in Network tab (F12)

### Priority 4: Test on Different Browser
1. Try Safari, Firefox, or Edge
2. If theme works on other browser: browser-specific issue
3. If theme fails on all browsers: code issue

### Priority 5: Try Bypass Solution
Test if we can work around by using CSS classes instead of attributes:
```typescript
// Instead of data-theme attribute, toggle body class
document.documentElement.classList.toggle('theme-dragon')
document.documentElement.classList.toggle('theme-stellar')
```

---

## Files Modified Today

1. **`/frontend/src/pages/menu/TournamentDetailCard.vue`**
   - Line 199: Removed `glass-panel` class (temporarily) to debug bracket issue
   - Status: Currently has `class="tab-pane"` only

2. **`/frontend/src/components/ThemeToggle.vue`**
   - Script section completely rewritten
   - Current version: Direct DOM manipulation in click handler
   - Commit: Applied via HMR (8:07:52 PM)

3. **`/frontend/src/stores/theme.ts`**
   - NOT MODIFIED (store code is correct)
   - Functions: `setTheme()`, `toggleTheme()`, `applyThemeToDocument()`
   - All are working (localStorage updates prove this)

---

## Test Results Summary

| Test | Result | Notes |
|------|--------|-------|
| Bracket tab fix | ❌ | Made things worse - reverted |
| Toggle button animation | ✅ | Works after computed property fix |
| Theme color update | ❌ | Requires page refresh |
| localStorage persistence | ✅ | Theme value saves to localStorage |
| Store method execution | ✅ | `setTheme()` is called |
| Direct DOM update | ✅ | `setAttribute()` is called |
| CSS variable application | ❌ | Colors don't reflect attribute change |

---

## Commands for Tomorrow

**Read this file first**:
```bash
cat /home/slang/42-Transcendence/THEME_TOGGLE_TROUBLESHOOTING.md
```

**Check current code state**:
```bash
# See what's in ThemeToggle currently
cat /home/slang/42-Transcendence/frontend/src/components/ThemeToggle.vue

# Check TournamentDetailCard bracket section
grep -A 3 'aria-labelledby="tab-bracket"' /home/slang/42-Transcendence/frontend/src/pages/menu/TournamentDetailCard.vue
```

**Run full clean rebuild**:
```bash
make fclean && make all
```

**Test with browser DevTools**:
1. Open app at https://localhost:8443
2. Press F12 for DevTools
3. Open Console tab
4. Run diagnostic commands from "Priority 1" above

---

## Next Session Checklist

- [ ] Read this troubleshooting document
- [ ] Check browser console diagnostics (Priority 1)
- [ ] Inspect HTML elements in DevTools (Priority 2)
- [ ] Verify CSS files are loading (Priority 3)
- [ ] Try on different browser (Priority 4)
- [ ] Consider CSS class toggle approach if needed (Priority 5)

---

## Related Issues

- **Related File**: `/frontend/src/TEST_CHECKLIST.md` (has testing procedures)
- **Related Commit**: 5fbfc16 (glass-panel fix - reverted)
- **Related Commit**: 597a734 (analysis document)
- **Related Doc**: `/docs/BUG_ANALYSIS_GLASS_PANEL.md`

---

**Document Created**: 2026-02-08 21:10
**Next Session**: [Tomorrow - Continue from Priority 1 diagnostics]
