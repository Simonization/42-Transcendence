/**
 * Shared socket service tests: one connection, token handling, listener and room bookkeeping.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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
    constructor(public options: any) {}
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
  return { FakeSocket, sockets: [] as InstanceType<typeof FakeSocket>[], token: { value: 'tok-a' as string | null } }
})

vi.mock('socket.io-client', () => ({
  io: vi.fn((_url: string, options: any) => {
    const socket = new h.FakeSocket(options)
    h.sockets.push(socket)
    return socket
  }),
}))

vi.mock('../../api', () => ({
  getAccessToken: () => h.token.value,
}))

import { io } from 'socket.io-client'
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  onSocketEvent,
  subscribeChannel,
  wsConnected,
} from '../socket'

const latest = () => h.sockets[h.sockets.length - 1]

describe('socket service', () => {
  beforeEach(() => {
    h.sockets.length = 0
    h.token.value = 'tok-a'
    vi.mocked(io).mockClear()
  })

  afterEach(() => {
    disconnectSocket()
  })

  describe('connection', () => {
    it('opens exactly one socket however often it is asked to connect', () => {
      const first = connectSocket()
      const second = connectSocket()
      first!.connected = true
      const third = connectSocket()

      expect(io).toHaveBeenCalledTimes(1)
      expect(second).toBe(first)
      expect(third).toBe(first)
      expect(getSocket()).toBe(first)
    })

    it('connects to the same origin over websocket, authenticating with the token', () => {
      connectSocket()

      expect(io).toHaveBeenCalledWith('/', expect.objectContaining({ transports: ['websocket'], reconnection: true }))
      const cb = vi.fn()
      latest().options.auth(cb)
      expect(cb).toHaveBeenCalledWith({ token: 'tok-a' })
    })

    it('sends the current token on an automatic reconnect, not the one from first connect', () => {
      connectSocket()
      h.token.value = 'tok-refreshed'

      const cb = vi.fn()
      latest().options.auth(cb)

      expect(cb).toHaveBeenCalledWith({ token: 'tok-refreshed' })
    })

    it('does nothing without a token', () => {
      h.token.value = null

      expect(connectSocket()).toBeNull()
      expect(io).not.toHaveBeenCalled()
      expect(getSocket()).toBeNull()
    })

    it('reconnects as the new user when the token changes', () => {
      const first = connectSocket()
      h.token.value = 'tok-b'
      const second = connectSocket()

      expect(io).toHaveBeenCalledTimes(2)
      expect(first!.disconnect).toHaveBeenCalled()
      expect(second).not.toBe(first)
      expect(getSocket()).toBe(second)
    })

    it('closes the socket when the token is gone', () => {
      const socket = connectSocket()
      h.token.value = null

      expect(connectSocket()).toBeNull()
      expect(socket!.disconnect).toHaveBeenCalled()
      expect(getSocket()).toBeNull()
    })

    it('opens a fresh socket after an explicit disconnect', () => {
      const first = connectSocket()
      disconnectSocket()
      const second = connectSocket()

      expect(first!.disconnect).toHaveBeenCalled()
      expect(second).not.toBe(first)
      expect(io).toHaveBeenCalledTimes(2)
    })

    it('tolerates disconnecting when nothing is open', () => {
      expect(() => {
        disconnectSocket()
        disconnectSocket()
      }).not.toThrow()
    })

    it('tracks connection state', () => {
      connectSocket()
      expect(wsConnected.value).toBe(false)

      latest().fireConnect()
      expect(wsConnected.value).toBe(true)

      latest().trigger('disconnect')
      expect(wsConnected.value).toBe(false)

      latest().fireConnect()
      latest().trigger('connect_error')
      expect(wsConnected.value).toBe(false)
    })

    it('reports disconnected after teardown', () => {
      connectSocket()
      latest().fireConnect()

      disconnectSocket()

      expect(wsConnected.value).toBe(false)
    })
  })

  describe('onSocketEvent', () => {
    it('binds handlers registered before the socket exists', () => {
      const handler = vi.fn()
      const off = onSocketEvent('newMessage', handler)

      connectSocket()
      latest().trigger('newMessage', { id: 1 })

      expect(handler).toHaveBeenCalledWith({ id: 1 })
      off()
    })

    it('binds handlers registered after the socket exists', () => {
      connectSocket()
      const handler = vi.fn()
      const off = onSocketEvent('notification', handler)

      latest().trigger('notification', 'x')

      expect(handler).toHaveBeenCalledWith('x')
      off()
    })

    it('keeps handlers when the socket is replaced', () => {
      const handler = vi.fn()
      const off = onSocketEvent('friendActivity', handler)
      connectSocket()
      h.token.value = 'tok-b'
      connectSocket()

      latest().trigger('friendActivity')

      expect(h.sockets).toHaveLength(2)
      expect(handler).toHaveBeenCalledTimes(1)
      off()
    })

    it('keeps handlers across logout and login', () => {
      const handler = vi.fn()
      const off = onSocketEvent('friendActivity', handler)
      connectSocket()
      disconnectSocket()
      connectSocket()

      latest().trigger('friendActivity')

      expect(handler).toHaveBeenCalledTimes(1)
      off()
    })

    it('fans one event out to every handler using a single socket listener', () => {
      const a = vi.fn()
      const b = vi.fn()
      const offA = onSocketEvent('ping', a)
      const offB = onSocketEvent('ping', b)
      connectSocket()

      expect(latest().handlers.get('ping')).toHaveLength(1)
      latest().trigger('ping', 1)

      expect(a).toHaveBeenCalledWith(1)
      expect(b).toHaveBeenCalledWith(1)
      offA()
      offB()
    })

    it('stops calling a handler once removed', () => {
      const handler = vi.fn()
      const off = onSocketEvent('ping', handler)
      connectSocket()

      off()
      latest().trigger('ping')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('subscribeChannel', () => {
    it('joins straight away when connected', () => {
      connectSocket()
      latest().fireConnect()
      latest().emitted.length = 0

      const release = subscribeChannel('tournament', 4)

      expect(latest().sent('subscribe')).toEqual([{ channel: 'tournament', id: 4 }])
      release()
    })

    it('waits for the connection, then joins', () => {
      connectSocket()
      const release = subscribeChannel('match', 9)
      expect(latest().sent('subscribe')).toEqual([])

      latest().fireConnect()

      expect(latest().sent('subscribe')).toEqual([{ channel: 'match', id: 9 }])
      release()
    })

    it('rejoins after a reconnect, because server rooms do not survive one', () => {
      connectSocket()
      latest().fireConnect()
      const release = subscribeChannel('team', 2)
      latest().emitted.length = 0

      latest().trigger('disconnect')
      latest().fireConnect()

      expect(latest().sent('subscribe')).toEqual([{ channel: 'team', id: 2 }])
      release()
    })

    it('rejoins on a replacement socket', () => {
      connectSocket()
      latest().fireConnect()
      const release = subscribeChannel('tournament', 4)

      h.token.value = 'tok-b'
      connectSocket()
      latest().fireConnect()

      expect(latest().sent('subscribe')).toEqual([{ channel: 'tournament', id: 4 }])
      release()
    })

    it('shares one server-side join between consumers of the same room', () => {
      connectSocket()
      latest().fireConnect()
      latest().emitted.length = 0

      const releaseA = subscribeChannel('tournament', 4)
      const releaseB = subscribeChannel('tournament', 4)
      expect(latest().sent('subscribe')).toHaveLength(1)

      releaseA()
      expect(latest().sent('unsubscribe')).toEqual([])

      releaseB()
      expect(latest().sent('unsubscribe')).toEqual([{ channel: 'tournament', id: 4 }])
    })

    it('treats different ids and channels as different rooms', () => {
      connectSocket()
      latest().fireConnect()
      latest().emitted.length = 0

      const releases = [
        subscribeChannel('tournament', 4),
        subscribeChannel('tournament', 5),
        subscribeChannel('match', 4),
      ]

      expect(latest().sent('subscribe')).toHaveLength(3)
      releases.forEach((release) => release())
      expect(latest().sent('unsubscribe')).toHaveLength(3)
    })

    it('ignores a second release from the same consumer', () => {
      connectSocket()
      latest().fireConnect()
      const keep = subscribeChannel('tournament', 4)
      const release = subscribeChannel('tournament', 4)
      latest().emitted.length = 0

      release()
      release()

      expect(latest().sent('unsubscribe')).toEqual([])
      keep()
    })

    it('does not rejoin a room that was released while offline', () => {
      connectSocket()
      const release = subscribeChannel('tournament', 4)
      release()

      latest().fireConnect()

      expect(latest().sent('subscribe')).toEqual([])
    })

    it('does not throw when there is no socket at all', () => {
      const release = subscribeChannel('tournament', 4)
      expect(() => release()).not.toThrow()
    })
  })
})
