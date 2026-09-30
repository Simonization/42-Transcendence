/**
 * Wraps a refetch so bursts of triggers cost at most two runs: the one in flight and one more
 * afterwards. A realtime event often arrives right after the user's own action already
 * refetched, and one command can publish several events (team room, user room, tournament
 * room); without this each of them would fire its own set of requests.
 *
 *   const refresh = useCoalescedRefresh(() => load(true))
 *   useLiveChannel('team', teamId, { [RealtimeEvents.TEAM_UPDATED]: refresh })
 */
export function useCoalescedRefresh(run: () => Promise<unknown> | unknown): () => Promise<void> {
  let running = false
  let again = false

  return async function refresh(): Promise<void> {
    if (running) {
      again = true
      return
    }
    running = true
    try {
      do {
        again = false
        await run()
      } while (again)
    } finally {
      running = false
    }
  }
}
