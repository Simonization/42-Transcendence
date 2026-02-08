/**
 * Test Setup
 * Global test configuration with Pinia initialization for component tests
 */

import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'

// Create and set active Pinia for each test file
const pinia = createPinia()
setActivePinia(pinia)

// Reset Pinia state before each test
beforeEach(() => {
  setActivePinia(createPinia())
})

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Note: API module tests define their own local vi.mock() calls
// which take precedence over any global mocks.
// Do NOT mock API modules globally here - it will interfere with
// API unit tests that need to mock the base api() function with
// their own implementations for testing various scenarios.
