# WebSocket & Socket.io Patterns for Vue

Real-time communication patterns, type-safe message handling, connection lifecycle, and error recovery for Vue applications.

## Socket.io Client Setup

Never parse raw socket data - use Socket.io client library properly:

**❌ Current (Fragile):**
```ts
socket.on('message', (data) => {
  if (data.startsWith('42')) {
    // Raw '42' prefix parsing - fragile and error-prone
    const parsed = JSON.parse(data.substring(2))
  }
})
```

**✅ Proper Socket.io Usage:**
```ts
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
})

// Event listeners are type-safe
socket.on('message', (data) => {
  console.log('Received message:', data)
})

socket.emit('send_message', {
  content: 'Hello',
  roomId: '123',
})
```

## Type-Safe Socket Events

Define event types for better IDE support and type safety:

```ts
// types/socket.ts
export interface MessageEvent {
  id: string
  content: string
  userId: string
  timestamp: Date
}

export interface RoomJoinedEvent {
  roomId: string
  users: string[]
}

export interface ChatServerToClient {
  message: (data: MessageEvent) => void
  room_joined: (data: RoomJoinedEvent) => void
  user_typing: (data: { userId: string }) => void
  disconnect: () => void
}

export interface ChatClientToServer {
  send_message: (data: { content: string; roomId: string }) => void
  join_room: (roomId: string) => void
  leave_room: (roomId: string) => void
}

// Usage with proper typing
socket.on<'message'>(
  'message',
  (data: MessageEvent) => {
    messages.value.push(data)
  }
)

socket.emit<'send_message'>(
  'send_message',
  { content: 'Hi', roomId: '123' }
)
```

## Socket.io Composable Pattern

Encapsulate socket logic in a composable for reusability:

```ts
// composables/useSocket.ts
import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const useSocket = () => {
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const error = ref<Error | null>(null)

  onMounted(() => {
    if (!socket) {
      socket = io('http://localhost:3000', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      })

      // Connection events
      socket.on('connect', () => {
        isConnected.value = true
        isConnecting.value = false
      })

      socket.on('disconnect', () => {
        isConnected.value = false
      })

      socket.on('connect_error', (err) => {
        error.value = err
      })
    }
  })

  onUnmounted(() => {
    // Only disconnect when last component unmounts
    // (use ref counting if shared across components)
    if (socket) {
      socket.disconnect()
      socket = null
    }
  })

  const emit = <E extends keyof ChatClientToServer>(
    event: E,
    ...args: Parameters<ChatClientToServer[E]>
  ) => {
    socket?.emit(event, ...args)
  }

  const on = <E extends keyof ChatServerToClient>(
    event: E,
    callback: ChatServerToClient[E]
  ) => {
    socket?.on(event, callback as any)
  }

  const off = (event: string) => {
    socket?.off(event)
  }

  return {
    isConnected,
    isConnecting,
    error,
    emit,
    on,
    off,
  }
}
```

## Connection Lifecycle Management

Properly connect/disconnect to prevent memory leaks:

```ts
// composables/useChatConnection.ts
export const useChatConnection = (roomId: string) => {
  const { isConnected, emit, on, off } = useSocket()
  const messages = ref<MessageEvent[]>([])

  const joinRoom = () => {
    if (isConnected.value) {
      emit('join_room', roomId)
    }
  }

  const leaveRoom = () => {
    emit('leave_room', roomId)
  }

  const sendMessage = (content: string) => {
    emit('send_message', { content, roomId })
  }

  onMounted(() => {
    // Connect and join room
    joinRoom()

    // Listen to messages
    on('message', (data) => {
      messages.value.push(data)
    })
  })

  onUnmounted(() => {
    // Clean up listeners (important!)
    off('message')
    leaveRoom()
  })

  // Watch for room changes
  watch(() => roomId, () => {
    leaveRoom()
    messages.value = []
    joinRoom()
  })

  return { messages, sendMessage, isConnected }
}
```

## Error Handling & Reconnection

Auto-reconnect with exponential backoff:

```ts
// composables/useSocketWithReconnection.ts
export const useSocketWithReconnection = () => {
  const socket = io('http://localhost:3000', {
    reconnection: true,
    reconnectionDelay: 1000,         // Start with 1s
    reconnectionDelayMax: 5000,      // Max 5s
    reconnectionAttempts: Infinity,  // Keep retrying
  })

  const isConnected = ref(false)
  const connectionAttempts = ref(0)

  socket.on('connect', () => {
    isConnected.value = true
    connectionAttempts.value = 0
    console.log('✅ Socket connected')
  })

  socket.on('disconnect', (reason) => {
    isConnected.value = false
    console.warn(`❌ Socket disconnected: ${reason}`)

    // Notify user if unexpected disconnect
    if (reason !== 'io client namespace disconnect') {
      showNotification('Lost connection - reconnecting...', 'warning')
    }
  })

  socket.on('connect_error', (error) => {
    connectionAttempts.value++
    console.error(`⚠️ Connection attempt ${connectionAttempts.value}:`, error)

    if (connectionAttempts.value > 5) {
      showNotification('Unable to connect - please check your connection', 'error')
    }
  })

  socket.on('reconnect_attempt', () => {
    console.log('🔄 Attempting to reconnect...')
  })

  return { socket, isConnected, connectionAttempts }
}
```

## Message Queuing (Offline Support)

Queue messages when disconnected, send when reconnected:

```ts
// composables/useMessageQueue.ts
export const useMessageQueue = () => {
  const { isConnected, emit } = useSocket()
  const messageQueue = ref<any[]>([])

  const queueMessage = (event: string, data: any) => {
    messageQueue.value.push({ event, data })
  }

  const sendMessage = (event: string, data: any) => {
    if (isConnected.value) {
      emit(event, data)
    } else {
      queueMessage(event, data)
    }
  }

  // Process queue when reconnected
  watch(isConnected, (connected) => {
    if (connected && messageQueue.value.length > 0) {
      messageQueue.value.forEach(({ event, data }) => {
        emit(event, data)
      })
      messageQueue.value = []
      showNotification('Messages sent', 'success')
    }
  })

  return { sendMessage, messageQueue }
}
```

## Testing Socket Connections

Mock Socket.io in tests:

```ts
import { vi } from 'vitest'
import { io } from 'socket.io-client'

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  })),
}))

describe('useSocket', () => {
  it('should connect to socket server', () => {
    const { useSocket } = require('@/composables/useSocket')
    const { isConnected } = useSocket()

    expect(io).toHaveBeenCalledWith('http://localhost:3000', expect.any(Object))
  })

  it('should emit message event', () => {
    const mockSocket = vi.mocked(io).mock.results[0].value
    const { emit } = useSocket()

    emit('send_message', { content: 'test', roomId: '1' })

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'send_message',
      { content: 'test', roomId: '1' }
    )
  })

  it('should clean up listeners on unmount', () => {
    const { unmount } = render(ChatComponent)
    unmount()

    const mockSocket = vi.mocked(io).mock.results[0].value
    expect(mockSocket.disconnect).toHaveBeenCalled()
  })
})
```

## Common Fixes for This Project

### 1. Remove Raw '42' Parsing
**Current:**
```ts
socket.onmessage = (event) => {
  if (event.data.startsWith('42')) {
    const data = JSON.parse(event.data.substring(2))
  }
}
```

**Fix: Use Socket.io client properly:**
```ts
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000')
socket.on('message', (data) => {
  // data is already parsed
  console.log(data)
})
```

### 2. Clean Up Listeners on Unmount
**Current:** Listeners not removed → memory leaks

**Fix:**
```vue
<script setup>
const { on, off } = useSocket()

const handleMessage = (data) => {
  messages.value.push(data)
}

onMounted(() => {
  on('message', handleMessage)
})

onUnmounted(() => {
  off('message') // ✅ Clean up
})
</script>
```

### 3. Handle Disconnections Gracefully
**Fix:**
```ts
socket.on('disconnect', () => {
  showNotification(
    'Connection lost - attempting to reconnect',
    'warning'
  )
})

socket.on('connect', () => {
  showNotification('Connected', 'success')
  // Rejoin rooms, resync state
})
```

## Performance Considerations

- **Don't create new socket instances** - use singleton pattern
- **Unsubscribe from events** when components unmount
- **Debounce rapid events** (typing indicators)
- **Limit message queue size** to prevent memory issues
- **Set connection timeouts** to avoid hanging connections

## References

- [Socket.io Documentation](https://socket.io/docs/v4/client-api/)
- [Socket.io Vue Integration](https://socket.io/how-to/use-with-vue)
- [WebSocket Best Practices](https://www.ably.io/topic/websockets)
- [Real-time Data Patterns](https://firebase.google.com/docs/realtime)
