# Design Tokens Implementation

Migrate from hardcoded values to centralized design tokens. This project has 80+ tokens defined but only ~17% usage. Reclaim design consistency.

## What Are Design Tokens?

Design tokens are reusable CSS variables that represent design decisions (colors, spacing, typography, effects). Instead of hardcoding `color: #f97316` everywhere, use `var(--color-primary)`.

**Benefits:**
- Single source of truth for design values
- Easy theme switching (Stellar ↔ Dragon)
- Faster refactoring (change token = change everywhere)
- Better collaboration (designers ↔ engineers)

## Token Categories

### Colors
```css
/* Primary brand colors */
--color-primary: #f97316;        /* Stellar orange */
--color-primary-dark: #c2410c;

/* Semantic colors */
--color-success: #22c55e;
--color-error: #ef4444;
--color-warning: #f59e0b;
--color-info: #3b82f6;

/* Neutral scale */
--color-text: #1f2937;
--color-text-muted: #6b7280;
--color-bg: #ffffff;
--color-bg-secondary: #f9fafb;
--color-border: #e5e7eb;
```

### Spacing
```css
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-12: 3rem;      /* 48px */
```

### Typography
```css
--font-family-base: system-ui, -apple-system, sans-serif;
--font-family-mono: 'Monaco', 'Courier New', monospace;

--font-size-xs: 0.75rem;   /* 12px */
--font-size-sm: 0.875rem;  /* 14px */
--font-size-base: 1rem;    /* 16px */
--font-size-lg: 1.125rem;  /* 18px */
--font-size-xl: 1.25rem;   /* 20px */
--font-size-2xl: 1.5rem;   /* 24px */

--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

### Effects
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

--rounded-sm: 0.25rem;
--rounded-base: 0.375rem;
--rounded-md: 0.5rem;
--rounded-lg: 0.75rem;
--rounded-full: 9999px;

--transition-fast: 150ms ease;
--transition-base: 300ms ease;
--transition-slow: 500ms ease;
```

## Using Tokens in Vue Components

### In `<style>` block
```vue
<template>
  <button class="btn">Click me</button>
</template>

<style scoped>
.btn {
  background-color: var(--color-primary);
  color: var(--color-white);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--rounded-md);
  font-size: var(--font-size-sm);
  transition: background-color var(--transition-base);
}

.btn:hover {
  background-color: var(--color-primary-dark);
}
</style>
```

### In `<template>` (inline styles)
```vue
<div :style="{
  padding: 'var(--space-4)',
  color: 'var(--color-text)'
}">
  Content
</div>
```

### Theme Switching
```vue
<script setup>
const theme = ref('stellar')

const setTheme = (newTheme) => {
  theme.value = newTheme
  document.documentElement.setAttribute('data-theme', newTheme)
}
</script>

<template>
  <button @click="setTheme('stellar')">Light</button>
  <button @click="setTheme('dragon')">Dark</button>
</template>

<style>
/* In global.css */
:root[data-theme='stellar'] {
  --color-primary: #f97316;
  --color-bg: #ffffff;
}

:root[data-theme='dragon'] {
  --color-primary: #fbbf24;
  --color-bg: #1a1a1a;
}
</style>
```

## Audit: Finding Hardcoded Values

Search for hardcoded colors, spacing, and sizes:

```bash
# Find hardcoded hex colors
grep -r "#[0-9a-f]\{3,6\}" src/ --include="*.vue" --include="*.css"

# Find px values that should be tokens
grep -r "[0-9]\+px" src/ --include="*.vue" --include="*.css" | grep -E "(padding|margin|width|height|gap|font-size)" | head -20
```

Common patterns to replace:
- `color: #f97316` → `color: var(--color-primary)`
- `padding: 16px` → `padding: var(--space-4)`
- `gap: 8px` → `gap: var(--space-2)`
- `font-size: 14px` → `font-size: var(--font-size-sm)`
- `border-radius: 4px` → `border-radius: var(--rounded-sm)`

## Token Consolidation

**Current state:** 3 duplicate `@keyframes spin` definitions exist in different files.

**Fix:** Create `theme.css` with all tokens + animations once, import everywhere.

```css
/* frontend/src/styles/theme.css */
:root {
  /* Colors */
  --color-primary: #f97316;
  /* ... all tokens ... */
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Import once in main.ts */
import './styles/theme.css'
```

## Common Fixes for This Project

### 1. Auth Pages (Zero Token Usage)
**Before:**
```vue
<style>
.container {
  background: #1a1a1a;
  color: #ffffff;
  padding: 24px 32px;
  gap: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
```

**After:**
```vue
<style>
.container {
  background: var(--color-bg);
  color: var(--color-text);
  padding: var(--space-6) var(--space-8);
  gap: var(--space-3);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-md);
}
</style>
```

### 2. Button Styles (Inconsistent Across Files)
Create `.button` class in global, reuse everywhere:

```css
/* theme.css */
.btn {
  background: var(--color-primary);
  color: white;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--rounded-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: background var(--transition-base);
}

.btn:hover {
  background: var(--color-primary-dark);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 3. Sidebar Width
**Before:**
```vue
<style>
.sidebar { width: 260px; }
.content { flex: 1; }
</style>
```

**After:**
```css
/* Add to theme.css */
--sidebar-width: 260px;
--container-max-width: 1200px;

/* Use in components */
.sidebar { width: var(--sidebar-width); }
```

### 4. Consolidate Animations
Replace 3 separate `@keyframes spin` with one in `theme.css`:
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

## Token Checklist

- [ ] All colors use `--color-*` tokens (no `#` hex in components)
- [ ] All spacing uses `--space-*` tokens (no `px` values for padding/margin/gap)
- [ ] All font sizes use `--font-size-*` tokens
- [ ] All font weights use `--font-weight-*` tokens
- [ ] All border radius uses `--rounded-*` tokens
- [ ] All shadows use `--shadow-*` tokens
- [ ] All transitions use `--transition-*` tokens
- [ ] Duplicate `@keyframes` consolidated in `theme.css`
- [ ] Token names are semantic (not `--color-orange`, use `--color-primary`)
- [ ] Both themes (Stellar/Dragon) use same token structure

## References

- [Design Tokens 101](https://www.figma.com/blog/design-tokens-101/)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Design System Tokens](https://www.designsystems.com/design-tokens-101/)
