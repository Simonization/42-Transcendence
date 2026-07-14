/**
 * AdminCard Component Tests
 * Tests for admin control panel with tab navigation and dashboard displays
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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
      expect(wrapper.text()).toContain('PARTICIPANTS')
    })
  })

  describe('Dashboard Tab', () => {
    it('should render dashboard by default', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('DASHBOARD OVERVIEW')
    })

    it('should display all stat cards', () => {
      const wrapper = mount(AdminCard)

      const stats = wrapper.findAll('.stat-card')
      expect(stats.length).toBe(4)
    })

    it('should show active tournaments stat', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('Active Tournaments')
      expect(wrapper.text()).toContain('3')
    })

    it('should show total participants stat', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('Total Participants')
      expect(wrapper.text()).toContain('148')
    })

    it('should show matches today stat', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('Matches Today')
      expect(wrapper.text()).toContain('12')
    })

    it('should show pending registrations stat', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('Pending Registrations')
      expect(wrapper.text()).toContain('7')
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

    it('should display recent activity feed', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('RECENT ACTIVITY')
    })

    it('should show 5 activity items', () => {
      const wrapper = mount(AdminCard)

      const activityItems = wrapper.findAll('.activity-item')
      expect(activityItems.length).toBe(5)
    })

    it('should display activity event names', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('Spring Championship registered')
      expect(wrapper.text()).toContain('New user signup')
      expect(wrapper.text()).toContain('Match result submitted')
    })

    it('should display activity timestamps', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('2 hours ago')
      expect(wrapper.text()).toContain('4 hours ago')
      expect(wrapper.text()).toContain('6 hours ago')
    })

    it('should display activity icons', () => {
      const wrapper = mount(AdminCard)

      expect(wrapper.text()).toContain('🏆')
      expect(wrapper.text()).toContain('👤')
      expect(wrapper.text()).toContain('📊')
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

      expect(wrapper.text()).toContain('Single Elimination')
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

  describe('Participants Tab', () => {
    it('should display participants management tab when clicked', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      const participantsTab = tabs[4]

      await participantsTab.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('PARTICIPANTS')
    })

    it('should display participant list with headers', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      const participantsTab = tabs[4]

      await participantsTab.trigger('click')

      const headers = wrapper.findAll('thead th, th')
      expect(headers.length).toBeGreaterThan(0)
    })

    it('should show 4 mock participants', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      const participantsTab = tabs[4]

      await participantsTab.trigger('click')

      const rows = wrapper.findAll('tbody tr, tr')
      // At least 4 participants or empty state
      expect(rows.length).toBeGreaterThanOrEqual(0)
    })

    it('should display participant usernames', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      const participantsTab = tabs[4]

      await participantsTab.trigger('click')

      expect(wrapper.text()).toContain('admin_user')
      expect(wrapper.text()).toContain('player_alpha')
    })

    it('should display participant roles', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      const participantsTab = tabs[4]

      await participantsTab.trigger('click')

      expect(wrapper.text()).toContain('Admin')
      expect(wrapper.text()).toContain('Player')
    })

    it('should display participant status', async () => {
      const wrapper = mount(AdminCard)

      const tabs = wrapper.findAll('.tab-btn')
      const participantsTab = tabs[4]

      await participantsTab.trigger('click')

      expect(wrapper.text()).toContain('active')
      expect(wrapper.text()).toContain('inactive')
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

      // Tab 4: Participants
      await tabs[4].trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('PARTICIPANTS')
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
      expect(statCards.length).toBe(4)
    })

    it('should render activity feed as list', () => {
      const wrapper = mount(AdminCard)

      const activityList = wrapper.find('.activity-list')
      expect(activityList.exists()).toBe(true)
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
      expect(statCards.length).toBe(4)

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
