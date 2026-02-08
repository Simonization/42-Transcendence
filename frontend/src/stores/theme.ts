/**
 * Theme Store
 * Manages dual-theme system: Stellar (clean/white) vs Dragon (dark/gold)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

/**
 * Initialize theme on app startup before mount
 * Call this in main.ts to prevent flash
 */
export function initThemeBeforeMount(): void {
  applyThemeToDocument(getStoredTheme())
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeMode>(getStoredTheme())

  /**
   * Set theme and persist to localStorage
   */
  const setTheme = (newTheme: ThemeMode): void => {
    theme.value = newTheme
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', newTheme)
    }
    applyThemeToDocument(newTheme)
  }

  /**
   * Toggle between themes
   */
  const toggleTheme = (): void => {
    setTheme(theme.value === 'stellar' ? 'dragon' : 'stellar')
  }

  /**
   * Check if current theme is dark (dragon)
   */
  const isDark = computed(() => theme.value === 'dragon')

  /**
   * Theme display names
   */
  const themeName = computed(() =>
    theme.value === 'stellar' ? 'Stellar' : 'Dragon'
  )

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    themeName,
  }
})
