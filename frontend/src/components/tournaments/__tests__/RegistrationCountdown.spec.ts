import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '../../../i18n'
import RegistrationCountdown from '../RegistrationCountdown.vue'

const iso = (ms: number) => new Date(Date.now() + ms).toISOString()
const DAY = 86_400_000
const HOUR = 3_600_000

describe('RegistrationCountdown', () => {
  afterEach(() => {
    vi.useRealTimers()
    i18n.global.locale.value = 'en'
  })

  it('renders nothing without a deadline', () => {
    const wrapper = mount(RegistrationCountdown, { props: { closesAt: null } })
    expect(wrapper.find('[data-testid="registration-countdown"]').exists()).toBe(false)
  })

  it('counts down in days and hours', () => {
    const wrapper = mount(RegistrationCountdown, { props: { closesAt: iso(2 * DAY + 4 * HOUR + 60_000) } })
    expect(wrapper.text()).toBe('Registration closes in 2d 4h')
  })

  it('ticks, then switches to the closed state when the deadline passes', async () => {
    vi.useFakeTimers()
    const wrapper = mount(RegistrationCountdown, { props: { closesAt: iso(65_000) } })
    expect(wrapper.text()).toBe('Registration closes in 1m 5s')

    await vi.advanceTimersByTimeAsync(10_000)
    expect(wrapper.text()).toBe('Registration closes in 55s')
    expect(wrapper.classes()).not.toContain('registration-countdown-closed')

    await vi.advanceTimersByTimeAsync(60_000)
    expect(wrapper.text()).toBe('Registration closed')
    expect(wrapper.classes()).toContain('registration-countdown-closed')
  })

  it('is already closed for a past deadline', () => {
    const wrapper = mount(RegistrationCountdown, { props: { closesAt: iso(-1000) } })
    expect(wrapper.text()).toBe('Registration closed')
  })

  it('uses the French and Turkish unit suffixes', () => {
    i18n.global.locale.value = 'fr'
    const fr = mount(RegistrationCountdown, { props: { closesAt: iso(2 * DAY + 4 * HOUR + 60_000) } })
    expect(fr.text()).toBe('Les inscriptions ferment dans 2j 4h')

    i18n.global.locale.value = 'tr'
    const tr = mount(RegistrationCountdown, { props: { closesAt: iso(2 * DAY + 4 * HOUR + 60_000) } })
    expect(tr.text()).toBe('Kayıtların kapanmasına 2g 4sa var')
  })
})
