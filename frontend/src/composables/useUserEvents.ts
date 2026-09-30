/**
 * Events addressed to the current user (the personal `user:<id>` room the server puts every
 * authenticated socket in, so there is nothing to subscribe to). See docs/realtime.md.
 *
 *   useUserEvents({
 *     [RealtimeEvents.INVITATION_RECEIVED]: () => refreshInvitations(),
 *   })
 *
 * Handlers are removed when the component unmounts.
 */
import { onScopeDispose } from 'vue'
import { onSocketEvent } from '../services/socket'
import type { RealtimeHandlers, RealtimePayload } from '../types/realtime'

export function useUserEvents(handlers: RealtimeHandlers): void {
  const removers: Array<() => void> = []

  for (const [event, handler] of Object.entries(handlers)) {
    if (!handler) continue
    removers.push(onSocketEvent(event, (payload?: RealtimePayload) => handler(payload ?? {})))
  }

  onScopeDispose(() => removers.forEach((remove) => remove()))
}
