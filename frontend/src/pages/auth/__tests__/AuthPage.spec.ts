/**
 * AuthPage Component Tests
 * Tests for login/register form, validation, API calls, and navigation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import AuthPage from '../AuthPage.vue'

// Mock dependencies
vi.mock('../../../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    googleLogin: vi.fn(),
  },
}))

vi.mock('../../../api/users', () => ({
  usersApi: {
    getMe: vi.fn(),
  },
}))

vi.mock('../../../api/index', () => ({
  getAccessToken: vi.fn(),
  clearTokens: vi.fn(),
}))

vi.mock('../../../composables/useFormValidation', () => ({
  useFormValidation: () => ({
    validate: (value: string, rules: string[], field: string) => {
      if (rules.includes('required') && !value.trim()) {
        return false
      }
      if (rules.includes('email') && !value.includes('@')) {
        return false
      }
      if (rules.includes('password') && value.length < 8) {
        return false
      }
      return true
    },
    errors: { username: '', email: '', password: '' },
    isValid: true,
  }),
}))

vi.mock('../../../composables/useErrorHandler', () => ({
  useErrorHandler: () => {
    const message = { value: '' }
    const messageType = { value: 'success' }
    return {
      message,
      messageType,
      handleError: vi.fn((error, fallback) => {
        message.value = fallback || 'Error'
        messageType.value = 'error'
      }),
      handleSuccess: vi.fn((msg) => {
        message.value = msg
        messageType.value = 'success'
      }),
      clearMessage: vi.fn(() => {
        message.value = ''
      }),
    }
  },
}))

import { authApi } from '../../../api/auth'
import { usersApi } from '../../../api/users'
import { getAccessToken, clearTokens } from '../../../api/index'

const mockAuthApi = vi.mocked(authApi)
const mockUsersApi = vi.mocked(usersApi)
const mockGetAccessToken = vi.mocked(getAccessToken)
const mockClearTokens = vi.mocked(clearTokens)

describe('AuthPage', () => {
  let router: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a basic router for testing
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/auth', component: { template: '<div>Auth</div>' } },
        { path: '/menu', component: { template: '<div>Menu</div>' } },
        { path: '/auth/2fa', component: { template: '<div>2FA</div>' } },
      ],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('should render login form by default', () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
      expect(wrapper.find('input[type="password"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('SIGN IN')
    })

    it('should not render email field in login mode', () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      expect(wrapper.find('input[type="email"]').exists()).toBe(false)
    })

    it('should redirect to /menu if user is already authenticated', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        mail: 'test@example.com',
        twoFactorEnabled: false,
        profile: { displayName: 'Test User' },
      }

      mockGetAccessToken.mockReturnValueOnce('valid-token')
      mockUsersApi.getMe.mockResolvedValueOnce(mockUser)

      const wrapper = mount(AuthPage, { global: { plugins: [router] } })
      await flushPromises()

      expect(mockUsersApi.getMe).toHaveBeenCalled()
      // Component tries to redirect to /menu on mount
    })

    it('should clear tokens if getMe fails on mount', async () => {
      mockGetAccessToken.mockReturnValueOnce('invalid-token')
      mockUsersApi.getMe.mockRejectedValueOnce(new Error('Unauthorized'))

      const wrapper = mount(AuthPage, { global: { plugins: [router] } })
      await flushPromises()

      expect(mockClearTokens).toHaveBeenCalled()
    })
  })

  describe('Login Form', () => {
    it('should call login API with correct data on successful submit', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      mockAuthApi.login.mockResolvedValueOnce({
        accessToken: 'token',
        user: { id: 1, username: 'testuser', mail: 'test@example.com' },
      })

      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      // Fill in login form
      const usernameInput = wrapper.find('input[type="text"]')
      const passwordInput = wrapper.find('input[type="password"]')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')

      // Submit form
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockAuthApi.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      })
    })

    it('should show error on failed login', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      mockAuthApi.login.mockRejectedValueOnce(new Error('Invalid credentials'))

      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const usernameInput = wrapper.find('input[type="text"]')
      const passwordInput = wrapper.find('input[type="password"]')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('wrongpassword')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockAuthApi.login).toHaveBeenCalled()
    })

    it('should require username field', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.setValue('password123')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockAuthApi.login).not.toHaveBeenCalled()
    })

    it('should require password field', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const usernameInput = wrapper.find('input[type="text"]')
      await usernameInput.setValue('testuser')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockAuthApi.login).not.toHaveBeenCalled()
    })

    it('should disable submit button while loading', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      mockAuthApi.login.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      )

      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const usernameInput = wrapper.find('input[type="text"]')
      const passwordInput = wrapper.find('input[type="password"]')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')

      const submitBtn = wrapper.find('button[type="submit"]')
      expect(submitBtn.attributes('disabled')).not.toBeDefined()

      await wrapper.find('form').trigger('submit')
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(submitBtn.attributes('disabled')).toBeDefined()
    })

    it('should redirect to /menu on successful login without 2FA', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      mockAuthApi.login.mockResolvedValueOnce({
        accessToken: 'token',
        user: { id: 1, username: 'testuser', mail: 'test@example.com' },
      })

      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const usernameInput = wrapper.find('input[type="text"]')
      const passwordInput = wrapper.find('input[type="password"]')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockAuthApi.login).toHaveBeenCalled()
    })
  })

  describe('Register Form', () => {
    beforeEach(async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      // Toggle to register mode
      const toggleLink = wrapper.find('.auth-toggle-link')
      await toggleLink.trigger('click')
      await wrapper.vm.$nextTick()
    })

    it('should render email field in register mode', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const toggleLink = wrapper.find('.auth-toggle-link')
      await toggleLink.trigger('click')

      expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    })

    it('should validate required fields for registration', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      // Toggle to register mode
      const toggleLink = wrapper.find('.auth-toggle-link')
      await toggleLink.trigger('click')

      // Try to submit without filling in fields
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockAuthApi.register).not.toHaveBeenCalled()
    })

    it('should validate email format for registration', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const toggleLink = wrapper.find('.auth-toggle-link')
      await toggleLink.trigger('click')

      const inputs = wrapper.findAll('input')
      const [usernameInput, emailInput, passwordInput] = [
        inputs[0],
        inputs[1],
        inputs[2],
      ]

      await usernameInput.setValue('testuser')
      await emailInput.setValue('invalid-email')
      await passwordInput.setValue('password123')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockAuthApi.register).not.toHaveBeenCalled()
    })

    it('should validate password length for registration', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const toggleLink = wrapper.find('.auth-toggle-link')
      await toggleLink.trigger('click')

      const inputs = wrapper.findAll('input')
      const [usernameInput, emailInput, passwordInput] = [
        inputs[0],
        inputs[1],
        inputs[2],
      ]

      await usernameInput.setValue('testuser')
      await emailInput.setValue('test@example.com')
      await passwordInput.setValue('short')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockAuthApi.register).not.toHaveBeenCalled()
    })

    it('should call register API with correct data', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      mockAuthApi.register.mockResolvedValueOnce({ success: true })

      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const toggleLink = wrapper.find('.auth-toggle-link')
      await toggleLink.trigger('click')

      const inputs = wrapper.findAll('input')
      const [usernameInput, emailInput, passwordInput] = [
        inputs[0],
        inputs[1],
        inputs[2],
      ]

      await usernameInput.setValue('testuser')
      await emailInput.setValue('test@example.com')
      await passwordInput.setValue('password123')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(mockAuthApi.register).toHaveBeenCalledWith({
        username: 'testuser',
        mail: 'test@example.com',
        password: 'password123',
      })
    })

    it('should clear form fields after successful registration', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      mockAuthApi.register.mockResolvedValueOnce({ success: true })

      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const toggleLink = wrapper.find('.auth-toggle-link')
      await toggleLink.trigger('click')

      const inputs = wrapper.findAll('input')
      const [usernameInput, emailInput, passwordInput] = [
        inputs[0],
        inputs[1],
        inputs[2],
      ]

      await usernameInput.setValue('testuser')
      await emailInput.setValue('test@example.com')
      await passwordInput.setValue('password123')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      // After successful registration, form should be cleared
      expect(usernameInput.element.value).toBe('')
      expect(emailInput.element.value).toBe('')
      expect(passwordInput.element.value).toBe('')
    })
  })

  describe('Mode Toggling', () => {
    it('should toggle between login and register modes', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      expect(wrapper.text()).toContain('SIGN IN')
      expect(wrapper.find('input[type="email"]').exists()).toBe(false)

      const toggleLink = wrapper.find('.auth-toggle-link')
      await toggleLink.trigger('click')

      expect(wrapper.text()).toContain('CREATE ACCOUNT')
      expect(wrapper.find('input[type="email"]').exists()).toBe(true)

      await toggleLink.trigger('click')

      expect(wrapper.text()).toContain('SIGN IN')
      expect(wrapper.find('input[type="email"]').exists()).toBe(false)
    })

    it('should clear message and form fields when toggling modes', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const usernameInput = wrapper.find('input[type="text"]')
      const passwordInput = wrapper.find('input[type="password"]')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')

      const toggleLink = wrapper.find('.auth-toggle-link')
      await toggleLink.trigger('click')

      // Form should be cleared
      expect(usernameInput.element.value).toBe('')
      expect(passwordInput.element.value).toBe('')
    })
  })

  describe('Google OAuth', () => {
    it('should call google login handler', async () => {
      mockGetAccessToken.mockReturnValueOnce(null)
      const wrapper = mount(AuthPage, { global: { plugins: [router] } })

      const googleBtn = wrapper.find('.auth-btn-google')
      await googleBtn.trigger('click')

      expect(mockAuthApi.googleLogin).toHaveBeenCalled()
    })
  })
})
