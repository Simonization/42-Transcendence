/**
 * useLiveChannel / useUserEvents tests: room lifecycle, id changes, event filtering.
 * Runs against the real shared socket service with a fake socket.io client.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h as vh, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'

const h = vi.hoisted(() => {
  type Fn = (...args: any[]) => void
  class FakeSocket {
    connected = false
    handlers = new Map<string, Fn[]>()
    emitted: Array<{ event: string; args: any[] }> = []
    disconnect = vi.fn(() => {
      this.connected = false
      this.trigger('disconnect')
    })
    on(event: string, fn: Fn) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn])
      return this
    }
    emit(event: string, ...args: any[]) {
      this.emitted.push({ event, args })
      return this
    }
    trigger(event: string, ...args: any[]) {
      this.handlers.get(event)?.forEach((fn) => fn(...args))
    }
    fireConnect() {
      this.connected = true
      this.trigger('connect')
    }
    sent(event: string) {
      return this.emitted.filter((e) => e.event === event).map((e) => e.args[0])
    }
  }
  return { FakeSocket, sockets: [] as InstanceType<typeof FakeSocket>[] }
})

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    const socket = new h.FakeSocket()
    h.sockets.push(socket)
    return socket
  }),
}))

vi.mock('../../api', () => ({ getAccessToken: () => 'token' }))

import { connectSocket, disconnectSocket } from '../../services/socket'
import { useLiveChannel } from '../useLiveChannel'
import { useUserEvents } from '../useUserEvents'
import { RealtimeEvents } from '../../types/realtime'

const socket = () => h.sockets[h.sockets.length - 1]

describe('useLiveChannel', () => {
  const wrappers: VueWrapper[] = []

  const mountWith = (setup: () => void) => {
    const wrapper = mount(defineComponent({ setup() { setup(); return () => vh('div') } }))
    wrappers.push(wrapper)
    return wrapper
  }

  beforeEach(() => {
    h.sockets.length = 0
    connectSocket()
    socket().fireConnect()
  })

  afterEach(() => {
    wrappers.splice(0).forEach((w) => w.unmount())
    disconnectSocket()
  })

  describe('room lifecycle', () => {
    it('joins the room on mount', () => {
      mountWith(() => useLiveChannel('tournament', 7, {}))

      expect(socket().sent('subscribe')).toEqual([{ channel: 'tournament', id: 7 }])
    })

    it('leaves the room on unmount', () => {
      const wrapper = mountWith(() => useLiveChannel('tournament', 7, {}))
      socket().emitted.length = 0

      wrapper.unmount()

      expect(socket().sent('unsubscribe')).toEqual([{ channel: 'tournament', id: 7 }])
    })

    it('accepts a numeric string id (route param)', () => {
      mountWith(() => useLiveChannel('tournament', '12', {}))

      expect(socket().sent('subscribe')).toEqual([{ channel: 'tournament', id: 12 }])
    })

    it('moves to the new room when the id changes', async () => {
      const id = ref(1)
      mountWith(() => useLiveChannel('match', id, {}))
      socket().emitted.length = 0

      id.value = 2
      await nextTick()

      expect(socket().sent('unsubscribe')).toEqual([{ channel: 'match', id: 1 }])
      expect(socket().sent('subscribe')).toEqual([{ channel: 'match', id: 2 }])
    })

    it('follows a getter', async () => {
      const id = ref(1)
      mountWith(() => useLiveChannel('team', () => id.value, {}))
      socket().emitted.length = 0

      id.value = 3
      await nextTick()

      expect(socket().sent('subscribe')).toEqual([{ channel: 'team', id: 3 }])
    })

    it.each([[null], [undefined], [0], [-1], ['abc'], [1.5]])('does not join for the id %s', (bad) => {
      mountWith(() => useLiveChannel('tournament', bad as any, {}))

      expect(socket().sent('subscribe')).toEqual([])
    })

    it('waits until the id becomes valid', async () => {
      const id = ref<number | null>(null)
      mountWith(() => useLiveChannel('tournament', id, {}))
      expect(socket().sent('subscribe')).toEqual([])

      id.value = 5
      await nextTick()

      expect(socket().sent('subscribe')).toEqual([{ channel: 'tournament', id: 5 }])
    })

    it('leaves without rejoining when the id becomes invalid', async () => {
      const id = ref<number | null>(5)
      mountWith(() => useLiveChannel('tournament', id, {}))
      socket().emitted.length = 0

      id.value = null
      await nextTick()

      expect(socket().sent('unsubscribe')).toEqual([{ channel: 'tournament', id: 5 }])
      expect(socket().sent('subscribe')).toEqual([])
    })

    it('shares the join between two components on the same room', () => {
      const a = mountWith(() => useLiveChannel('tournament', 7, {}))
      mountWith(() => useLiveChannel('tournament', 7, {}))
      expect(socket().sent('subscribe')).toHaveLength(1)

      a.unmount()
      expect(socket().sent('unsubscribe')).toEqual([])
    })

    it('rejoins after the socket reconnects', () => {
      mountWith(() => useLiveChannel('tournament', 7, {}))
      socket().emitted.length = 0

      socket().trigger('disconnect')
      socket().fireConnect()

      expect(socket().sent('subscribe')).toEqual([{ channel: 'tournament', id: 7 }])
    })
  })

  describe('events', () => {
    it('runs the handler for an event about the current id', () => {
      const onBracket = vi.fn()
      mountWith(() => useLiveChannel('tournament', 7, { [RealtimeEvents.BRACKET_UPDATED]: onBracket }))

      socket().trigger('bracket:updated', { id: 7, reason: 'match_finished' })

      expect(onBracket).toHaveBeenCalledWith({ id: 7, reason: 'match_finished' })
    })

    it('ignores events about another id', () => {
      const onBracket = vi.fn()
      mountWith(() => useLiveChannel('tournament', 7, { [RealtimeEvents.BRACKET_UPDATED]: onBracket }))

      socket().trigger('bracket:updated', { id: 8 })

      expect(onBracket).not.toHaveBeenCalled()
    })

    it('runs the handler when the payload carries no id', () => {
      const onBracket = vi.fn()
      mountWith(() => useLiveChannel('tournament', 7, { [RealtimeEvents.BRACKET_UPDATED]: onBracket }))

      socket().trigger('bracket:updated', { reason: 'started' })
      socket().trigger('bracket:updated')

      expect(onBracket).toHaveBeenCalledTimes(2)
    })

    it('routes each event to its own handler', () => {
      const onBracket = vi.fn()
      const onTournament = vi.fn()
      mountWith(() =>
        useLiveChannel('tournament', 7, {
          [RealtimeEvents.BRACKET_UPDATED]: onBracket,
          [RealtimeEvents.TOURNAMENT_UPDATED]: onTournament,
        }),
      )

      socket().trigger('tournament:updated', { id: 7 })

      expect(onTournament).toHaveBeenCalledTimes(1)
      expect(onBracket).not.toHaveBeenCalled()
    })

    it('follows the id: events for the old id stop, events for the new id start', async () => {
      const id = ref(1)
      const handler = vi.fn()
      mountWith(() => useLiveChannel('match', id, { [RealtimeEvents.MATCH_UPDATED]: handler }))

      id.value = 2
      await nextTick()
      socket().trigger('match:updated', { id: 1 })
      socket().trigger('match:updated', { id: 2 })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ id: 2 })
    })

    it('stops running handlers after unmount', () => {
      const handler = vi.fn()
      const wrapper = mountWith(() => useLiveChannel('tournament', 7, { [RealtimeEvents.BRACKET_UPDATED]: handler }))

      wrapper.unmount()
      socket().trigger('bracket:updated', { id: 7 })

      expect(handler).not.toHaveBeenCalled()
    })

    it('keeps working after the socket is replaced', () => {
      const handler = vi.fn()
      mountWith(() => useLiveChannel('tournament', 7, { [RealtimeEvents.BRACKET_UPDATED]: handler }))

      disconnectSocket()
      connectSocket()
      socket().fireConnect()
      socket().trigger('bracket:updated', { id: 7 })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(socket().sent('subscribe')).toEqual([{ channel: 'tournament', id: 7 }])
    })
  })

  describe('onResync', () => {
    it('fires after a drop and reconnect, not on the first connect', () => {
      const onResync = vi.fn()
      mountWith(() => useLiveChannel('tournament', 7, {}, { onResync }))

      socket().fireConnect()
      expect(onResync).not.toHaveBeenCalled()

      socket().trigger('disconnect')
      socket().fireConnect()
      expect(onResync).toHaveBeenCalledTimes(1)

      socket().fireConnect()
      expect(onResync).toHaveBeenCalledTimes(1)
    })

    it('stops after unmount', () => {
      const onResync = vi.fn()
      const wrapper = mountWith(() => useLiveChannel('tournament', 7, {}, { onResync }))

      wrapper.unmount()
      socket().trigger('disconnect')
      socket().fireConnect()

      expect(onResync).not.toHaveBeenCalled()
    })
  })
})

describe('useUserEvents', () => {
  const wrappers: VueWrapper[] = []

  beforeEach(() => {
    h.sockets.length = 0
    connectSocket()
    socket().fireConnect()
  })

  afterEach(() => {
    wrappers.splice(0).forEach((w) => w.unmount())
    disconnectSocket()
  })

  it('delivers user events without joining any room', () => {
    const handler = vi.fn()
    wrappers.push(
      mount(defineComponent({ setup() { useUserEvents({ [RealtimeEvents.INVITATION_RECEIVED]: handler }); return () => vh('div') } })),
    )

    socket().trigger('invitation:received', { id: 3, reason: 'invited' })

    expect(handler).toHaveBeenCalledWith({ id: 3, reason: 'invited' })
    expect(socket().sent('subscribe')).toEqual([])
  })

  it('stops delivering after unmount', () => {
    const handler = vi.fn()
    const wrapper = mount(
      defineComponent({ setup() { useUserEvents({ [RealtimeEvents.INVITATION_RECEIVED]: handler }); return () => vh('div') } }),
    )

    wrapper.unmount()
    socket().trigger('invitation:received', { id: 3 })

    expect(handler).not.toHaveBeenCalled()
  })
})
