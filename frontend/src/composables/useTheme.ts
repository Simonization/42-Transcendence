/**
 * Theme Composable
 * Manages dual-theme system: Stellar (clean/white) vs Dragon (dark/gold)
 * Inspired by Quantum Break UI design system
 */

import { ref, computed, watchEffect } from 'vue'

export type ThemeMode = 'stellar' | 'dragon'

// Global reactive state (shared across components)
const currentTheme = ref<ThemeMode>(
  (typeof localStorage !== 'undefined'
    ? localStorage.getItem('theme') as ThemeMode
    : null) || 'stellar'
)

export function useTheme() {
  /**
   * Set theme and persist to localStorage
   */
  const setTheme = (theme: ThemeMode): void => {
    currentTheme.value = theme
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', theme)
    }
  }

  /**
   * Toggle between themes
   */
  const toggleTheme = (): void => {
    setTheme(currentTheme.value === 'stellar' ? 'dragon' : 'stellar')
  }

  /**
   * Check if current theme is dark (dragon)
   */
  const isDark = computed(() => currentTheme.value === 'dragon')

  /**
   * Theme display names
   */
  const themeName = computed(() =>
    currentTheme.value === 'stellar' ? 'Stellar' : 'Dragon'
  )

  /**
   * Apply theme to document on change
   */
  watchEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', currentTheme.value)
      // Also set color-scheme for native elements
      document.documentElement.style.colorScheme =
        currentTheme.value === 'dragon' ? 'dark' : 'light'
    }
  })

  return {
    theme: currentTheme,
    setTheme,
    toggleTheme,
    isDark,
    themeName,
  }
}

/**
 * Initialize theme on app startup
 * Call this in main.ts or App.vue setup
 */
export function initTheme(): void {
  const stored = localStorage.getItem('theme') as ThemeMode | null
  const theme = stored || 'stellar'
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme === 'dragon' ? 'dark' : 'light'
}
