/**
 * TeamSetupCard Component Tests
 * Covers the team actions (rename, cancel invite, unlock, transfer, invite link, join requests),
 * confirmation dialogs, the debounced / race-free player search, and i18n toasts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { i18n } from '../../../i18n'

const { teamsApi, tournamentsApi, usersApi, push } = vi.hoisted(() => ({
  push: vi.fn(),
  teamsApi: {
    getMyTeam: vi.fn(),
    getJoinCode: vi.fn(),
    getTeamInvitations: vi.fn(),
    getJoinRequests: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    invitePlayer: vi.fn(),
    cancelInvitation: vi.fn(),
    lock: vi.fn(),
    unlock: vi.fn(),
    checkIn: vi.fn(),
    promote: vi.fn(),
    demote: vi.fn(),
    kickPlayer: vi.fn(),
    transferCaptain: vi.fn(),
    deleteTeam: vi.fn(),
    leaveTeam: vi.fn(),
    regenerateJoinCode: vi.fn(),
    acceptJoinRequest: vi.fn(),
    declineJoinRequest: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
  },
  tournamentsApi: { getById: vi.fn() },
  usersApi: { search: vi.fn() },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '1' } }),
  useRouter: () => ({ push }),
}))
vi.mock('../../../api/teams', () => ({ teamsApi }))
vi.mock('../../../api/tournaments', () => ({ tournamentsApi }))
vi.mock('../../../api/users', () => ({ usersApi }))

import TeamSetupCard from '../TeamSetupCard.vue'
import { useAuthStore } from '../../../stores/auth'
import { useNotificationsStore } from '../../../stores/notifications'

const TOURNAMENT = {
  id: 1,
  name: 'Spring Cup',
  status: 'REGISTRATION_OPEN',
  phases: [{ order: 1, game: { teamSize: 3 } }],
}

const teamFixture = (over: Record<string, unknown> = {}) => ({
  id: 5,
  name: 'Reds',
  status: 'DRAFT',
  captain_id: 1,
  members: [
    { id: 1, username: 'cap' },
    { id: 2, username: 'bob' },
  ],
  admins: [],
  ...over,
})

const AVAILABILITY = { tournamentId: 1, maxTeams: 8, lockedTeams: 2, spotsLeft: 6, full: false, registrationOpen: true }

function setup(opts: { team?: unknown; me?: number; tournament?: unknown; availability?: unknown } = {}) {
  tournamentsApi.getById.mockResolvedValue(opts.tournament ?? TOURNAMENT)
  teamsApi.getMyTeam.mockResolvedValue({
    team: opts.team === undefined ? teamFixture() : opts.team,
    invitation: null,
    requests: [],
    availability: opts.availability ?? AVAILABILITY,
  })
  useAuthStore().$patch({ user: { id: opts.me ?? 1, username: 'me' } as never })
}

async function mountCard() {
  const wrapper = mount(TeamSetupCard, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

const dialog = () => document.body.querySelector('.dialog-panel')
const clickDialog = async (selector: string) => {
  ;(document.body.querySelector(`.dialog-panel ${selector}`) as HTMLButtonElement).click()
  await flushPromises()
}
const buttonByText = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))

describe('TeamSetupCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'en'
    teamsApi.getJoinCode.mockResolvedValue({ joinCode: 'abcDEF2345' })
    teamsApi.getTeamInvitations.mockResolvedValue([])
    teamsApi.getJoinRequests.mockResolvedValue([])
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  describe('confirmations', () => {
    it('asks before deleting the team and only deletes on confirm', async () => {
      setup()
      teamsApi.deleteTeam.mockResolvedValue({ message: 'ok' })
      const wrapper = await mountCard()

      await buttonByText(wrapper, 'DELETE TEAM')!.trigger('click')
      expect(dialog()).not.toBeNull()
      expect(teamsApi.deleteTeam).not.toHaveBeenCalled()

      await clickDialog('.btn-secondary') // cancel
      expect(dialog()).toBeNull()
      expect(teamsApi.deleteTeam).not.toHaveBeenCalled()

      await buttonByText(wrapper, 'DELETE TEAM')!.trigger('click')
      await clickDialog('.btn-danger')
      expect(teamsApi.deleteTeam).toHaveBeenCalledWith(5)
    })

    it('asks before transferring captaincy', async () => {
      setup()
      teamsApi.transferCaptain.mockResolvedValue(teamFixture({ captain_id: 2 }))
      const wrapper = await mountCard()

      await buttonByText(wrapper, 'MAKE CAPTAIN')!.trigger('click')
      expect(dialog()?.textContent).toContain('bob')
      expect(teamsApi.transferCaptain).not.toHaveBeenCalled()

      await clickDialog('.btn-primary')
      expect(teamsApi.transferCaptain).toHaveBeenCalledWith(5, 2)
    })

    it('asks before a member leaves a LOCKED team, warning that it un-registers the team', async () => {
      setup({ me: 2, team: teamFixture({ status: 'LOCKED' }) })
      teamsApi.leaveTeam.mockResolvedValue({ message: 'ok' })
      const wrapper = await mountCard()

      await buttonByText(wrapper, 'LEAVE TEAM')!.trigger('click')
      expect(dialog()?.textContent).toContain('goes back to recruiting')
      expect(teamsApi.leaveTeam).not.toHaveBeenCalled()

      await clickDialog('.btn-danger')
      expect(teamsApi.leaveTeam).toHaveBeenCalledWith(5)
    })

    it('hides leave once the tournament started and the team is locked', async () => {
      setup({
        me: 2,
        team: teamFixture({ status: 'LOCKED' }),
        tournament: { ...TOURNAMENT, status: 'ONGOING' },
      })
      const wrapper = await mountCard()
      expect(buttonByText(wrapper, 'LEAVE TEAM')).toBeUndefined()
    })
  })

  describe('team actions', () => {
    it('renames the team', async () => {
      setup()
      teamsApi.rename.mockResolvedValue(teamFixture({ name: 'Blues' }))
      const wrapper = await mountCard()

      await buttonByText(wrapper, 'RENAME')!.trigger('click')
      await wrapper.find('.ts-team-title-block input').setValue('Blues')
      await buttonByText(wrapper, 'SAVE')!.trigger('click')
      await flushPromises()

      expect(teamsApi.rename).toHaveBeenCalledWith(5, 'Blues')
      expect(wrapper.find('.ts-team-name').text()).toBe('Blues')
    })

    it('cancels a pending invitation', async () => {
      setup()
      teamsApi.getTeamInvitations.mockResolvedValue([
        { id: 30, team_id: 5, sender_id: 1, receiver_id: 9, receiver: { id: 9, username: 'zed' }, status: 'PENDING' },
      ])
      teamsApi.cancelInvitation.mockResolvedValue({})
      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('zed')
      await buttonByText(wrapper, 'CANCEL')!.trigger('click')
      await flushPromises()

      expect(teamsApi.cancelInvitation).toHaveBeenCalledWith(30)
      expect(wrapper.text()).not.toContain('zed')
    })

    it('unlocks a LOCKED team while registration is open', async () => {
      setup({ team: teamFixture({ status: 'LOCKED' }) })
      teamsApi.unlock.mockResolvedValue(teamFixture())
      const wrapper = await mountCard()

      await buttonByText(wrapper, 'UNLOCK TEAM')!.trigger('click')
      await flushPromises()

      expect(teamsApi.unlock).toHaveBeenCalledWith(5)
    })

    it('does not offer unlock after the tournament started', async () => {
      setup({ team: teamFixture({ status: 'LOCKED' }), tournament: { ...TOURNAMENT, status: 'ONGOING' } })
      const wrapper = await mountCard()
      expect(buttonByText(wrapper, 'UNLOCK TEAM')).toBeUndefined()
    })

    it('shows the invite link to the team and copies it', async () => {
      setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      const wrapper = await mountCard()

      const input = wrapper.find<HTMLInputElement>('.ts-link-input')
      expect(input.element.value).toBe(`${window.location.origin}/join/abcDEF2345`)

      await buttonByText(wrapper, 'COPY LINK')!.trigger('click')
      await flushPromises()
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join/abcDEF2345`)
    })

    it('regenerates the invite link (captain/admin only)', async () => {
      setup()
      teamsApi.regenerateJoinCode.mockResolvedValue({ joinCode: 'newCODE999' })
      const wrapper = await mountCard()

      await buttonByText(wrapper, 'NEW LINK')!.trigger('click')
      await flushPromises()

      expect(wrapper.find<HTMLInputElement>('.ts-link-input').element.value).toContain('/join/newCODE999')
    })

    it('does not offer link regeneration to a plain member', async () => {
      setup({ me: 2 })
      const wrapper = await mountCard()
      expect(wrapper.find('.ts-link-input').exists()).toBe(true)
      expect(buttonByText(wrapper, 'NEW LINK')).toBeUndefined()
    })

    it('lists incoming join requests and accepts / declines them', async () => {
      setup()
      teamsApi.getJoinRequests.mockResolvedValue([
        { id: 40, team_id: 5, sender_id: 9, sender: { id: 9, username: 'zed' }, note: 'gold rank', status: 'PENDING' },
      ])
      teamsApi.acceptJoinRequest.mockResolvedValue({ message: 'ok', teamId: 5 })
      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('zed')
      expect(wrapper.text()).toContain('gold rank')

      const requestRow = wrapper.find('.ts-requests-panel .ts-request')
      await requestRow.findAll('button')[0].trigger('click')
      await flushPromises()
      expect(teamsApi.acceptJoinRequest).toHaveBeenCalledWith(40)

      teamsApi.declineJoinRequest.mockResolvedValue({})
      await wrapper.find('.ts-requests-panel .ts-request').findAll('button')[1].trigger('click')
      await flushPromises()
      expect(teamsApi.declineJoinRequest).toHaveBeenCalledWith(40)
    })

    it('shows the tournament-full state and blocks locking', async () => {
      setup({
        team: teamFixture({ members: [{ id: 1, username: 'cap' }, { id: 2, username: 'bob' }, { id: 3, username: 'cy' }] }),
        availability: { ...AVAILABILITY, lockedTeams: 8, spotsLeft: 0, full: true },
      })
      const wrapper = await mountCard()

      expect(wrapper.text()).toContain('TOURNAMENT FULL')
      expect(buttonByText(wrapper, 'LOCK TEAM')!.attributes('disabled')).toBeDefined()
    })
  })

  describe('registration deadline and check-in', () => {
    const PAST = () => new Date(Date.now() - 3_600_000).toISOString()
    const FUTURE = () => new Date(Date.now() + 3_600_000).toISOString()
    const locked = (over: Record<string, unknown> = {}) =>
      teamFixture({ status: 'LOCKED', members: [{ id: 1, username: 'cap' }, { id: 2, username: 'bob' }, { id: 3, username: 'eve' }], ...over })
    const withTournament = (extra: Record<string, unknown>) => ({ ...TOURNAMENT, ...extra })

    it('shows the check-in button to a captain of a locked team while the window is open', async () => {
      setup({ team: locked(), tournament: withTournament({ checkin_opens_at: PAST() }) })
      teamsApi.checkIn.mockResolvedValue({})
      const wrapper = await mountCard()

      const btn = wrapper.find('[data-testid="checkin-btn"]')
      expect(btn.exists()).toBe(true)

      await btn.trigger('click')
      expect(teamsApi.checkIn).toHaveBeenCalledWith(5)
    })

    it('shows the button to a team admin, but not to a plain member', async () => {
      setup({ me: 2, team: locked({ admins: [{ id: 1, userId: 2, teamId: 5, grantedBy: 1, grantedAt: '' }] }), tournament: withTournament({ checkin_opens_at: PAST() }) })
      expect((await mountCard()).find('[data-testid="checkin-btn"]').exists()).toBe(true)

      document.body.innerHTML = ''
      setup({ me: 3, team: locked(), tournament: withTournament({ checkin_opens_at: PAST() }) })
      const member = await mountCard()
      expect(member.find('[data-testid="checkin-btn"]').exists()).toBe(false)
      expect(member.find('[data-testid="checkin-row"]').exists()).toBe(true)
    })

    it('hides the button before the window opens and says when it opens', async () => {
      setup({ team: locked(), tournament: withTournament({ checkin_opens_at: FUTURE() }) })
      const wrapper = await mountCard()

      expect(wrapper.find('[data-testid="checkin-btn"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="checkin-upcoming"]').exists()).toBe(true)
    })

    it('hides the button after the tournament started', async () => {
      setup({ team: locked(), tournament: withTournament({ status: 'ONGOING', checkin_opens_at: PAST() }) })
      const wrapper = await mountCard()
      expect(wrapper.find('[data-testid="checkin-btn"]').exists()).toBe(false)
    })

    it('shows the checked-in status instead of the button once checked in', async () => {
      setup({ team: locked({ checked_in_at: PAST() }), tournament: withTournament({ checkin_opens_at: PAST() }) })
      const wrapper = await mountCard()

      expect(wrapper.find('[data-testid="checked-in-badge"]').text()).toContain('Checked in')
      expect(wrapper.find('[data-testid="checkin-btn"]').exists()).toBe(false)
    })

    it('shows nothing for a draft team or a tournament without check-in', async () => {
      setup({ team: teamFixture(), tournament: withTournament({ checkin_opens_at: PAST() }) })
      expect((await mountCard()).find('[data-testid="checkin-row"]').exists()).toBe(false)

      document.body.innerHTML = ''
      setup({ team: locked() })
      expect((await mountCard()).find('[data-testid="checkin-row"]').exists()).toBe(false)
    })

    it('toasts the backend message when check-in is refused', async () => {
      setup({ team: locked(), tournament: withTournament({ checkin_opens_at: PAST() }) })
      teamsApi.checkIn.mockRejectedValue({ message: 'Check-in is closed' })
      const wrapper = await mountCard()

      await wrapper.find('[data-testid="checkin-btn"]').trigger('click')
      await flushPromises()

      expect(useNotificationsStore().notifications.some((n) => n.message === 'Check-in is closed')).toBe(true)
    })

    it('shows the deadline countdown while registration is open, and blocks locking after it passes', async () => {
      const closes = new Date(Date.now() + 2 * 86_400_000 + 4 * 3_600_000 + 60_000).toISOString()
      setup({ tournament: withTournament({ registration_closes_at: closes }) })
      const wrapper = await mountCard()
      expect(wrapper.find('[data-testid="registration-countdown"]').text()).toBe('Registration closes in 2d 4h')

      document.body.innerHTML = ''
      setup({
        team: teamFixture({ members: [{ id: 1, username: 'a' }, { id: 2, username: 'b' }, { id: 3, username: 'c' }] }),
        tournament: withTournament({ registration_closes_at: PAST() }),
      })
      const closed = await mountCard()
      const lock = closed.findAll('button').find((b) => b.classes().includes('ts-btn-lock'))
      expect(lock!.attributes('disabled')).toBeDefined()
    })
  })

  describe('substitutes', () => {
    const member = (id: number) => ({ id, username: `p${id}` })

    it('marks members beyond the game team size as SUB and lets the team lock with a bench', async () => {
      // teamSize is 3: captain + 2 starters, then 2 substitutes.
      setup({ team: teamFixture({ members: [1, 2, 3, 4, 5].map(member) }) })
      const wrapper = await mountCard()

      const subs = wrapper.findAll('.ts-tag-sub')
      expect(subs).toHaveLength(2)
      expect(subs[0].element.closest('.ts-slot')!.textContent).toContain('p4')
      expect(subs[1].element.closest('.ts-slot')!.textContent).toContain('p5')
      expect(wrapper.find('.ts-team-count').text()).toContain('3 / 3')
      expect(wrapper.find('.ts-team-count').text()).toContain('+2')
      expect(buttonByText(wrapper, 'LOCK TEAM')!.attributes('disabled')).toBeUndefined()
    })

    it('offers an open bench slot once the starters are in, but not beyond teamSize + 2', async () => {
      setup({ team: teamFixture({ members: [1, 2, 3].map(member) }) })
      const starters = await mountCard()
      expect(starters.findAll('.ts-slot-empty')).toHaveLength(1)
      expect(starters.findAll('.ts-tag-sub')).toHaveLength(0)
      starters.unmount()

      setup({ team: teamFixture({ members: [1, 2, 3, 4, 5].map(member) }) })
      const fullBench = await mountCard()
      expect(fullBench.findAll('.ts-slot-empty')).toHaveLength(0)
    })

    it('still refuses to lock below the team size', async () => {
      setup()
      const wrapper = await mountCard()
      expect(buttonByText(wrapper, 'LOCK TEAM')!.attributes('disabled')).toBeDefined()
    })
  })

  describe('player search', () => {
    async function openInvitePanel(wrapper: VueWrapper) {
      await wrapper.find('.ts-invite-toggle').trigger('click')
      return wrapper.find<HTMLInputElement>('.ts-invite-body input')
    }

    it('debounces keystrokes into a single request', async () => {
      setup()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      usersApi.search.mockResolvedValue([{ id: 7, username: 'alice' }])
      const wrapper = await mountCard()
      const input = await openInvitePanel(wrapper)

      await input.setValue('a')
      await input.setValue('al')
      await input.setValue('ali')
      expect(usersApi.search).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(299)
      expect(usersApi.search).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(2)
      expect(usersApi.search).toHaveBeenCalledTimes(1)
      expect(usersApi.search).toHaveBeenCalledWith('ali', 10)
    })

    it('ignores a slow response to an earlier query', async () => {
      setup()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      let resolveSlow!: (v: unknown) => void
      usersApi.search
        .mockImplementationOnce(() => new Promise((r) => { resolveSlow = r }))
        .mockResolvedValueOnce([{ id: 8, username: 'bobby' }])
      const wrapper = await mountCard()
      const input = await openInvitePanel(wrapper)

      await input.setValue('a')
      await vi.advanceTimersByTimeAsync(300) // fires the slow request
      await input.setValue('bob')
      await vi.advanceTimersByTimeAsync(300) // fires the fast one, which resolves first
      await flushPromises()
      expect(wrapper.find('.ts-search-results').text()).toContain('bobby')

      resolveSlow([{ id: 7, username: 'stale-alice' }]) // the old answer arrives late
      await flushPromises()

      expect(wrapper.find('.ts-search-results').text()).toContain('bobby')
      expect(wrapper.text()).not.toContain('stale-alice')
    })

    it('clears results and skips the request for an empty query', async () => {
      setup()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const wrapper = await mountCard()
      const input = await openInvitePanel(wrapper)

      await input.setValue('  ')
      await vi.advanceTimersByTimeAsync(500)
      expect(usersApi.search).not.toHaveBeenCalled()
    })
  })

  describe('i18n', () => {
    it('shows the "back" label and toasts in the active locale, not hard-coded English', async () => {
      i18n.global.locale.value = 'fr'
      setup()
      teamsApi.rename.mockRejectedValue({}) // no message from the backend: falls back to i18n
      const wrapper = await mountCard()

      expect(wrapper.find('.back-btn').text()).toContain('RETOUR')

      await buttonByText(wrapper, 'RENOMMER')!.trigger('click')
      await wrapper.find('.ts-team-title-block input').setValue('Bleus')
      await buttonByText(wrapper, 'ENREGISTRER')!.trigger('click')
      await flushPromises()

      const messages = useNotificationsStore().notifications.map((n) => n.message)
      expect(messages).toContain("Impossible de renommer l'équipe")
    })
  })
})
