# Design System Consistency

Enforce consistent design patterns across all components. Reduce code duplication, improve maintainability, and create a unified user experience.

## Consistent Button Patterns

**All buttons should use the same base style:**

```vue
<!-- ✅ Consistent button component -->
<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
})
</script>

<template>
  <button
    :class="['btn', `btn-${variant}`, `btn-${size}`, { 'btn-disabled': disabled }]"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="spinner" />
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: none;
  border-radius: var(--rounded-md);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  transition: all var(--transition-base);
  cursor: pointer;
  outline: 2px solid transparent;
  outline-offset: 2px;
}

/* Size variants */
.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
}

.btn-md {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
}

.btn-lg {
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-base);
}

/* Color variants */
.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-border);
}

.btn-danger {
  background: var(--color-error);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-ghost {
  background: transparent;
  color: var(--color-text);
}

.btn-ghost:hover {
  background: var(--color-bg-secondary);
}

/* Disabled state */
.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Focus state (keyboard navigation) */
.btn:focus-visible {
  outline-color: var(--color-primary);
}

/* Full width variant */
.btn:has(+ .full-width),
.btn.full-width {
  width: 100%;
}
</style>
```

## Consistent Form Inputs

**Standardize all input fields:**

```vue
<!-- FormInput.vue -->
<script setup lang="ts">
interface Props {
  label?: string
  type?: string
  placeholder?: string
  value?: string | number
  error?: string
  required?: boolean
  disabled?: boolean
  maxlength?: number
}

const emit = defineEmits<{
  (e: 'update:value', value: string): void
}>()
</script>

<template>
  <div class="field">
    <label v-if="label" :for="`input-${Math.random()}`" class="field-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <input
      :id="`input-${Math.random()}`"
      :type="type || 'text'"
      :value="value"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :aria-required="required"
      :aria-invalid="!!error"
      :aria-describedby="error ? `error-${Math.random()}` : undefined"
      class="field-input"
      @input="emit('update:value', ($event.target as HTMLInputElement).value)"
    />
    <div v-if="error" :id="`error-${Math.random()}`" class="field-error" role="alert">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-label {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.required {
  color: var(--color-error);
}

.field-input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text);
  transition: all var(--transition-base);
}

.field-input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.field-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.field-input[aria-invalid='true'] {
  border-color: var(--color-error);
}

.field-error {
  color: var(--color-error);
  font-size: var(--font-size-xs);
}
</style>
```

## Consistent Cards

**Use consistent card styling throughout:**

```vue
<!-- Card.vue -->
<script setup lang="ts">
interface Props {
  variant?: 'default' | 'interactive' | 'error'
  padding?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
})
</script>

<template>
  <div :class="['card', `card-${variant}`, `card-${padding}`]">
    <slot />
  </div>
</template>

<style scoped>
.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.card-sm {
  padding: var(--space-3);
}

.card-md {
  padding: var(--space-4);
}

.card-lg {
  padding: var(--space-6);
}

.card-default {
  border-color: var(--color-border);
}

.card-default:hover {
  box-shadow: var(--shadow-md);
}

.card-interactive {
  cursor: pointer;
  border-color: var(--color-primary);
  background: var(--color-bg-secondary);
}

.card-interactive:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-dark);
}

.card-error {
  border-color: var(--color-error);
  background: rgba(239, 68, 68, 0.05);
}
</style>
```

## Consistent Section Titles

**All sections should have consistent heading styles:**

```vue
<script setup lang="ts">
interface Props {
  level?: 'h1' | 'h2' | 'h3'
  subtitle?: string
}

withDefaults(defineProps<Props>(), {
  level: 'h2',
})
</script>

<template>
  <div class="section-header">
    <component :is="level" class="section-title">
      <slot />
    </component>
    <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
}

.section-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0;
}

.section-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0;
}
</style>
```

## Consistent Loading & Error States

**Show loading, error, and empty states consistently:**

```vue
<!-- AsyncContent.vue - Wrapper for async content -->
<script setup lang="ts">
interface Props {
  loading?: boolean
  error?: Error | null
  empty?: boolean
  emptyMessage?: string
}

withDefaults(defineProps<Props>(), {
  emptyMessage: 'No items found',
})
</script>

<template>
  <!-- Loading state -->
  <div v-if="loading" class="state-container">
    <div class="spinner" />
    <p>Loading...</p>
  </div>

  <!-- Error state -->
  <div v-else-if="error" class="state-container error">
    <p class="error-icon">⚠️</p>
    <p>{{ error.message }}</p>
    <button @click="$emit('retry')" class="btn-retry">Retry</button>
  </div>

  <!-- Empty state -->
  <div v-else-if="empty" class="state-container">
    <p class="empty-icon">📭</p>
    <p>{{ emptyMessage }}</p>
  </div>

  <!-- Content -->
  <template v-else>
    <slot />
  </template>
</template>

<style scoped>
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  gap: var(--space-3);
  color: var(--color-text-muted);
}

.state-container.error {
  color: var(--color-error);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 3rem;
}

.btn-retry {
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--rounded-md);
  cursor: pointer;
}
</style>
```

## Consistent Spacing

**Use space scale consistently:**

```css
/* All spacing from tokens, never hardcoded */
.section {
  margin-bottom: var(--space-6);    /* 24px */
}

.form {
  gap: var(--space-4);              /* 16px between fields */
}

.list-item {
  padding: var(--space-3) var(--space-4); /* 12px top/bottom, 16px left/right */
}

.card {
  padding: var(--space-6);           /* 24px */
}

.sidebar {
  padding: var(--space-4);           /* 16px */
  gap: var(--space-3);               /* 12px between items */
}
```

## Common Fixes for This Project

### 1. Consolidate Button Styles
**Current:** Different padding/colors in different components

**Fix:** Create `.btn` base component, use everywhere

### 2. Standardize Form Inputs
**Current:** `ChatCard` uses `.input`, `MessageInput` uses different styles

**Fix:** Create `FormInput` component, use in all forms

### 3. Consistent Loading Indicators
**Current:** 3 different spinner implementations

**Fix:** Create `LoadingSpinner` component

### 4. Standardize Empty States
**Current:** No consistent empty state UI

**Fix:** Create `EmptyState` or use `AsyncContent` wrapper

## Design System Checklist

- [ ] All buttons use `.btn` base class + variants
- [ ] All form inputs use `FormInput` component
- [ ] All cards use `Card` component
- [ ] All section headers use `SectionHeader` component
- [ ] All spacing from `--space-*` tokens
- [ ] All colors from `--color-*` tokens
- [ ] All font sizes from `--font-size-*` tokens
- [ ] All shadows from `--shadow-*` tokens
- [ ] All border radius from `--rounded-*` tokens
- [ ] All transitions from `--transition-*` tokens
- [ ] Loading states use `LoadingSpinner`
- [ ] Empty states use `EmptyState` or `AsyncContent`
- [ ] Error messages styled consistently
- [ ] Keyboard navigation works everywhere
- [ ] Focus indicators visible on all interactive elements

## References

- [Atomic Design Methodology](https://bradfrost.com/blog/post/atomic-web-design/)
- [Design Systems vs Style Guides](https://www.designsystems.com/)
- [Component Naming Best Practices](https://www.smashingmagazine.com/2016/06/designing-a-robust-class-naming-system/)
