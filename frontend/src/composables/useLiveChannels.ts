/**
 * Like useLiveChannel, for a page that watches several rooms of one kind at once (an admin list
 * of tournaments). `ids` is reactive: rooms are joined as ids appear and left as they go, and a
 * handler runs for any event whose payload id is in the current set.
 *
 *   useLiveChannels('tournament', () => tournaments.value.map(t => t.id), {
 *     [RealtimeEvents.TOURNAMENT_UPDATED]: refresh,
 *   }, { onResync: refresh })
 */
import { computed, onScopeDispose, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { onSocketEvent, subscribeChannel } from '../services/socket'
import type { LiveChannel, RealtimeHandlers, RealtimePayload } from '../types/realtime'
import type { LiveChannelOptions } from './useLiveChannel'

export function useLiveChannels(
  channel: LiveChannel,
  ids: MaybeRefOrGetter<Array<number | string>>,
  handlers: RealtimeHandlers,
  options: LiveChannelOptions = {},
): void {
  const current = computed(() => {
    const valid = toValue(ids)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
    return [...new Set(valid)]
  })

  const removers: Array<() => void> = []

  for (const [event, handler] of Object.entries(handlers)) {
    if (!handler) continue
    removers.push(
      onSocketEvent(event, (payload?: RealtimePayload) => {
        if (payload?.id == null || !current.value.includes(Number(payload.id))) return
        handler(payload)
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

  const releases = new Map<number, () => void>()
  watch(
    current,
    (next) => {
      for (const [id, release] of releases) {
        if (!next.includes(id)) {
          release()
          releases.delete(id)
        }
      }
      for (const id of next) {
        if (!releases.has(id)) releases.set(id, subscribeChannel(channel, id))
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    releases.forEach((release) => release())
    releases.clear()
    removers.forEach((remove) => remove())
  })
}
