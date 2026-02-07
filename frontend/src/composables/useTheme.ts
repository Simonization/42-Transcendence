/**
 * Theme Composable
 * Manages dual-theme system: Stellar (clean/white) vs Dragon (dark/gold)
 * Inspired by Quantum Break UI design system
 */

import { ref, computed, watchEffect, readonly } from 'vue'

export type ThemeMode = 'stellar' | 'dragon'

const VALID_THEMES: ThemeMode[] = ['stellar', 'dragon']

/**
 * Get stored theme from localStorage with validation
 */
const getStoredTheme = (): ThemeMode => {
  if (typeof localStorage === 'undefined') return 'stellar'
  const stored = localStorage.getItem('theme')
  return stored && VALID_THEMES.includes(stored as ThemeMode)
    ? (stored as ThemeMode)
    : 'stellar'
}

/**
 * Apply theme to document element
 */
function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme === 'dragon' ? 'dark' : 'light'
}

// Global reactive state (shared across components)
const currentTheme = ref<ThemeMode>(getStoredTheme())

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
    applyThemeToDocument(currentTheme.value)
  })

  return {
    theme: readonly(currentTheme),
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
  applyThemeToDocument(getStoredTheme())
}
