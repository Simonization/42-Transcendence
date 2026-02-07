# Vue Responsive Design

Create mobile-first, responsive layouts for Vue components. Essential for supporting 60%+ mobile users.

## Mobile-First Strategy

**Start with mobile, enhance for larger screens:**

```vue
<style scoped>
/* Mobile first (base styles) */
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar {
  width: 100%;
  order: 2; /* Below content on mobile */
}

.content {
  order: 1;
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    flex-direction: row;
  }
  .sidebar {
    width: 260px;
    order: unset;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    gap: 2rem;
  }
}
</style>
```

## Recommended Breakpoints

Define breakpoints in CSS variables for consistency:

```vue
<style>
:root {
  --breakpoint-mobile: 320px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1280px;
}

@media (min-width: 768px) { /* ... */ }
@media (min-width: 1024px) { /* ... */ }
</style>
```

| Breakpoint | Devices | Width |
|-----------|---------|-------|
| Mobile | Phone, small tablet | < 768px |
| Tablet | iPad, large phone | 768px - 1024px |
| Desktop | Laptop, monitor | 1024px - 1280px |
| Wide | Large monitor | > 1280px |

## Responsive Units

**Never use fixed pixels for layout:**

| Unit | Use Case | Example |
|------|----------|---------|
| `rem` | Spacing, font sizes | `padding: 1rem; font-size: 0.875rem` |
| `%` | Widths relative to parent | `width: 50%` |
| `vw/vh` | Viewport-based | `width: 100vw` (avoid due to scrollbar issues) |
| `max-width` | Contain layouts | `max-width: 1200px` |
| `flex` | Flexible sizing | `flex: 1` (grows to fill space) |
| `clamp()` | Fluid sizing | `font-size: clamp(1rem, 2vw, 2rem)` |

## Fluid Typography

Instead of fixed sizes at breakpoints, use `clamp()` for smooth scaling:

```vue
<style>
h1 {
  /* Min: 1.5rem, Preferred: 5%, Max: 3rem */
  font-size: clamp(1.5rem, 5vw, 3rem);
}

body {
  font-size: clamp(0.875rem, 1vw, 1.125rem);
}
</style>
```

## Responsive Layout Patterns

### Two-Column Layout (Sidebar + Content)
```vue
<div class="container">
  <aside class="sidebar">Sidebar</aside>
  <main class="content">Content</main>
</div>

<style scoped>
.container {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .container {
    grid-template-columns: 260px 1fr;
  }

  .sidebar {
    position: sticky;
    top: 0;
    max-height: 100vh;
    overflow-y: auto;
  }
}
</style>
```

### Stack on Mobile, Row on Desktop
```vue
<div class="cards">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
</div>

<style scoped>
.cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr; /* Stack on mobile */
}

@media (min-width: 768px) {
  .cards {
    grid-template-columns: repeat(2, 1fr); /* 2 columns on tablet */
  }
}

@media (min-width: 1024px) {
  .cards {
    grid-template-columns: repeat(3, 1fr); /* 3 columns on desktop */
  }
}
</style>
```

### Responsive Form
```vue
<form class="form">
  <div class="form-row">
    <input placeholder="First name">
    <input placeholder="Last name">
  </div>
  <input placeholder="Email">
  <button>Submit</button>
</form>

<style scoped>
.form-row {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr; /* Stack on mobile */
}

@media (min-width: 768px) {
  .form-row {
    grid-template-columns: 1fr 1fr; /* Side-by-side on tablet+ */
  }
}
</style>
```

## Common Fixes for This Project

### 1. Fixed Dimensions → Responsive
**Before:**
```css
.container {
  width: 800px;
  height: 520px;
}
```

**After:**
```css
.container {
  width: 100%;
  max-width: 800px;
  height: auto;
  min-height: 520px;
}

@media (max-width: 768px) {
  .container {
    max-width: 100%;
  }
}
```

### 2. Sidebar Collapse on Mobile
```vue
<template>
  <div class="layout">
    <aside :class="{ collapsed: !sidebarOpen }">Sidebar</aside>
    <main>Content</main>
  </div>
</template>

<style scoped>
@media (max-width: 768px) {
  aside {
    position: absolute;
    left: 0;
    transform: translateX(-100%);
    transition: transform 200ms;
  }

  aside.collapsed {
    transform: translateX(0);
    z-index: 100;
  }
}
</style>
```

### 3. Chat Layout (Two Column → Stack)
```vue
<div class="chat-container">
  <div class="room-list">Rooms</div>
  <div class="conversation">Messages</div>
</div>

<style scoped>
.chat-container {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr; /* Stack on mobile */
}

@media (min-width: 1024px) {
  .chat-container {
    grid-template-columns: 260px 1fr; /* Side-by-side on desktop */
  }
}
</style>
```

## Testing Responsive Design

### Manual Testing
- [ ] Test on actual mobile device (not just DevTools)
- [ ] Check at 320px, 768px, 1024px widths
- [ ] Verify touch targets are ≥ 44px × 44px
- [ ] Check horizontal scroll doesn't appear
- [ ] Test orientation change (portrait ↔ landscape)
- [ ] Zoom to 200% and verify readability

### Chrome DevTools Testing
1. Open DevTools (F12)
2. Click device toolbar icon or Ctrl+Shift+M
3. Select different devices
4. Rotate screen
5. Test touch interactions

### CSS Media Query Testing (Vitest)
```ts
describe('Responsive Design', () => {
  it('should stack layout on mobile', () => {
    // Mock window.matchMedia
    vi.stubGlobal('matchMedia', (query) => ({
      matches: query.includes('max-width: 768px'),
      media: query,
    }))

    render(LayoutComponent)
    expect(screen.getByRole('main')).toHaveStyle({ display: 'block' })
  })
})
```

## Performance Considerations

- Use `max-width` instead of `width` to prevent overflow
- Avoid `position: fixed` on mobile sidebars (causes scroll issues)
- Test with DevTools throttling (slow 4G) on mobile
- Lazy load images with `loading="lazy"`

## References

- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [CSS Tricks: A Complete Guide to Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Web.dev: Mobile-first CSS](https://web.dev/responsive-web-design-basics/)
- [Can I Use: Media Queries](https://caniuse.com/css-mediaqueries)
