# Recommended Skills for esportendence Frontend

Based on code quality and design/UX audit, these skills would provide the most value:

---

## TIER 1: Critical (Blocking Issues)

### 1. **vue-accessibility** ⭐⭐⭐⭐⭐
**Status:** Should be created
**Priority:** P0 - Accessibility is non-negotiable
**Addresses:** 5+ critical accessibility blockers found in audit

**What it would do:**
- Audit Vue components for WCAG AA compliance
- Add missing `<label>` tags to form inputs
- Implement focus trap in ConfirmDialog
- Add `role="dialog"`, `aria-modal` to dialog components
- Guide keyboard navigation patterns (Tab, Arrow keys, Escape)
- Check color contrast ratios
- Add ARIA attributes (aria-label, aria-live, aria-required, etc.)
- Validate form validation feedback (visual + screen reader)

**Use cases for this project:**
- Fix 5 inputs missing labels (AddFriendInput, ChatCard, MessageInput, TwoFactorPage, SecuritySection)
- Make delete button accessible (not just visible on hover)
- Add focus management to modals
- Keyboard-only navigation mode

**Scope:** ~200 lines of guidance + references + checklists

---

### 2. **vue-responsive-design** ⭐⭐⭐⭐⭐
**Status:** Should be created
**Priority:** P0 - Zero media queries = unshippable on mobile
**Addresses:** 0 media queries, fixed dimensions, no responsive layouts

**What it would do:**
- Mobile-first CSS strategy (60% of users likely mobile)
- Teach `@media (max-width: ...)` patterns for Vue SFCs
- Replace fixed dimensions with relative/fluid units
- Breakpoint strategy (mobile, tablet, desktop)
- Responsive layout patterns (grid, flexbox, CSS custom properties)
- Handle fixed sidebars/navigation on mobile
- Test responsive behavior in DevTools

**Use cases for this project:**
- Convert `height: 520px` and `width: 260px` to responsive
- Add mobile breakpoints for chat layout (stack vertically on mobile)
- Make sidebar collapse on small screens
- Responsive forms and modals

**Scope:** ~250 lines + examples for different layout patterns

---

## TIER 2: High Priority (Major Debt)

### 3. **design-tokens-implementation** ⭐⭐⭐⭐
**Status:** Should be created
**Priority:** P1 - Design system not being used
**Addresses:** 83 hardcoded colors, 15+ hardcoded values, zero token usage in auth pages

**What it would do:**
- Audit existing design tokens (you have 80+ defined!)
- Identify hardcoded values blocking token usage
- Guide migration from hardcoded → token values
- Teach CSS custom properties usage in Vue
- Consolidate duplicate styles (e.g., 3 files with @keyframes spin)
- Create token checklist (colors, spacing, typography, effects)
- Document unused tokens for cleanup

**Use cases for this project:**
- Replace 83 hardcoded colors in auth pages with tokens
- Use `--sidebar-width`, `--container-max` instead of pixel values
- Consolidate button styles across project
- Make both themes (Stellar/Dragon) use same token structure

**Scope:** ~300 lines + token audit template + migration checklist

---

### 4. **vue-api-integration** ⭐⭐⭐⭐
**Status:** Should be created
**Priority:** P1 - Auth bugs found
**Addresses:** Auth guard vulnerability, 401 redirect bug, token refresh patterns

**What it would do:**
- Secure auth patterns (validate tokens, not just check existence)
- Token refresh strategies and race condition prevention
- 401 error handling and correct redirects
- Request/response interceptors in Vue
- Error handling patterns (retry logic, exponential backoff)
- API client design patterns
- Mock API for testing

**Use cases for this project:**
- Fix auth guard to validate token, not just check localStorage
- Fix 401 redirect to go to `/auth` not `/login`
- Improve token refresh queueing (your implementation is good, document it)
- Add error recovery for failed requests

**Scope:** ~280 lines + code examples + security checklist

---

### 5. **websocket-patterns** ⭐⭐⭐⭐
**Status:** Should be created
**Priority:** P1 - Fragile WebSocket parsing
**Addresses:** Raw '42' prefix parsing, no Socket.io best practices

**What it would do:**
- Socket.io best practices for Vue
- Message parsing patterns (type-safe, not hardcoded)
- Connection lifecycle (connect, disconnect, reconnect)
- Error handling and reconnection logic
- Type-safe event emission/listening
- Testing real-time features
- Performance (not creating new connections on every render)

**Use cases for this project:**
- Replace raw `data.startsWith('42')` with proper Socket.io client library usage
- Type-safe message handling
- Proper disconnection on component unmount
- Handle network drops gracefully

**Scope:** ~250 lines + Socket.io patterns + examples

---

## TIER 3: Medium Priority (Code Quality)

### 6. **vue-component-testing** ⭐⭐⭐
**Status:** Could enhance existing vue-testing skill
**Priority:** P1 - Zero component tests
**Addresses:** Component testing gap, testing patterns for this codebase

**What it would do:**
- Component snapshot + interaction testing
- Testing props, events, slots
- Mocking composables and API calls
- Testing loading/error/success states
- Testing user interactions (clicks, form input, keyboard)
- Testing component watchers and lifecycle

**Use cases for this project:**
- Test AuthPage with different login states
- Test ChatCard message handling
- Test FriendList friend operations
- Test form components (validation, submission)

**Scope:** Extend existing vue-testing skill with component-specific patterns

---

### 7. **typescript-vue-strict** ⭐⭐⭐
**Status:** Should be created or extend vue-best-practices
**Priority:** P1 - Type safety inconsistencies
**Addresses:** Implicit any, untyped catches, type accuracy

**What it would do:**
- Strict TypeScript config for Vue projects
- Proper typing for composables (return types, state types)
- Generic types for API responses
- Error type handling (not bare `catch (e)`)
- Define types vs interfaces trade-offs
- Template type checking (`lang="ts"`)

**Use cases for this project:**
- Ensure all composables have proper return type annotations
- Type composable state consistently
- Catch blocks use `if (error instanceof ApiError)`
- Generic API client typing

**Scope:** ~200 lines + TypeScript Vue patterns

---

### 8. **design-system-consistency** ⭐⭐⭐
**Status:** Should be created
**Priority:** P2 - UI consistency issues
**Addresses:** Inconsistent patterns (button sizing, form inputs), duplicated code

**What it would do:**
- Button sizing/styling consistency
- Form input standardization
- Section title patterns
- Card styling consistency
- Spacing and alignment standards
- Component state variations (hover, active, disabled, loading)
- Documentation for design patterns

**Use cases for this project:**
- Standardize all inputs on `.field-input` (not `.input` in some places)
- Consistent button padding across all buttons
- Standard error message styling
- Consistent loading indicators

**Scope:** ~250 lines + component pattern library

---

## TIER 4: Nice-to-Have (Optimization)

### 9. **vue-performance-optimization**
**Status:** Already have some guidance via vue-best-practices
**Priority:** P3 - Not urgent but valuable
**Addresses:** General performance (could analyze with profiling)

**What it would do:**
- Lazy loading routes and components
- Reducing re-renders (memoization, computed)
- Virtual scrolling for large lists
- Code splitting strategy
- Bundle analysis

---

### 10. **vue-i18n-setup** (for future)
**Status:** Nice-to-have
**Priority:** P3 - Hardcoded language labels
**Addresses:** Internationalization patterns

**What it would do:**
- i18n setup and patterns for Vue 3
- Translation file structure
- Lazy loading translations
- Pluralization and date/number formatting

---

## Implementation Roadmap

**Immediate (before next PR):**
1. ✅ vue-accessibility - CRITICAL
2. ✅ vue-responsive-design - CRITICAL
3. ✅ design-tokens-implementation - HIGH

**Short-term (this sprint):**
4. vue-api-integration - HIGH
5. websocket-patterns - HIGH
6. vue-component-testing - HIGH

**Medium-term (next sprint):**
7. typescript-vue-strict - MEDIUM
8. design-system-consistency - MEDIUM

**Long-term (when bandwidth):**
9. vue-performance-optimization - LOWER
10. vue-i18n-setup - LOWER

---

## How These Skills Will Be Used

Once created, skills go in `/.claude/skills/` and Claude Code agents will:
1. Invoke them with `Skill("vue-accessibility")` to load guidance
2. Use the skill's patterns and checklists when working on related tasks
3. Reference the skill's best practices in code reviews
4. Apply skill patterns when refactoring or adding new features

Example workflow:
```
User: "Fix accessibility issues in the app"
Claude: Invokes vue-accessibility skill
        Reads code-quality-report.md for specific issues
        Applies accessibility patterns from skill
        Creates fixes for missing labels, focus traps, ARIA
```
