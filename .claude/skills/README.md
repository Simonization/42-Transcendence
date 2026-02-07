# esportendence Frontend Skills Library

Custom Claude Code skills created from the frontend code quality audit and design/UX recommendations.

## Skills by Priority

### TIER 1: Critical (Blocking Issues)

1. **[vue-accessibility](./vue-accessibility/SKILL.md)** - WCAG AA compliance
   - Fix missing form labels
   - Dialog focus management
   - Keyboard navigation patterns
   - ARIA attributes
   - Color contrast verification
   - **Status:** Created ✅
   - **Use when:** Fixing accessibility issues, adding new interactive components

2. **[vue-responsive-design](./vue-responsive-design/SKILL.md)** - Mobile-first layouts
   - Mobile-first CSS strategy
   - Responsive breakpoints and units
   - Layout patterns (sidebar, cards, forms)
   - Testing responsive behavior
   - **Status:** Created ✅
   - **Use when:** Converting fixed layouts to responsive, supporting mobile devices

### TIER 2: High Priority (Major Debt)

3. **[design-tokens-implementation](./design-tokens-implementation/SKILL.md)** - Design system usage
   - Token categories (colors, spacing, typography, effects)
   - CSS custom properties in Vue
   - Finding hardcoded values
   - Consolidating duplicates
   - **Status:** Created ✅
   - **Use when:** Migrating hardcoded values to tokens, unifying themes

4. **[vue-api-integration](./vue-api-integration/SKILL.md)** - Secure auth & API patterns
   - Token validation (not just existence check)
   - Token refresh with race condition prevention
   - 401 error handling
   - Error handling with typed exceptions
   - Request retry logic
   - **Status:** Created ✅
   - **Use when:** Fixing auth bugs, improving API integration, adding error recovery

5. **[websocket-patterns](./websocket-patterns/SKILL.md)** - Real-time communication
   - Socket.io client setup (not raw WebSocket parsing)
   - Type-safe event handling
   - Socket.io composables
   - Connection lifecycle management
   - Error handling & reconnection
   - **Status:** Created ✅
   - **Use when:** Working with Socket.io, real-time features, message handling

6. **[typescript-vue-strict](./typescript-vue-strict/SKILL.md)** - Type safety
   - Strict TypeScript config
   - Typed composables
   - Typed API responses
   - Error type handling
   - Vue prop/emit typing
   - Generic types for reusable logic
   - **Status:** Created ✅
   - **Use when:** Adding features, refactoring code, improving type safety

7. **[design-system-consistency](./design-system-consistency/SKILL.md)** - UI consistency
   - Button patterns and variants
   - Form input standardization
   - Card components
   - Section titles
   - Loading/error states
   - Consistent spacing
   - **Status:** Created ✅
   - **Use when:** Creating new components, refactoring existing ones, unifying UI patterns

## Implementation Roadmap

**Immediate (before next PR):**
- ✅ vue-accessibility
- ✅ vue-responsive-design
- ✅ design-tokens-implementation

**Short-term (this sprint):**
- ✅ vue-api-integration
- ✅ websocket-patterns
- ✅ typescript-vue-strict
- ✅ design-system-consistency

**Medium-term (next sprint):**
- Enhance existing vue-testing with component-specific patterns
- Performance optimization guide

## How to Use These Skills

### In Claude Code

Load a skill in your conversation using the `Skill` tool:

```
/vue-accessibility
```

Or reference by full name:
```
Skill("vue-accessibility")
```

### Examples

**Fix accessibility issues:**
```
User: "Fix accessibility issues in the chat component"
Claude: Invokes vue-accessibility skill
        Reads code-quality-report.md for specific issues
        Applies accessibility patterns from skill
        Creates fixes for missing labels, focus traps, ARIA
```

**Make layout responsive:**
```
User: "Make the sidebar responsive on mobile"
Claude: Invokes vue-responsive-design skill
        Designs mobile-first layout
        Uses CSS media queries properly
        Tests at multiple breakpoints
```

**Migrate to design tokens:**
```
User: "Use design tokens in auth pages"
Claude: Invokes design-tokens-implementation skill
        Identifies hardcoded colors/spacing
        Replaces with CSS variables
        Consolidates duplicate styles
```

## Skill Structure

Each skill has:
- **SKILL.md** - Comprehensive guide with best practices, patterns, code examples, and common fixes
- **Quick reference** - Copy-paste solutions for common problems
- **Testing patterns** - How to verify implementations work
- **References** - Links to official documentation

## Related Documentation

- **Code Quality Report:** `/frontend/docs/code-quality-report.md`
- **Design/UX Report:** `/frontend/docs/design-ux-report.md`
- **Architecture Guide:** `/frontend/docs/architecture.md`
- **Frontend Dev Guide:** `/frontend/docs/frontend_dev.md`

## Recommended Reading Order

1. Start with **vue-accessibility** if you're adding/fixing interactive components
2. Use **vue-responsive-design** for layout work
3. Reference **design-tokens-implementation** when styling components
4. Use **design-system-consistency** to ensure patterns are uniform
5. Apply **typescript-vue-strict** to improve type safety
6. Use **vue-api-integration** when working with API calls
7. Use **websocket-patterns** for real-time features

## Contributing

When adding new patterns or fixes:
1. Update the relevant SKILL.md
2. Include before/after code examples
3. Link to related sections in other docs
4. Test patterns before documenting
5. Update this README with major changes
