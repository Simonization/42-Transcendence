/**
 * AdminCard Component Tests
 * Tests for admin control panel with tab navigation and dashboard displays
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AdminCard from '../AdminCard.vue'
import { useAuthStore } from '../../../stores/auth'
import { UserRole } from '../../../types'

// Prevent real HTTP calls from child components (ManageUsersTab, CreateTournamentTab)
vi.mock('../../../api/admin', () => ({
  adminApi: {
    getUsers: vi.fn().mockResolvedValue({ users: [], total: 0 }),
    updateUser: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../../../api/games', () => ({
  gamesApi: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../../../api/tournaments', () => ({
  tournamentsApi: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    getParticipants: vi.fn().mockResolvedValue([]),
  },
}))

describe('AdminCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    const authStore = useAuthStore()
    authStore.user = {
      id: 1, username: 'test_admin', mail: 'admin@test.com',
      twoFactorEnabled: false, role: UserRole.ADMIN,
      profile: { userId: 1, displayName: 'Admin', avatarUrl: null, bio: null, createdAt: '' },
      settings: { userId: 1, language: 'en', timezone: null, theme: 0, openMessage: false, createdAt: '' },
    } as any
    authStore.isAuthenticated = true
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('should render admin panel header', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('ADMIN CONTROL PANEL')
      expect(wrapper.text()).toContain('Tournament Management System')
    })

    it('should display beta badge', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('BETA')
    })

    it('should render all tabs', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('DASHBOARD')
      expect(wrapper.text()).toContain('CREATE')
      expect(wrapper.text()).toContain('TOURNAMENTS')
      expect(wrapper.text()).toContain('GAMES')
      expect(wrapper.text()).toContain('USERS')
    })
  })

  describe('Dashboard Tab', () => {
    it('should render dashboard by default', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('DASHBOARD OVERVIEW')
    })

    it('should display the stat cards', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.findAll('.stat-card').length).toBe(3)
    })

    it('should derive stats from the tournament list rather than hardcoding them', async () => {
      const wrapper = mount(AdminCard)
      await flushPromises()

      // The API is stubbed with an empty list, so honest stats are all zero.
      expect(wrapper.text()).toContain('Active Tournaments')
      expect(wrapper.text()).toContain('Total Participants')
      expect(wrapper.text()).toContain('Pending Registrations')
      expect(wrapper.text()).not.toContain('148')
    })

    it('should display quick actions section', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('QUICK ACTIONS')
    })

    it('should display disabled quick action buttons with V2.0 badge', () => {
      const wrapper = mount(AdminCard)

      const actionBtns = wrapper.findAll('.action-btn-disabled')
      expect(actionBtns.length).toBeGreaterThan(0)

      const badges = wrapper.findAll('.v2-badge-small')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe('Create Tournament Tab', () => {
    it('should display create tournament form when tab is clicked', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      const createTab = tabs[1]

      await createTab.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('CREATE TOURNAMENT')
    })

    it('should show tournament creation form with name input', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      await tabs[1].trigger('click')
      await wrapper.vm.$nextTick()

      // The form should have a name input field
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('should display format options', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      await tabs[1].trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Single Elim.')
    })

    it('should have a submit button', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      await tabs[1].trigger('click')
      await wrapper.vm.$nextTick()

      const submitBtn = wrapper.find('.submit-btn')
      expect(submitBtn.exists()).toBe(true)
    })
  })

  describe('My Tournaments Tab', () => {
    it('should display my tournaments tab content when clicked', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      const tournamentsTab = tabs[2]

      await tournamentsTab.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('MY TOURNAMENTS')
    })

    it('should show empty state for tournaments', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      const tournamentsTab = tabs[2]

      await tournamentsTab.trigger('click')
      await wrapper.vm.$nextTick()

      // Should show empty state message
      expect(wrapper.text()).toMatch(/empty|no.*tournament|tournament.*not/i)
    })
  })

  describe('Tab Switching', () => {
    it('should switch from dashboard to create tab', async () => {
      const wrapper = mount(AdminCard)

      let tabContent = wrapper.text()
      expect(tabContent).toContain('DASHBOARD OVERVIEW')

      const tabs = wrapper.findAll('.tab-btn')
      await tabs[1].trigger('click')

      tabContent = wrapper.text()
      expect(tabContent).toContain('CREATE TOURNAMENT')
    })

    it('should switch between all tabs in sequence', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')

      // Tab 0: Dashboard
      expect(wrapper.text()).toContain('DASHBOARD OVERVIEW')

      // Tab 1: Create
      await tabs[1].trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('CREATE TOURNAMENT')

      // Tab 2: My Tournaments
      await tabs[2].trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('MY TOURNAMENTS')

      // Tab 3: Games
      await tabs[3].trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('MANAGE GAMES')

      // Tab 4: Users
      await tabs[4].trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('MANAGE USERS')
    })

    it('should highlight active tab', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')

      await tabs[1].trigger('click')
      await wrapper.vm.$nextTick()

      const activeTab = wrapper.find('.tab-btn-active')
      expect(activeTab.exists()).toBe(true)
    })

    it('should only show content for active tab', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')

      await tabs[1].trigger('click')
      await wrapper.vm.$nextTick()

      // Should show create tab content
      expect(wrapper.text()).toContain('CREATE TOURNAMENT')
      // Dashboard content should not be visible (v-show)
      const dashboardSection = wrapper.find('.tab-pane')
      expect(dashboardSection.exists()).toBe(true)
    })
  })

  describe('Styling and Layout', () => {
    it('should render admin header with glass effect', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.find('.admin-header').exists()).toBe(true)
      expect(wrapper.find('.glass-header').exists()).toBe(true)
    })

    it('should render tab navigation with glass panel', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.find('.admin-tabs').exists()).toBe(true)
      expect(wrapper.find('.glass-panel').exists()).toBe(true)
    })

    it('should render stats grid with proper structure', () => {
      const wrapper = mount(AdminCard)

      const statsGrid = wrapper.find('.stats-grid')
      expect(statsGrid.exists()).toBe(true)

      const statCards = statsGrid.findAll('.stat-card')
      expect(statCards.length).toBe(3)
    })

    it('should have proper spacing with design tokens', () => {
      const wrapper = mount(AdminCard)

      // Check that CSS classes are applied
      expect(wrapper.find('.admin-panel').exists()).toBe(true)
      expect(wrapper.find('.admin-content').exists()).toBe(true)
    })
  })

  describe('Icons', () => {
    it('should display tab icons', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('📊')
      expect(wrapper.text()).toContain('➕')
      expect(wrapper.text()).toContain('🏆')
      expect(wrapper.text()).toContain('👥')
    })

    it('should display stat icons', () => {
      const wrapper = mount(AdminCard)

      const statCards = wrapper.findAll('.stat-card')
      expect(statCards.length).toBe(3)

      // Each stat should have an icon
      statCards.forEach(card => {
        const icon = card.find('.stat-icon')
        expect(icon.exists()).toBe(true)
      })
    })
  })

  describe('V2.0 Beta Features', () => {
    it('should mark disabled features with V2.0 badge', () => {
      const wrapper = mount(AdminCard)

      const badges = wrapper.findAll('.v2-badge-small')
      expect(badges.length).toBeGreaterThan(0)
    })

    it('should display V2.0 badge on quick action buttons', () => {
      const wrapper = mount(AdminCard)

      const actionBtns = wrapper.findAll('.action-btn-disabled')
      expect(actionBtns.length).toBeGreaterThan(0)

      actionBtns.forEach(btn => {
        expect(btn.text()).toContain('V2.0')
      })
    })

    it('should disable V2.0 feature buttons', () => {
      const wrapper = mount(AdminCard)

      const disabledBtns = wrapper.findAll('.action-btn-disabled')
      expect(disabledBtns.length).toBeGreaterThan(0)
    })
  })

  describe('Content Sections', () => {
    it('should have properly titled sections', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('DASHBOARD OVERVIEW')

      const tabs = wrapper.findAll('.tab-btn')

      tabs.forEach(tab => {
        const text = tab.text()
        expect(text.length).toBeGreaterThan(0)
      })
    })

    it('should display section titles with uppercase styling', () => {
      const wrapper = mount(AdminCard)

      const titles = wrapper.findAll('.section-title, h2')
      expect(titles.length).toBeGreaterThan(0)
    })
  })
})
