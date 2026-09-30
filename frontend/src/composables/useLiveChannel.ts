/**
 * Live updates for a page. See docs/realtime.md.
 *
 *   // refetch the bracket whenever the server says it moved
 *   useLiveChannel('tournament', tournamentId, {
 *     [RealtimeEvents.BRACKET_UPDATED]: () => loadBracket(),
 *   })
 *
 * Joins the room `<channel>:<id>` while the component is alive, leaves it on unmount, and moves
 * to the new room when `id` changes. Handlers only run for events about the current id (the
 * payload's `id`), so two components watching different tournaments do not see each other's
 * events. Handlers should refetch rather than trust the payload.
 */
import { computed, onScopeDispose, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { onSocketEvent, subscribeChannel } from '../services/socket'
import type { LiveChannel, RealtimeHandlers, RealtimePayload } from '../types/realtime'

export interface LiveChannelOptions {
  /**
   * Called after the socket comes back from a drop. Events sent while offline are lost, so this
   * is the place to refetch everything the page shows. Not called on the first connect.
   */
  onResync?: () => void
}

export function useLiveChannel(
  channel: LiveChannel,
  id: MaybeRefOrGetter<number | string | null | undefined>,
  handlers: RealtimeHandlers,
  options: LiveChannelOptions = {},
): void {
  const currentId = computed(() => {
    const n = Number(toValue(id))
    return Number.isInteger(n) && n > 0 ? n : null
  })

  const removers: Array<() => void> = []

  for (const [event, handler] of Object.entries(handlers)) {
    if (!handler) continue
    removers.push(
      onSocketEvent(event, (payload?: RealtimePayload) => {
        const wanted = currentId.value
        if (wanted === null) return
        if (payload?.id != null && Number(payload.id) !== wanted) return
        handler(payload ?? {})
      }),
    )
  }

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

  let release: (() => void) | null = null
  watch(
    currentId,
    (next) => {
      release?.()
      release = next === null ? null : subscribeChannel(channel, next)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    release?.()
    release = null
    removers.forEach((remove) => remove())
  })
}
