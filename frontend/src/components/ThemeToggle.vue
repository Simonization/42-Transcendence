<script setup lang="ts">
/**
 * Theme Toggle Component
 * Switches between Stellar (light) and Dragon (dark) themes
 * Quantum Break inspired minimal design
 */

import { useThemeStore } from '../stores/theme'

const themeStore = useThemeStore()
const { theme, toggleTheme, themeName } = themeStore
</script>

<template>
  <button
    class="theme-toggle"
    @click="toggleTheme"
    :title="`Switch to ${theme === 'stellar' ? 'Dragon' : 'Stellar'} theme`"
    :aria-label="`Current theme: ${themeName}. Click to switch.`"
    :aria-pressed="theme === 'dragon'"
  >
    <span class="theme-toggle-track">
      <span class="theme-toggle-indicator" :class="theme">
        <!-- Stellar icon: geometric star/rocket -->
        <svg
          v-if="theme === 'stellar'"
          class="theme-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polygon points="12,2 15,9 22,9 17,14 19,22 12,18 5,22 7,14 2,9 9,9" />
        </svg>

        <!-- Dragon icon: flame/dragon -->
        <svg
          v-else
          class="theme-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 2c.5 2 2 4 4 5-2 1-3 3-3 5 0-2-1-4-3-5 2-1 3.5-3 4-5h-2z" />
          <path d="M8 14c-2 2-3 5-2 8 1-2 3-3 5-3s4 1 5 3c1-3 0-6-2-8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </span>
    </span>
    <span class="theme-label">{{ themeName }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: opacity var(--duration-fast) var(--ease-default);
}

.theme-toggle:hover {
  opacity: 0.8;
}

.theme-toggle-track {
  position: relative;
  width: 52px;
  height: 28px;
  background: var(--bg-tertiary);
  clip-path: polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%);
  border: 1px solid var(--border-default);
  transition: all var(--duration-normal) var(--ease-default);
}

.theme-toggle-indicator {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-normal) var(--ease-bounce);
}

.theme-toggle-indicator.stellar {
  left: 2px;
  background: var(--accent-primary);
  color: white;
  box-shadow: 0 2px 4px rgba(255, 106, 0, 0.3);
}

.theme-toggle-indicator.dragon {
  left: calc(100% - 24px);
  background: var(--accent-primary);
  color: var(--bg-primary);
  box-shadow: var(--shadow-glow-sm);
}

.theme-icon {
  width: 14px;
  height: 14px;
}

.theme-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  min-width: 50px;
}
</style>
