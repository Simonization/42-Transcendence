/**
 * useThemeStore Unit Tests
 * Tests for theme state management with reactive DOM updates
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore, initThemeBeforeMount } from '../theme'

describe('useThemeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.removeProperty('color-scheme')
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('initialization', () => {
    it('should initialize with stellar theme when no stored theme', () => {
      const store = useThemeStore()
      expect(store.theme).toBe('stellar')
    })

    it('should initialize with stored theme from localStorage', () => {
      localStorage.setItem('theme', 'dragon')
      const store = useThemeStore()
      expect(store.theme).toBe('dragon')
    })

    it('should default to stellar on invalid stored theme', () => {
      localStorage.setItem('theme', 'invalid-theme')
      const store = useThemeStore()
      expect(store.theme).toBe('stellar')
    })

    it('should apply initial theme to DOM on store creation', () => {
      localStorage.setItem('theme', 'dragon')
      const store = useThemeStore()

      expect(document.documentElement.getAttribute('data-theme')).toBe('dragon')
      expect(document.documentElement.style.colorScheme).toBe('dark')
    })

    it('should handle missing localStorage gracefully', () => {
      const originalLocalStorage = global.localStorage
      // @ts-ignore
      delete global.localStorage

      const store = useThemeStore()
      expect(store.theme).toBe('stellar')

      global.localStorage = originalLocalStorage
    })
  })

  describe('setTheme', () => {
    it('should set theme and update localStorage', () => {
      const store = useThemeStore()
      store.setTheme('dragon')

      expect(store.theme).toBe('dragon')
      expect(localStorage.getItem('theme')).toBe('dragon')
    })

    it('should apply theme to DOM reactively', () => {
      const store = useThemeStore()
      store.setTheme('dragon')

      expect(document.documentElement.getAttribute('data-theme')).toBe('dragon')
      expect(document.documentElement.style.colorScheme).toBe('dark')
    })

    it('should update DOM for stellar theme', () => {
      const store = useThemeStore()
      store.setTheme('stellar')

      expect(document.documentElement.getAttribute('data-theme')).toBe('stellar')
      expect(document.documentElement.style.colorScheme).toBe('light')
    })

    it('should update DOM immediately without page refresh', () => {
      const store = useThemeStore()
      const initialTheme = store.theme

      store.setTheme(initialTheme === 'stellar' ? 'dragon' : 'stellar')

      // DOM should be updated synchronously
      const appliedTheme = document.documentElement.getAttribute('data-theme')
      expect(appliedTheme).toBe(store.theme)
    })

    it('should handle setTheme when localStorage is unavailable', () => {
      const store = useThemeStore()
      const originalLocalStorage = global.localStorage

      // @ts-ignore
      delete global.localStorage

      expect(() => {
        store.setTheme('dragon')
      }).not.toThrow()

      expect(store.theme).toBe('dragon')

      global.localStorage = originalLocalStorage
    })
  })

  describe('toggleTheme', () => {
    it('should toggle from stellar to dragon', () => {
      const store = useThemeStore()
      store.toggleTheme()

      expect(store.theme).toBe('dragon')
      expect(localStorage.getItem('theme')).toBe('dragon')
    })

    it('should toggle from dragon to stellar', () => {
      const store = useThemeStore()
      store.setTheme('dragon')
      store.toggleTheme()

      expect(store.theme).toBe('stellar')
      expect(localStorage.getItem('theme')).toBe('stellar')
    })

    it('should update DOM when toggling', () => {
      const store = useThemeStore()
      const initialTheme = store.theme

      store.toggleTheme()

      const expectedTheme = initialTheme === 'stellar' ? 'dragon' : 'stellar'
      expect(document.documentElement.getAttribute('data-theme')).toBe(expectedTheme)
    })

    it('should toggle multiple times consistently', () => {
      const store = useThemeStore()
      const initial = store.theme

      store.toggleTheme()
      const first = store.theme
      expect(first).not.toBe(initial)

      store.toggleTheme()
      expect(store.theme).toBe(initial)

      store.toggleTheme()
      expect(store.theme).toBe(first)
    })
  })

  describe('isDark computed', () => {
    it('should return true for dragon theme', () => {
      const store = useThemeStore()
      store.setTheme('dragon')
      expect(store.isDark).toBe(true)
    })

    it('should return false for stellar theme', () => {
      const store = useThemeStore()
      store.setTheme('stellar')
      expect(store.isDark).toBe(false)
    })

    it('should update reactively when theme changes', () => {
      const store = useThemeStore()
      expect(store.isDark).toBe(false)

      store.toggleTheme()
      expect(store.isDark).toBe(true)

      store.toggleTheme()
      expect(store.isDark).toBe(false)
    })
  })

  describe('themeName computed', () => {
    it('should return Stellar for stellar theme', () => {
      const store = useThemeStore()
      store.setTheme('stellar')
      expect(store.themeName).toBe('Stellar')
    })

    it('should return Dragon for dragon theme', () => {
      const store = useThemeStore()
      store.setTheme('dragon')
      expect(store.themeName).toBe('Dragon')
    })

    it('should update reactively when theme changes', () => {
      const store = useThemeStore()
      expect(store.themeName).toBe('Stellar')

      store.toggleTheme()
      expect(store.themeName).toBe('Dragon')

      store.toggleTheme()
      expect(store.themeName).toBe('Stellar')
    })
  })

  describe('initThemeBeforeMount', () => {
    it('should apply stored theme to document on app startup', () => {
      localStorage.setItem('theme', 'dragon')
      initThemeBeforeMount()

      expect(document.documentElement.getAttribute('data-theme')).toBe('dragon')
      expect(document.documentElement.style.colorScheme).toBe('dark')
    })

    it('should apply stellar theme when no stored theme', () => {
      initThemeBeforeMount()

      expect(document.documentElement.getAttribute('data-theme')).toBe('stellar')
      expect(document.documentElement.style.colorScheme).toBe('light')
    })

    it('should handle missing document gracefully', () => {
      const originalDocument = global.document
      // @ts-ignore
      delete global.document

      expect(() => {
        initThemeBeforeMount()
      }).not.toThrow()

      global.document = originalDocument
    })
  })

  describe('store isolation', () => {
    it('should create isolated store instances with Pinia', () => {
      const store1 = useThemeStore()
      store1.setTheme('dragon')
      expect(store1.theme).toBe('dragon')

      // Create new Pinia instance and clear localStorage
      localStorage.clear()
      setActivePinia(createPinia())
      const store2 = useThemeStore()

      expect(store2.theme).toBe('stellar')
      expect(store1.theme).toBe('dragon')
    })
  })

  describe('reactive updates', () => {
    it('should keep DOM and state in sync via watchEffect', () => {
      const store = useThemeStore()

      store.setTheme('dragon')
      expect(store.theme).toBe('dragon')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dragon')

      store.setTheme('stellar')
      expect(store.theme).toBe('stellar')
      expect(document.documentElement.getAttribute('data-theme')).toBe('stellar')
    })

    it('should apply theme on every state change', () => {
      const store = useThemeStore()

      for (let i = 0; i < 5; i++) {
        store.toggleTheme()
        const appliedTheme = document.documentElement.getAttribute('data-theme')
        expect(appliedTheme).toBe(store.theme)
      }
    })
  })
})
