# Browser Testing Checklist - Theme Toggle & Bracket Tab Fix

**Date**: 2026-02-08
**Build**: Fresh restart of all Docker services
**Focus**: Verify bracket tab fix + investigate theme/freezing issues

---

## Test 1: Bracket Tab Fix ✅ (MUST PASS)

### Scenario: Navigate tournament detail tabs

**Steps**:
1. ✅ Open app at https://localhost
2. ✅ Login (use test account if available)
3. ✅ Navigate to a tournament (e.g., `/menu/tournaments/1`)
4. ✅ Click the **BRACKET** tab
   - Expected: Tab content appears with glass panel styling (bordered box)
   - **Bug if**: Content is empty, invisible, or unstyled
5. ✅ Click **OVERVIEW** tab
   - Expected: Tournament info displays with background/border
   - **Bug if**: Content is empty or missing
6. ✅ Click **PARTICIPANTS** tab
   - Expected: Participant list displays
   - **Bug if**: Content is empty
7. ✅ Click **CHAT** tab
   - Expected: Chat placeholder appears with styling
   - **Bug if**: Content is empty
8. ✅ Repeat steps 4-7 multiple times
   - Expected: All tabs consistently render
   - **Bug if**: Tabs become empty after switching

**Result**: ✅ PASS / ❌ FAIL

---

## Test 2: Theme Toggle Functionality

### Scenario: Switch between Stellar and Dragon themes

**Initial Check**:
1. Look at the top-right corner for theme toggle button
2. Note current theme (should show "STELLAR" or "DRAGON")
3. Check document has `data-theme` attribute (DevTools → Elements → `<html>`)

**Steps**:
1. ✅ Click the theme toggle button (top-right)
   - Expected: Theme label changes to opposite theme
   - Expected: Page colors change smoothly
   - Expected: `data-theme` attribute updates
   - Expected: localStorage `theme` key updates
   - **Bug if**: Button doesn't respond, colors don't change, attribute doesn't update

2. ✅ Click again to switch back
   - Expected: Returns to original theme
   - **Bug if**: No change occurs

3. ✅ Refresh the page (F5)
   - Expected: Page loads with the selected theme (persisted)
   - **Bug if**: Theme reverts to default, not persisted

4. ✅ Multiple rapid clicks
   - Expected: Smooth transitions, no freezing
   - **Bug if**: UI becomes unresponsive, animations stutter

**Debugging if Theme Toggle Broken**:
- Open DevTools (F12) → Console
- Check for errors when clicking theme toggle
- Run: `localStorage.getItem('theme')` → Should show 'stellar' or 'dragon'
- Run: `document.documentElement.getAttribute('data-theme')` → Should match localStorage
- Check network tab for failed requests

**Result**: ✅ PASS / ❌ FAIL

---

## Test 3: Window Freezing Issues

### Scenario: Navigate between menu sections

**Steps**:
1. ✅ Open a menu card (e.g., Chat, Friends, User Profile)
2. ✅ Interact with content (click buttons, type in inputs, scroll)
   - Expected: Smooth, responsive interactions
   - **Bug if**: UI freezes, buttons don't respond, inputs lag
3. ✅ Switch between different menu items using left sidebar
   - Expected: Cards load/display immediately
   - **Bug if**: Cards appear frozen, content doesn't load
4. ✅ Perform multiple rapid interactions
   - Expected: No freezing, no need to refresh
   - **Bug if**: App requires page refresh to work again
5. ✅ Open DevTools → Performance tab
   - Record interaction
   - Expected: Smooth frame rate (60 FPS target)
   - **Bug if**: Dropped frames, jank, or long tasks

**Debugging if Freezing Occurs**:
- Open DevTools → Console → Check for errors
- Look for infinite loops or errors in console
- Check Network tab for stuck requests
- Memory usage: DevTools → Memory → Take heap snapshot
  - Expected: Reasonable memory usage
  - **Bug if**: Memory continuously grows (leak)

**Result**: ✅ PASS / ❌ FAIL

---

## Test 4: Combined Stress Test

### Scenario: Normal user workflow

**Steps**:
1. ✅ Navigate to tournaments
2. ✅ Click on a tournament detail
3. ✅ Click through all tabs (Overview → Bracket → Participants → Chat)
4. ✅ Toggle theme while viewing tournament
5. ✅ Go back to menu, switch theme again
6. ✅ Navigate to different menu items (Chat, Friends, Profile)
7. ✅ Toggle theme multiple times
8. ✅ Refresh page (F5) and verify theme persists
9. ✅ Everything still responsive?

**Result**: ✅ PASS / ❌ FAIL

---

## Known Issues to Ignore

- WebSocket tests have mock issues (not affecting production code)
- pgAdmin might show warnings (not critical)
- Some animations may not run if reduced-motion is enabled

---

## If You Find Issues

### Theme Toggle Not Working:

**Possible Causes**:
1. **Stale cache**: Ctrl+Shift+Delete → Clear browsing data → Hard reload (Ctrl+Shift+R)
2. **Old data in localStorage**: DevTools → Application → LocalStorage → Clear
3. **Docker stale state**: Run `make fclean && make all` (full rebuild)

### Bracket Tab Empty:

**Possible Causes**:
1. **CSS not loaded**: Check DevTools → Elements → bracket section for `glass-panel` class
2. **Component error**: Check console for JavaScript errors
3. **State issue**: Refresh page (F5)

### Freezing/Lag:

**Possible Causes**:
1. **Memory leak**: Reload page
2. **Infinite loop**: Check console for errors
3. **Docker resource limits**: Restart Docker, check system resources
4. **Network issues**: Check Network tab in DevTools for failed requests

---

## Quick Command Reference

**In browser DevTools Console**:

```javascript
// Check theme state
localStorage.getItem('theme')
document.documentElement.getAttribute('data-theme')

// Manually set theme
localStorage.setItem('theme', 'dragon')
document.documentElement.setAttribute('data-theme', 'dragon')

// Check for errors
// Just scroll up in console to see error logs
```

**From terminal**:

```bash
# View frontend logs in real-time
docker logs ft_frontend -f

# Rebuild everything fresh
make fclean && make all

# Restart services
make down && make up
```

---

## Test Results Template

**Date**: ___________
**Tester**: ___________

| Test | Result | Notes |
|------|--------|-------|
| Bracket Tab Fix | ✅ / ❌ | ___________ |
| Theme Toggle | ✅ / ❌ | ___________ |
| Window Freezing | ✅ / ❌ | ___________ |
| Stress Test | ✅ / ❌ | ___________ |

**Overall Status**: ✅ READY / ⚠️ NEEDS FIXES

**Issues Found**:
- [ ] Issue 1
- [ ] Issue 2
- [ ] Issue 3

---

Generated: 2026-02-08 | Frontend Build: 597a734
