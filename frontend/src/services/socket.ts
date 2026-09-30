/**
 * The app's single Socket.IO connection.
 *
 * `composables/useChat.ts` (app shell: notifications, friend activity) and `stores/chat.ts` (the
 * chat page) used to open one socket each, so a browser on the chat page held two authenticated
 * connections. This module is now the only place that calls `io()`. Everything else attaches
 * through `onSocketEvent` and `subscribeChannel`, which survive the socket being replaced
 * (logout then login, or a changed token), so callers never hold a raw socket.
 *
 * Lifecycle: `connectSocket()` is idempotent and safe to call from anywhere; it does nothing
 * without an access token. `disconnectSocket()` is the real teardown and belongs to whoever owns
 * the session (logout), not to a page that merely stops using the socket.
 */
import { ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { getAccessToken } from '../api'
import type { LiveChannel } from '../types/realtime'

type Handler = (...args: any[]) => void

let socket: Socket | null = null
let socketToken: string | null = null

/** True while the shared socket is connected. Reactive; the single source for every "link up" indicator. */
export const wsConnected = ref(false)

// event -> handlers. Kept outside the socket so they are re-bound when the socket is replaced.
const handlers = new Map<string, Set<Handler>>()
// event -> the one dispatcher currently bound to the live socket for that event.
const dispatchers = new Map<string, Handler>()
// "channel:id" -> number of live consumers. Server rooms die with the connection, so the set is
// re-emitted on every (re)connect.
const channels = new Map<string, { channel: LiveChannel; id: number; refs: number }>()

const channelKey = (channel: LiveChannel, id: number) => `${channel}:${id}`

export function getSocket(): Socket | null {
  return socket
}

function bind(event: string): void {
  if (!socket || dispatchers.has(event)) return
  const dispatch: Handler = (...args) => {
    handlers.get(event)?.forEach((h) => h(...args))
  }
  dispatchers.set(event, dispatch)
  socket.on(event, dispatch)
}

function emitSubscribe(channel: LiveChannel, id: number): void {
  socket?.emit('subscribe', { channel, id }, (res?: { ok?: boolean; error?: string }) => {
    if (import.meta.env.DEV && res && res.ok === false) {
      console.warn(`[realtime] subscribe ${channel}:${id} refused (${res.error})`)
    }
  })
}

function resubscribeAll(): void {
  channels.forEach(({ channel, id }) => emitSubscribe(channel, id))
}

function teardown(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  socketToken = null
  dispatchers.clear()
  wsConnected.value = false
}

/**
 * Open the connection if there is a token and none exists for that token yet. If the token
 * changed since the socket was opened (new login without an explicit disconnect), the old socket
 * is closed and a fresh one authenticated as the new user replaces it; if the token is gone, any
 * open socket is closed.
 */
export function connectSocket(): Socket | null {
  const token = getAccessToken()
  if (!token) {
    // Logged out (tokens cleared elsewhere): do not keep talking as the previous user.
    if (socket) teardown()
    return null
  }

  if (socket && socketToken === token) return socket
  if (socket) teardown()

  socketToken = token
  socket = io('/', {
    path: '/socket.io/',
    transports: ['websocket'],
    // A function, so an automatic reconnect sends the current token, not the one from first connect.
    auth: (cb: (data: object) => void) => cb({ token: getAccessToken() ?? token }),
    reconnection: true,
  })

  socket.on('connect', () => {
    wsConnected.value = true
    resubscribeAll()
  })
  socket.on('disconnect', () => {
    wsConnected.value = false
  })
  socket.on('connect_error', () => {
    wsConnected.value = false
  })

  handlers.forEach((_set, event) => bind(event))
  return socket
}

/** Close the connection for good (logout). Registered handlers and channels are kept for the next login. */
export function disconnectSocket(): void {
  teardown()
}

/**
 * Listen to a server event for as long as needed. Works before the socket exists and across
 * reconnects and token changes. Returns the function that removes this handler.
 */
export function onSocketEvent(event: string, handler: Handler): () => void {
  let set = handlers.get(event)
  if (!set) {
    set = new Set()
    handlers.set(event, set)
  }
  set.add(handler)
  bind(event)

  return () => {
    handlers.get(event)?.delete(handler)
  }
}

/**
 * Join a realtime room (`tournament:<id>`, `match:<id>`, `team:<id>`). Reference counted: two
 * components watching the same tournament share one server-side join, and the room is left
 * when the last one goes. Returns the function that releases this reference.
 */
export function subscribeChannel(channel: LiveChannel, id: number): () => void {
  const key = channelKey(channel, id)
  const entry = channels.get(key)
  if (entry) {
    entry.refs++
  } else {
    channels.set(key, { channel, id, refs: 1 })
    if (socket?.connected) emitSubscribe(channel, id)
  }

  let released = false
  return () => {
    if (released) return
    released = true
    const current = channels.get(key)
    if (!current) return
    current.refs--
    if (current.refs > 0) return
    channels.delete(key)
    if (socket?.connected) socket.emit('unsubscribe', { channel, id })
  }
}
