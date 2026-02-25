/**
 * TournamentRegistrationModal Component Tests
 *
 * NOTE: Component uses Teleport to render modal to body.
 * Tests check document body instead of component wrapper.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TournamentRegistrationModal from '../TournamentRegistrationModal.vue'
import { useAuthStore } from '../../../stores/auth'
import { useFriendsStore } from '../../../stores/friends'

vi.mock('../../../composables/useTeams', () => ({
  useTeams: () => ({
    myTeam: { value: null },
    isLoading: { value: false },
    error: { value: '' },
    createTeam: vi.fn().mockResolvedValue({ id: 1, name: 'Test Team' }),
    invitePlayer: vi.fn().mockResolvedValue({}),
    lockTeam: vi.fn().mockResolvedValue({ id: 1 }),
  }),
}))

describe('TournamentRegistrationModal', () => {
  const teamProps = {
    tournamentId: 1,
    tournamentName: 'Spring Championship',
    rules: 'Match format: Single elimination\nBest of 3 finals',
    isOpen: true,
    teamSize: 3,
    gameName: 'Pong',
  }

  const soloProps = {
    ...teamProps,
    teamSize: 1,
  }

  beforeEach(() => {
    const authStore = useAuthStore()
    authStore.$patch({
      user: {
        id: 1,
        username: 'testuser',
        mail: 'test@example.com',
      } as any,
    })

    const friendsStore = useFriendsStore()
    friendsStore.$patch({
      friends: [
        {
          id: 2,
          username: 'friend1',
          profile: { displayName: 'Friend One', avatarUrl: null },
          status: 1,
        },
        {
          id: 3,
          username: 'friend2',
          profile: { displayName: 'Friend Two', avatarUrl: null },
          status: 1,
        },
      ] as any,
      isLoading: false,
      error: '',
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Component Rendering', () => {
    it('should not render when isOpen is false', () => {
      mount(TournamentRegistrationModal, {
        props: { ...teamProps, isOpen: false },
      })

      const modal = document.querySelector('[role="dialog"]')
      expect(modal).toBeNull()
    })

    it('should render modal when isOpen is true', async () => {
      mount(TournamentRegistrationModal, {
        props: teamProps,
      })

      await flushPromises()

      const modal = document.querySelector('[role="dialog"]')
      expect(modal).not.toBeNull()
      expect(modal?.getAttribute('aria-modal')).toBe('true')
    })

    it('should display tournament name in header', async () => {
      mount(TournamentRegistrationModal, {
        props: teamProps,
      })

      await flushPromises()

      const modal = document.querySelector('[role="dialog"]')
      expect(modal?.textContent).toContain('Spring Championship')
    })

    it('should show rules on the rules step for solo games', async () => {
      mount(TournamentRegistrationModal, {
        props: soloProps,
      })

      await flushPromises()

      const modal = document.querySelector('[role="dialog"]')
      expect(modal?.textContent).toContain('Match format: Single elimination')
    })
  })

  describe('Modal Structure', () => {
    it('should have proper accessibility attributes', async () => {
      mount(TournamentRegistrationModal, {
        props: teamProps,
      })

      await flushPromises()

      const modal = document.querySelector('[role="dialog"]')
      expect(modal).not.toBeNull()
      expect(modal?.getAttribute('aria-modal')).toBe('true')
    })

    it('should have a close button', async () => {
      mount(TournamentRegistrationModal, {
        props: teamProps,
      })

      await flushPromises()

      const closeBtn = document.querySelector('.modal-close-btn')
      expect(closeBtn).not.toBeNull()
    })
  })

  describe('Event Handling', () => {
    it('should respond to isOpen prop changes', async () => {
      const wrapper = mount(TournamentRegistrationModal, {
        props: { ...teamProps, isOpen: true },
      })

      await flushPromises()

      let modal = document.querySelector('[role="dialog"]')
      expect(modal).not.toBeNull()

      await wrapper.setProps({ isOpen: false })
      await flushPromises()

      modal = document.querySelector('[role="dialog"]')
      expect(modal).toBeNull()
    })

    it('should have form inputs in modal for team games', async () => {
      mount(TournamentRegistrationModal, {
        props: teamProps,
      })

      await flushPromises()

      const inputs = document.querySelectorAll('[role="dialog"] input')
      expect(inputs.length).toBeGreaterThan(0)
    })
  })

  describe('User Interaction', () => {
    it('should emit close event when close button clicked', async () => {
      const wrapper = mount(TournamentRegistrationModal, {
        props: teamProps,
      })

      await flushPromises()

      const closeBtn = document.querySelector('.modal-close-btn') as HTMLButtonElement | null

      expect(closeBtn).not.toBeNull()
      closeBtn!.click()
      await flushPromises()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should have interactive elements', async () => {
      mount(TournamentRegistrationModal, {
        props: teamProps,
      })

      await flushPromises()

      const interactive = document.querySelector('[role="dialog"] input, [role="dialog"] button')
      expect(interactive).not.toBeNull()
    })
  })
})
