import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TournamentPodium from '../TournamentPodium.vue'
import type { Podium } from '../../../types'

const podium: Podium = {
  first: { teamId: 1, name: 'Alpha' },
  second: { teamId: 3, name: 'Charlie' },
  third: [
    { teamId: 2, name: 'Bravo' },
    { teamId: 4, name: 'Delta' },
  ],
}

describe('TournamentPodium', () => {
  it('renders nothing before the tournament is completed', () => {
    expect(mount(TournamentPodium, { props: { podium: null } }).find('[data-testid="podium"]').exists()).toBe(false)
    expect(mount(TournamentPodium).find('[data-testid="podium"]').exists()).toBe(false)
  })

  it('shows 1st, 2nd and both semi-final losers as 3rd', () => {
    const wrapper = mount(TournamentPodium, { props: { podium } })
    const steps = wrapper.findAll('.podium-step')
    expect(steps).toHaveLength(3)
    expect(steps[0].text()).toContain('Alpha')
    expect(steps[0].classes()).toContain('place-1')
    expect(steps[1].text()).toContain('Charlie')
    expect(steps[2].text()).toContain('Bravo')
    expect(steps[2].text()).toContain('Delta')
    expect(steps[2].text()).toContain('03')
  })

  it('skips 2nd and 3rd when there are none', () => {
    const wrapper = mount(TournamentPodium, {
      props: { podium: { first: { teamId: 1, name: 'Solo' }, second: null, third: [] } },
    })
    expect(wrapper.findAll('.podium-step')).toHaveLength(1)
  })

  it('links team names only when asked to', () => {
    expect(mount(TournamentPodium, { props: { podium } }).find('a').exists()).toBe(false)
    const linked = mount(TournamentPodium, { props: { podium, linkTeams: true } })
    expect(linked.find('a').attributes('href')).toBe('/menu/teams/1')
  })
})
