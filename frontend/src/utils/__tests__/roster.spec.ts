import { describe, it, expect } from 'vitest'
import { maxRosterSize, substituteIds } from '../roster'

describe('roster', () => {
  it('allows two substitutes on top of the team size', () => {
    expect(maxRosterSize(2)).toBe(4)
  })

  it('puts everyone past the first teamSize on the bench, captain always starting', () => {
    const members = [{ id: 4 }, { id: 2 }, { id: 9 }, { id: 5 }]
    expect([...substituteIds(members, 9, 2)]).toEqual([2, 5])
    expect(substituteIds(members, 9, 4).size).toBe(0)
  })
})
