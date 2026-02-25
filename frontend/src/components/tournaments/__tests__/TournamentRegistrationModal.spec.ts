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

// Hoist mock functions so they're available inside vi.mock factory
const { mockCreateTeam, mockInvitePlayer, mockLockTeam } = vi.hoisted(() => ({
  mockCreateTeam: vi.fn(),
  mockInvitePlayer: vi.fn(),
  mockLockTeam: vi.fn(),
}))

vi.mock('../../../composables/useTeams', () => ({
  useTeams: () => ({
    myTeam: { value: null },
    isLoading: { value: false },
    error: { value: '' },
    createTeam: mockCreateTeam,
    invitePlayer: mockInvitePlayer,
    lockTeam: mockLockTeam,
  }),
}))

// Prevent real HTTP calls when friendsStore.fetchFriends fires on modal open
vi.mock('../../../api/friends', () => ({
  friendsApi: {
    getFriends: vi.fn().mockResolvedValue([]),
    getBlocked: vi.fn().mockResolvedValue([]),
    addFriend: vi.fn().mockResolvedValue({}),
    removeFriend: vi.fn().mockResolvedValue({}),
    blockUser: vi.fn().mockResolvedValue({}),
    unblockUser: vi.fn().mockResolvedValue({}),
  },
}))

const TEAM_FRIENDS = [
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
]

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
    vi.clearAllMocks()
    mockCreateTeam.mockResolvedValue({ id: 1, name: 'Test Team' })
    mockInvitePlayer.mockResolvedValue({})
    mockLockTeam.mockResolvedValue({ id: 1 })

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
      friends: TEAM_FRIENDS as any,
      isLoading: false,
      error: '',
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // Helper: set an input value and trigger Vue's v-model reactivity
  const setInputValue = async (input: HTMLInputElement, value: string) => {
    input.value = value
    input.dispatchEvent(new Event('input'))
    await flushPromises()
  }

  // Helper: navigate a team-mode modal from step 1 (team name) all the way to step 3 (rules)
  const mountAndNavigateToRules = async () => {
    const wrapper = mount(TournamentRegistrationModal, { props: teamProps })
    await flushPromises()

    // Step 1 → fill team name
    const teamInput = document.querySelector('#team-name') as HTMLInputElement
    await setInputValue(teamInput, 'Alpha Squad')
    const nextBtn1 = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
    nextBtn1.click()
    await flushPromises()

    // Step 2 → select one friend so canProceedInvite is true
    const memberCheckbox = document.querySelector('.member-card input[type="checkbox"]') as HTMLInputElement
    if (memberCheckbox) {
      memberCheckbox.dispatchEvent(new Event('change'))
      await flushPromises()
    }
    const nextBtn2 = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
    nextBtn2?.click()
    await flushPromises()

    return wrapper
  }

  describe('Component Rendering', () => {
    it('should not render when isOpen is false', () => {
      mount(TournamentRegistrationModal, {
        props: { ...teamProps, isOpen: false },
      })
      expect(document.querySelector('[role="dialog"]')).toBeNull()
    })

    it('should render modal when isOpen is true', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      const modal = document.querySelector('[role="dialog"]')
      expect(modal).not.toBeNull()
      expect(modal?.getAttribute('aria-modal')).toBe('true')
    })

    it('should display tournament name in header', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Spring Championship')
    })

    it('should respond to isOpen prop changes', async () => {
      const wrapper = mount(TournamentRegistrationModal, {
        props: { ...teamProps, isOpen: true },
      })
      await flushPromises()

      expect(document.querySelector('[role="dialog"]')).not.toBeNull()

      await wrapper.setProps({ isOpen: false })
      await flushPromises()

      expect(document.querySelector('[role="dialog"]')).toBeNull()
    })
  })

  describe('Solo Mode (teamSize=1)', () => {
    it('should skip directly to rules step — no team name input', async () => {
      mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      expect(document.querySelector('#team-name')).toBeNull()
      expect(document.querySelector('.rules-text')).not.toBeNull()
    })

    it('should not show progress indicator', async () => {
      mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      expect(document.querySelector('.progress-indicator')).toBeNull()
    })

    it('should show solo info banner', async () => {
      mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      expect(document.querySelector('.solo-banner')).not.toBeNull()
    })

    it('should disable submit until rules are accepted', async () => {
      mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      const submitBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      expect(submitBtn.disabled).toBe(true)
    })

    it('should enable submit after accepting rules', async () => {
      mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()

      const submitBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      expect(submitBtn.disabled).toBe(false)
    })

    it('should call createTeam with username-based name on submit', async () => {
      const wrapper = mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()

      const submitBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      submitBtn.click()
      await flushPromises()

      expect(mockCreateTeam).toHaveBeenCalledWith({
        name: 'testuser Team',
        tournament_id: 1,
      })
    })

    it('should call lockTeam immediately after createTeam for solo', async () => {
      mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()

      const submitBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      submitBtn.click()
      await flushPromises()

      expect(mockLockTeam).toHaveBeenCalledWith(1)
    })

    it('should emit registered and close on successful solo submission', async () => {
      const wrapper = mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()

      const submitBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      submitBtn.click()
      await flushPromises()

      expect(wrapper.emitted('registered')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close if createTeam returns null', async () => {
      mockCreateTeam.mockResolvedValue(null)
      const wrapper = mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()

      const submitBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      submitBtn.click()
      await flushPromises()

      expect(mockLockTeam).not.toHaveBeenCalled()
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should not close if lockTeam returns null', async () => {
      mockLockTeam.mockResolvedValue(null)
      const wrapper = mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()

      const submitBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      submitBtn.click()
      await flushPromises()

      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Team Mode — Step Navigation', () => {
    it('should start on team name step for team games', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      expect(document.querySelector('#team-name')).not.toBeNull()
    })

    it('should show 3-step progress indicator for team games', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      const dots = document.querySelectorAll('.progress-dot')
      expect(dots.length).toBe(3)
    })

    it('should disable Next when team name has fewer than 3 characters', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      const teamInput = document.querySelector('#team-name') as HTMLInputElement
      await setInputValue(teamInput, 'AB')

      const nextBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      expect(nextBtn.disabled).toBe(true)
    })

    it('should enable Next when team name has 3+ characters', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      const teamInput = document.querySelector('#team-name') as HTMLInputElement
      await setInputValue(teamInput, 'ABC')

      const nextBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      expect(nextBtn.disabled).toBe(false)
    })

    it('should advance to invite step after valid team name', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      const teamInput = document.querySelector('#team-name') as HTMLInputElement
      await setInputValue(teamInput, 'Alpha Squad')

      const nextBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      nextBtn.click()
      await flushPromises()

      // Team name input gone, friends grid visible
      expect(document.querySelector('#team-name')).toBeNull()
      expect(document.querySelector('.members-grid')).not.toBeNull()
    })

    it('should show friends in invite step', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      const teamInput = document.querySelector('#team-name') as HTMLInputElement
      await setInputValue(teamInput, 'Alpha Squad')

      const nextBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      nextBtn.click()
      await flushPromises()

      const memberCards = document.querySelectorAll('.member-card')
      expect(memberCards.length).toBe(2)
    })

    it('should navigate back from invite step to team name step', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      // Go to step 2
      const teamInput = document.querySelector('#team-name') as HTMLInputElement
      await setInputValue(teamInput, 'Alpha Squad')
      ;(document.querySelector('button.modal-btn-primary') as HTMLButtonElement).click()
      await flushPromises()

      // Go back — find the back button (secondary btn in footer group)
      const backBtn = Array.from(document.querySelectorAll('.modal-btn-group button.modal-btn-secondary'))[0] as HTMLButtonElement
      backBtn?.click()
      await flushPromises()

      expect(document.querySelector('#team-name')).not.toBeNull()
    })

    it('should advance to rules step after invite step', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      // Step 1
      const teamInput = document.querySelector('#team-name') as HTMLInputElement
      await setInputValue(teamInput, 'Alpha Squad')
      ;(document.querySelector('button.modal-btn-primary') as HTMLButtonElement).click()
      await flushPromises()

      // Step 2 — select friend, then next
      const checkbox = document.querySelector('.member-card input[type="checkbox"]') as HTMLInputElement
      checkbox?.dispatchEvent(new Event('change'))
      await flushPromises()
      ;(document.querySelector('button.modal-btn-primary') as HTMLButtonElement)?.click()
      await flushPromises()

      // Should be on rules step
      expect(document.querySelector('.rules-text')).not.toBeNull()
      expect(document.querySelector('.checkbox-accept')).not.toBeNull()
    })

    it('should navigate back from rules step to invite step', async () => {
      const wrapper = await mountAndNavigateToRules()

      const backBtn = Array.from(document.querySelectorAll('.modal-btn-group button.modal-btn-secondary'))[0] as HTMLButtonElement
      backBtn?.click()
      await flushPromises()

      expect(document.querySelector('.members-grid')).not.toBeNull()
      expect(document.querySelector('.rules-text')).toBeNull()
    })
  })

  describe('Team Mode — Submission Flow', () => {
    it('should require rules acceptance before submitting', async () => {
      await mountAndNavigateToRules()

      const submitBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      expect(submitBtn.disabled).toBe(true)
    })

    it('should enable submit after accepting rules', async () => {
      await mountAndNavigateToRules()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()

      const submitBtn = document.querySelector('button.modal-btn-primary') as HTMLButtonElement
      expect(submitBtn.disabled).toBe(false)
    })

    it('should call createTeam with team name and tournament id', async () => {
      await mountAndNavigateToRules()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()
      ;(document.querySelector('button.modal-btn-primary') as HTMLButtonElement).click()
      await flushPromises()

      expect(mockCreateTeam).toHaveBeenCalledWith({
        name: 'Alpha Squad',
        tournament_id: 1,
      })
    })

    it('should call invitePlayer for selected friends', async () => {
      await mountAndNavigateToRules()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()
      ;(document.querySelector('button.modal-btn-primary') as HTMLButtonElement).click()
      await flushPromises()

      expect(mockInvitePlayer).toHaveBeenCalled()
    })

    it('should NOT call lockTeam for team games', async () => {
      await mountAndNavigateToRules()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()
      ;(document.querySelector('button.modal-btn-primary') as HTMLButtonElement).click()
      await flushPromises()

      expect(mockLockTeam).not.toHaveBeenCalled()
    })

    it('should emit registered and close after team submission', async () => {
      const wrapper = await mountAndNavigateToRules()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()
      ;(document.querySelector('button.modal-btn-primary') as HTMLButtonElement).click()
      await flushPromises()

      expect(wrapper.emitted('registered')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should not close if createTeam returns null for team mode', async () => {
      mockCreateTeam.mockResolvedValue(null)
      const wrapper = await mountAndNavigateToRules()

      const checkbox = document.querySelector('.checkbox-accept input') as HTMLInputElement
      checkbox.click()
      await flushPromises()
      ;(document.querySelector('button.modal-btn-primary') as HTMLButtonElement).click()
      await flushPromises()

      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })

  describe('Modal Structure & Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      const modal = document.querySelector('[role="dialog"]')
      expect(modal?.getAttribute('aria-modal')).toBe('true')
    })

    it('should have a close button', async () => {
      mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      expect(document.querySelector('.modal-close-btn')).not.toBeNull()
    })

    it('should emit close when close button is clicked', async () => {
      const wrapper = mount(TournamentRegistrationModal, { props: teamProps })
      await flushPromises()

      const closeBtn = document.querySelector('.modal-close-btn') as HTMLButtonElement
      closeBtn.click()
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should show rules text in rules step', async () => {
      mount(TournamentRegistrationModal, { props: soloProps })
      await flushPromises()

      expect(document.querySelector('.rules-text')?.textContent).toContain('Single elimination')
    })
  })
})
