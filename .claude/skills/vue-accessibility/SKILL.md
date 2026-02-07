# Vue Accessibility (WCAG AA Compliance)

Audit and fix Vue components for WCAG AA accessibility standards. Critical for inclusive web applications.

## Quick Reference

### Missing Labels (Critical)
Every form input needs an associated `<label>`:
```vue
<!-- ❌ Inaccessible -->
<input type="text" placeholder="Email">

<!-- ✅ Accessible -->
<label for="email">Email</label>
<input id="email" type="text" placeholder="Email">
```

### Dialog/Modal Accessibility
Dialogs must have proper ARIA attributes:
```vue
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
  <p>Are you sure?</p>
</div>
```

### Focus Management
- Trap focus inside modals (tab cycles within dialog)
- Restore focus when modal closes
- Show visible focus indicator (`:focus` outline, not removed)

```vue
<script setup>
const dialogRef = ref(null)

const trapFocus = (e) => {
  const focusableElements = dialogRef.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault()
      lastElement.focus()
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault()
      firstElement.focus()
    }
  }
}

onMounted(() => {
  dialogRef.value?.addEventListener('keydown', trapFocus)
})
</script>
```

### Keyboard Navigation
- **Escape** closes dialogs
- **Tab** cycles through interactive elements
- **Arrow keys** navigate lists/menus
- **Enter/Space** activates buttons

### ARIA Attributes Essential List
| Attribute | Use Case | Example |
|-----------|----------|---------|
| `aria-label` | Describe icon buttons | `<button aria-label="Close">×</button>` |
| `aria-live` | Announce dynamic updates | `<div aria-live="polite">Message sent</div>` |
| `aria-required` | Mark required fields | `<input aria-required="true">` |
| `aria-invalid` | Mark invalid fields | `<input aria-invalid="true" aria-describedby="error">` |
| `aria-describedby` | Link input to error text | `<span id="error">Email is required</span>` |
| `aria-hidden` | Hide decorative elements | `<span aria-hidden="true">→</span>` |

### Color Contrast
Minimum 4.5:1 for normal text, 3:1 for large text (18pt+)

Use tools:
- Chrome DevTools → Inspect → Styles → color picker
- WebAIM contrast checker: https://webaim.org/resources/contrastchecker/

### Validation Messages
Must be visible to both sighted and screen reader users:
```vue
<div v-if="errors.email" id="email-error" class="error" role="alert">
  Email is required
</div>
<input aria-describedby="email-error" />
```

## Common Fixes for This Project

### 1. AddFriendInput - Add label
```vue
<div class="field">
  <label for="friend-input">Add friend</label>
  <input id="friend-input" v-model="input" type="text" placeholder="Username or ID">
</div>
```

### 2. ChatCard/MessageInput - Form inputs
- Add `<label>` for message input
- Add `aria-label` for send button

### 3. TwoFactorPage - Input labeling
- Label for 2FA code input
- Describe required format

### 4. SecuritySection - Delete button
- Make button always keyboard accessible (not just hover)
- Add confirmation dialog with proper focus management

### 5. ConfirmDialog - Modal accessibility
- Add `role="dialog"` + `aria-modal="true"`
- Trap focus inside
- Implement Escape to close

## Testing Accessibility

### Manual Testing Checklist
- [ ] Tab through page - can you reach every interactive element?
- [ ] Close eyes/use screen reader - is content understandable?
- [ ] Zoom to 200% - does layout stay usable?
- [ ] Disable images - are replacements clear?
- [ ] Check colors with WebAIM contrast tool

### Automated Testing (Vitest)
```ts
import { render, screen } from '@vue/test-utils'
import { axe } from 'vitest-axe' // if available

it('should have no accessibility violations', async () => {
  const { container } = render(MyComponent)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})

it('should have input label', () => {
  render(MyComponent)
  expect(screen.getByLabelText('Email')).toBeInTheDocument()
})
```

### Keyboard Testing Checklist
- [ ] Can tab to all buttons
- [ ] Can Enter/Space to activate
- [ ] Escape closes modals
- [ ] Focus is visible (not `outline: none`)
- [ ] Focus trap in dialogs

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN: ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [WebAIM: Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Vue Accessibility Resources](https://vue-a11y.com/)
