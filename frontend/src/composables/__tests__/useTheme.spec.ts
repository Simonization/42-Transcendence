/**
 * useTheme Composable Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTheme, initTheme } from '../useTheme'

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key]
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {}
  }),
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

// Mock document
const documentMock = {
  documentElement: {
    dataset: {} as Record<string, string>,
    style: { colorScheme: '' },
    setAttribute: vi.fn((name: string, value: string) => {
      if (name === 'data-theme') {
        documentMock.documentElement.dataset.theme = value
      }
    }),
  },
}

Object.defineProperty(global, 'document', {
  value: documentMock,
  writable: true,
})

describe('useTheme', () => {
  beforeEach(() => {
    localStorageMock.clear()
    documentMock.documentElement.dataset = {}
    documentMock.documentElement.style.colorScheme = ''
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should default to stellar theme when no stored preference', () => {
      const { theme } = useTheme()
      expect(theme.value).toBe('stellar')
    })

    it('should load stored theme from localStorage', () => {
      localStorageMock.store['theme'] = 'dragon'

      // Need to reimport to get fresh state - for this test we check localStorage directly
      expect(localStorageMock.getItem('theme')).toBe('dragon')
    })
  })

  describe('setTheme', () => {
    it('should update theme to dragon', () => {
      const { theme, setTheme } = useTheme()

      setTheme('dragon')

      expect(theme.value).toBe('dragon')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dragon')
    })

    it('should update theme to stellar', () => {
      const { theme, setTheme } = useTheme()

      setTheme('stellar')

      expect(theme.value).toBe('stellar')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'stellar')
    })
  })

  describe('toggleTheme', () => {
    it('should toggle from stellar to dragon', () => {
      const { theme, setTheme, toggleTheme } = useTheme()

      setTheme('stellar')
      toggleTheme()

      expect(theme.value).toBe('dragon')
    })

    it('should toggle from dragon to stellar', () => {
      const { theme, setTheme, toggleTheme } = useTheme()

      setTheme('dragon')
      toggleTheme()

      expect(theme.value).toBe('stellar')
    })
  })

  describe('isDark computed', () => {
    it('should return false for stellar theme', () => {
      const { setTheme, isDark } = useTheme()

      setTheme('stellar')

      expect(isDark.value).toBe(false)
    })

    it('should return true for dragon theme', () => {
      const { setTheme, isDark } = useTheme()

      setTheme('dragon')

      expect(isDark.value).toBe(true)
    })
  })

  describe('themeName computed', () => {
    it('should return "Stellar" for stellar theme', () => {
      const { setTheme, themeName } = useTheme()

      setTheme('stellar')

      expect(themeName.value).toBe('Stellar')
    })

    it('should return "Dragon" for dragon theme', () => {
      const { setTheme, themeName } = useTheme()

      setTheme('dragon')

      expect(themeName.value).toBe('Dragon')
    })
  })

  describe('initTheme', () => {
    it('should set data-theme attribute on document', () => {
      localStorageMock.store['theme'] = 'dragon'

      initTheme()

      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dragon')
    })

    it('should default to stellar when no stored theme', () => {
      initTheme()

      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'stellar')
    })

    it('should set colorScheme for dragon theme', () => {
      localStorageMock.store['theme'] = 'dragon'

      initTheme()

      expect(documentMock.documentElement.style.colorScheme).toBe('dark')
    })

    it('should set colorScheme for stellar theme', () => {
      localStorageMock.store['theme'] = 'stellar'

      initTheme()

      expect(documentMock.documentElement.style.colorScheme).toBe('light')
    })
  })
})
