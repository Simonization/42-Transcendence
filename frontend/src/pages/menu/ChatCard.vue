<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useChatStore } from '../../stores/chat'
import ChatRoomList from '../../components/chat/ChatRoomList.vue'
import ChatConversation from '../../components/chat/ChatConversation.vue'
import MessageInput from '../../components/chat/MessageInput.vue'

const { user } = useAuthStore()
const chatStore = useChatStore()
const {
  rooms,
  activeRoomId,
  activeRoom,
  messages,
  isLoadingRooms,
  isLoadingMessages,
  isSending,
  error,
  wsConnected,
  fetchRooms,
  selectRoom,
  sendMessage,
  createRoom,
  deleteMessage,
  connectSocket,
  disconnectSocket,
} = chatStore

const newChatUserId = ref('')
const showNewChat = ref(false)

const activeRoomTitle = computed(() => {
  if (!activeRoom.value) return 'Chat'
  return activeRoom.value.title
    || activeRoom.value.participants.find(p => p.id !== user.value?.id)?.username
    || 'Chat'
})

onMounted(() => {
  fetchRooms()
})

onUnmounted(() => {

})

const handleSend = (content: string) => {
  sendMessage(content)
}

const handleNewChat = async () => {
  const id = parseInt(newChatUserId.value, 10)
  if (isNaN(id) || id <= 0) return
  await createRoom([id])
  newChatUserId.value = ''
  showNewChat.value = false
}
</script>

<template>
  <div class="card card-page chat-layout glass-panel">
    <!-- Sidebar: Room list -->
    <aside class="chat-sidebar">
      <div class="sidebar-header">
        <h3 class="sidebar-title">{{ $t('chat.title') }}</h3>
        <div class="sidebar-actions">
          <span v-if="wsConnected" class="ws-dot ws-dot-on" title="WebSocket connected"></span>
          <span v-else class="ws-dot ws-dot-off" title="WebSocket disconnected"></span>
          <button class="btn btn-ghost btn-sm" @click="showNewChat = !showNewChat">
            {{ showNewChat ? '&times;' : '+' }}
          </button>
        </div>
      </div>

      <!-- New chat input -->
      <div v-if="showNewChat" class="new-chat-form">
        <input
          v-model="newChatUserId"
          type="text"
          class="input"
          :placeholder="$t('chat.userIdPlaceholder')"
          inputmode="numeric"
          aria-label="User ID to start chat with"
          @keydown.enter.prevent="handleNewChat"
        />
        <button class="btn btn-primary btn-sm" @click="handleNewChat">{{ $t('common.start') }}</button>
      </div>

      <div v-if="isLoadingRooms" class="loading-text">{{ $t('common.loading') }}</div>
      <ChatRoomList
        v-else
        :rooms="rooms"
        :active-room-id="activeRoomId"
        :current-user-id="user?.id || 0"
        @select="selectRoom"
      />
    </aside>

    <!-- Main: Conversation -->
    <div class="chat-main">
      <template v-if="activeRoom">
        <div class="chat-main-header">
          <h3 class="chat-main-title">
            {{ activeRoomTitle }}
          </h3>
          <span class="badge badge-primary" v-if="activeRoom.type === 1">{{ $t('common.group') }}</span>
        </div>

        <ChatConversation
          :messages="messages"
          :current-user-id="user?.id || 0"
          :is-loading="isLoadingMessages"
          @delete-message="deleteMessage"
        />

        <MessageInput
          :disabled="isSending"
          @send="handleSend"
        />
      </template>

      <div v-else class="chat-empty">
        <p class="text-tertiary">{{ $t('chat.selectConversation') }}</p>
      </div>
    </div>

    <!-- Error -->
    <Transition name="msg">
      <p v-if="error" class="chat-error alert alert-error">{{ error }}</p>
    </Transition>
  </div>
</template>

<style scoped>
.card-page {
  width: 100%;
  max-width: 900px;
}

.chat-layout {
  display: flex;
  min-height: 400px;
  max-height: 80vh;
  overflow: hidden;
  position: relative;
}

/* Sidebar */
.chat-sidebar {
  width: var(--sidebar-width);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.sidebar-title {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  margin: 0;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ws-dot {
  width: 8px;
  height: 8px;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}

.ws-dot-on {
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
}

.ws-dot-off {
  background: var(--text-tertiary);
}

.new-chat-form {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
}

.new-chat-form .input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2);
  font-size: var(--text-xs);
}

/* Main */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-main-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.chat-main-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  padding: var(--space-6);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.chat-error {
  position: absolute;
  bottom: var(--space-4);
  left: var(--space-4);
  right: var(--space-4);
  z-index: 10;
}

.msg-enter-active { transition: all var(--duration-normal) var(--ease-out); }
.msg-leave-active { transition: all var(--duration-fast) var(--ease-in); }
.msg-enter-from,
.msg-leave-to { opacity: 0; transform: translateY(8px); }
</style>
