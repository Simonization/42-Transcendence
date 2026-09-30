import { describe, it, expect, vi } from 'vitest'
import { useCoalescedRefresh } from '../useCoalescedRefresh'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((r) => { resolve = r })
  return { promise, resolve }
}

describe('useCoalescedRefresh', () => {
  it('runs once for a single trigger', async () => {
    const run = vi.fn().mockResolvedValue(undefined)
    await useCoalescedRefresh(run)()
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('collapses triggers during a run into exactly one follow-up', async () => {
    const gates = [deferred(), deferred()]
    const run = vi.fn().mockImplementation(() => gates[run.mock.calls.length - 1].promise)
    const refresh = useCoalescedRefresh(run)

    const first = refresh()
    void refresh()
    void refresh()
    void refresh()
    expect(run).toHaveBeenCalledTimes(1)

    gates[0].resolve()
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(2))
    gates[1].resolve()
    await first

    expect(run).toHaveBeenCalledTimes(2)
  })

  it('can run again after finishing, and recovers when the run throws', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined)
    const refresh = useCoalescedRefresh(run)

    await expect(refresh()).rejects.toThrow('boom')
    await refresh()

    expect(run).toHaveBeenCalledTimes(2)
  })
})
