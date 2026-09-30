/**
 * MyTournamentsTab: the start confirmation lists what the server says it will archive (not
 * registered, did not check in), and the edit row sets or clears the registration deadline and
 * the check-in opening and shows the backend's refusal.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ApiError } from '../../../types'
import { i18n } from '../../../i18n'

const { tournamentsApi } = vi.hoisted(() => ({
  tournamentsApi: {
    getAll: vi.fn(),
    getSeeding: vi.fn(),
    getCheckin: vi.fn(),
    start: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setSeeding: vi.fn(),
  },
}))

vi.mock('../../../api/tournaments', () => ({ tournamentsApi }))
vi.mock('../../../services/socket', () => ({
  onSocketEvent: () => () => undefined,
  subscribeChannel: () => () => undefined,
}))

import MyTournamentsTab from '../MyTournamentsTab.vue'

const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})

const TOURNAMENT = {
  id: 7,
  name: 'Spring Cup',
  description: '',
  max_participants: 8,
  status: 'REGISTRATION_OPEN',
  phases: [],
  teams: [],
  createdAt: '2026-09-01T00:00:00Z',
  scheduledAt: '2027-02-01T18:00:00.000Z',
  registration_closes_at: '2027-02-01T12:00:00.000Z',
  checkin_opens_at: null,
}

const SEEDING = { tournamentId: 7, started: false, phaseType: 'SINGLE_ELIMINATION', teams: [{ id: 1 }, { id: 2 }], pairs: [], groups: [], excluded: [] }

function checkin(willBeArchived: unknown[]) {
  return { tournamentId: 7, state: 'open', opensAt: null, required: true, checkedIn: [], notCheckedIn: [], willBeArchived }
}

async function mountTab() {
  const wrapper = mount(MyTournamentsTab, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

const buttonByText = (w: VueWrapper, text: string) => w.findAll('button').find((b) => b.text() === text)
const dialogText = () => document.body.querySelector('.dialog-message')?.textContent ?? ''

describe('MyTournamentsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tournamentsApi.getAll.mockResolvedValue([TOURNAMENT])
    tournamentsApi.getSeeding.mockResolvedValue(SEEDING)
    tournamentsApi.getCheckin.mockResolvedValue(checkin([]))
    tournamentsApi.update.mockResolvedValue(TOURNAMENT)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('start confirmation', () => {
    it('lists the teams the check-in endpoint says will be archived, with the reason', async () => {
      tournamentsApi.getCheckin.mockResolvedValue(
        checkin([
          { id: 3, name: 'Draft FC', status: 'DRAFT', reason: 'not_locked' },
          { id: 4, name: 'Late Crew', status: 'LOCKED', reason: 'not_checked_in' },
          { id: 5, name: 'Sleepers', status: 'LOCKED', reason: 'not_checked_in' },
        ]),
      )
      const wrapper = await mountTab()
      await wrapper.find('.action-start').trigger('click')
      await flushPromises()

      expect(tournamentsApi.getCheckin).toHaveBeenCalledWith(7)
      const text = dialogText()
      expect(text).toContain(t('adminTournaments.startMessage', { count: 2 }))
      expect(text).toContain(t('adminTournaments.startArchivesNotLocked', { teams: 'Draft FC' }))
      expect(text).toContain(t('adminTournaments.startArchivesNotCheckedIn', { teams: 'Late Crew, Sleepers' }))
    })

    it('says nobody is archived when the list is empty', async () => {
      const wrapper = await mountTab()
      await wrapper.find('.action-start').trigger('click')
      await flushPromises()
      expect(dialogText()).toContain(t('adminTournaments.startArchivesNone'))
    })

    it('does not use the seeding list for the dropped teams', async () => {
      tournamentsApi.getSeeding.mockResolvedValue({
        ...SEEDING,
        excluded: [{ id: 9, name: 'Only In Seeding', status: 'DRAFT', reason: 'not_locked' }],
      })
      const wrapper = await mountTab()
      await wrapper.find('.action-start').trigger('click')
      await flushPromises()
      expect(dialogText()).not.toContain('Only In Seeding')
    })

    it('starts on confirm and not on cancel', async () => {
      tournamentsApi.start.mockResolvedValue({})
      const wrapper = await mountTab()
      await wrapper.find('.action-start').trigger('click')
      await flushPromises()
      ;(document.body.querySelector('.btn-secondary') as HTMLElement).click()
      await flushPromises()
      expect(tournamentsApi.start).not.toHaveBeenCalled()

      await wrapper.find('.action-start').trigger('click')
      await flushPromises()
      ;(document.body.querySelector('.btn-danger') as HTMLElement).click()
      await flushPromises()
      expect(tournamentsApi.start).toHaveBeenCalledWith(7)
    })

    it('shows no dialog when the check-in state cannot be loaded', async () => {
      tournamentsApi.getCheckin.mockRejectedValue(new ApiError(500, 'X', 'Boom'))
      const wrapper = await mountTab()
      await wrapper.find('.action-start').trigger('click')
      await flushPromises()
      expect(document.body.querySelector('.dialog-message')).toBeNull()
    })
  })

  describe('edit', () => {
    async function openEdit() {
      const wrapper = await mountTab()
      await buttonByText(wrapper, t('admin.editAction'))!.trigger('click')
      await flushPromises()
      return wrapper
    }

    const field = (w: VueWrapper, id: string) => w.find(`#edit-tournament-${id}`)

    it('shows the current dates in the edit row', async () => {
      const wrapper = await openEdit()
      expect((field(wrapper, 'scheduled').element as HTMLInputElement).value).not.toBe('')
      expect((field(wrapper, 'closes').element as HTMLInputElement).value).not.toBe('')
      expect((field(wrapper, 'checkin').element as HTMLInputElement).value).toBe('')
    })

    it('sends the new deadline and check-in opening as ISO strings', async () => {
      const wrapper = await openEdit()
      await field(wrapper, 'scheduled').setValue('2027-03-01T18:00')
      await field(wrapper, 'closes').setValue('2027-03-01T12:00')
      await field(wrapper, 'checkin').setValue('2027-03-01T10:00')
      await buttonByText(wrapper, t('common.save'))!.trigger('click')
      await flushPromises()

      expect(tournamentsApi.update).toHaveBeenCalledTimes(1)
      const [id, dto] = tournamentsApi.update.mock.calls[0]
      expect(id).toBe(7)
      expect(dto.scheduled_at).toBe(new Date('2027-03-01T18:00').toISOString())
      expect(dto.registration_closes_at).toBe(new Date('2027-03-01T12:00').toISOString())
      expect(dto.checkin_opens_at).toBe(new Date('2027-03-01T10:00').toISOString())
    })

    it('sends null to clear a date', async () => {
      const wrapper = await openEdit()
      await field(wrapper, 'closes').setValue('')
      await buttonByText(wrapper, t('common.save'))!.trigger('click')
      await flushPromises()

      const dto = tournamentsApi.update.mock.calls[0][1]
      expect(dto.registration_closes_at).toBeNull()
      expect(dto.checkin_opens_at).toBeNull()
      expect(dto.scheduled_at).not.toBeNull()
    })

    it('does not round-trip the start through UTC', async () => {
      const wrapper = await openEdit()
      await buttonByText(wrapper, t('common.save'))!.trigger('click')
      await flushPromises()
      expect(tournamentsApi.update.mock.calls[0][1].scheduled_at).toBe(TOURNAMENT.scheduledAt)
    })

    it('blocks saving a deadline after the start, like the backend', async () => {
      const wrapper = await openEdit()
      await field(wrapper, 'closes').setValue('2027-03-01T12:00')
      await field(wrapper, 'scheduled').setValue('2027-02-01T18:00')
      expect(wrapper.find('.schedule-error').exists()).toBe(true)
      await buttonByText(wrapper, t('common.save'))!.trigger('click')
      await flushPromises()
      expect(tournamentsApi.update).not.toHaveBeenCalled()
    })

    it('shows the validation error the backend answers with, and stays in edit mode', async () => {
      tournamentsApi.update.mockRejectedValue(
        new ApiError(400, 'Bad Request', 'checkin_opens_at must not be after scheduled_at'),
      )
      const wrapper = await openEdit()
      await buttonByText(wrapper, t('common.save'))!.trigger('click')
      await flushPromises()

      expect(wrapper.find('.edit-error').text()).toBe('checkin_opens_at must not be after scheduled_at')
      expect(field(wrapper, 'closes').exists()).toBe(true)
    })

    it('cancel leaves the row without saving', async () => {
      const wrapper = await openEdit()
      await buttonByText(wrapper, t('common.cancel'))!.trigger('click')
      expect(field(wrapper, 'closes').exists()).toBe(false)
      expect(tournamentsApi.update).not.toHaveBeenCalled()
    })
  })
})
