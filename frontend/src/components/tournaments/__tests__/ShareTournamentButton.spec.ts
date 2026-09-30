import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ShareTournamentButton from '../ShareTournamentButton.vue'
import { useNotificationsStore } from '../../../stores/notifications'

describe('ShareTournamentButton', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  })

  it('copies the /api/share/t/:id link, the address that unfurls with a preview card', async () => {
    writeText.mockResolvedValue(undefined)
    const toasts = useNotificationsStore()
    const success = vi.spyOn(toasts, 'success')

    const wrapper = mount(ShareTournamentButton, { props: { tournamentId: 7 } })
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/api/share/t/7`)
    expect(success).toHaveBeenCalled()
  })

  it('tells the user when copying is impossible', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    document.execCommand = vi.fn(() => false)
    const toasts = useNotificationsStore()
    const error = vi.spyOn(toasts, 'error')

    const wrapper = mount(ShareTournamentButton, { props: { tournamentId: 7 } })
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(error).toHaveBeenCalled()
  })
})
