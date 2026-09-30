/**
 * Events addressed to the current user (the personal `user:<id>` room the server puts every
 * authenticated socket in, so there is nothing to subscribe to). See docs/realtime.md.
 *
 *   useUserEvents({
 *     [RealtimeEvents.INVITATION_RECEIVED]: () => refreshInvitations(),
 *   })
 *
 * Handlers are removed when the component unmounts. `onResync` runs after a reconnect.
 */
import { onScopeDispose } from 'vue'
import { onSocketEvent } from '../services/socket'
import type { RealtimeHandlers, RealtimePayload } from '../types/realtime'
import type { LiveChannelOptions } from './useLiveChannel'

export function useUserEvents(handlers: RealtimeHandlers, options: LiveChannelOptions = {}): void {
  const removers: Array<() => void> = []

  for (const [event, handler] of Object.entries(handlers)) {
    if (!handler) continue
    removers.push(onSocketEvent(event, (payload?: RealtimePayload) => handler(payload ?? {})))
  }

  // Events sent while the socket was down are gone: let the page refetch when it comes back.
  if (options.onResync) {
    const resync = options.onResync
    let dropped = false
    removers.push(onSocketEvent('disconnect', () => { dropped = true }))
    removers.push(
      onSocketEvent('connect', () => {
        if (!dropped) return
        dropped = false
        resync()
      }),
    )
  }

  onScopeDispose(() => removers.forEach((remove) => remove()))
}
