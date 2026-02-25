<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useChatStore } from '../../stores/chat'
import ChatRoomList from '../../components/chat/ChatRoomList.vue'
import ChatConversation from '../../components/chat/ChatConversation.vue'
import MessageInput from '../../components/chat/MessageInput.vue'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import UserProfilePopup from '../../components/chat/UserProfilePopup.vue'
import { storeToRefs } from 'pinia'
import { usersApi } from '../../api/users'
import type { User } from '../../types'

const authStore = useAuthStore()
const { user } = authStore
const chatStore = useChatStore()
const {
  activeRoomId,
  activeRoom,
  rooms,
  messages,
  isLoadingRooms,
  isLoadingMessages,
  isSending,
  error,
  wsConnected,
  visibleRooms,
  isActiveRoomBlocked,
  currentRoomTypingUsers,
  blockedUserIds,
} = storeToRefs(chatStore)

const {
  fetchRooms,
  selectRoom,
  sendMessage,
  createRoom,
  deleteMessage,
  setCurrentUser,
  loadBlockedUsers,
  blockUserInChat,
  emitTyping,
} = chatStore

const router = useRouter()
const route = useRoute()

const showNewChat = ref(false)
const showBlockConfirm = ref(false)
const profilePopupUser = ref<{ id: number; username: string } | null>(null)

// Username search for new chat
const newChatQuery = ref('')
const newChatResults = ref<User[]>([])
let newChatSearchTimer: ReturnType<typeof setTimeout> | null = null

const handleNewChatInput = () => {
  if (newChatSearchTimer) clearTimeout(newChatSearchTimer)
  if (!newChatQuery.value.trim()) {
    newChatResults.value = []
    return
  }
  newChatSearchTimer = setTimeout(async () => {
    try {
      newChatResults.value = await usersApi.search(newChatQuery.value, 10)
    } catch {
      newChatResults.value = []
    }
  }, 300)
}

const handleNewChatSelect = async (selectedUser: User) => {
  newChatQuery.value = ''
  newChatResults.value = []
  showNewChat.value = false
  await createRoom([selectedUser.id])
}

const cancelNewChat = () => {
  newChatQuery.value = ''
  newChatResults.value = []
  showNewChat.value = false
}

const activeRoomTitle = computed(() => {
  if (!activeRoom.value) return 'Chat'
  return activeRoom.value.title
    || activeRoom.value.participants.find(p => p.id !== user.value?.id)?.username
    || 'Chat'
})

const dmPartnerId = computed(() => {
  if (!activeRoom.value || activeRoom.value.type !== 0) return null
  return activeRoom.value.participants.find(p => p.id !== user.value?.id)?.id ?? null
})

const blockedIdsArray = computed(() => [...blockedUserIds.value])

onMounted(async () => {
  if (user.value?.id) {
    setCurrentUser(user.value.id)
    loadBlockedUsers(user.value.id)
  }
  await fetchRooms()

  // openRoom: select an existing room (from search)
  const openRoomId = route.query.openRoom
  if (openRoomId) {
    const roomId = parseInt(String(openRoomId), 10)
    if (!isNaN(roomId) && roomId > 0) {
      selectRoom(roomId)
    }
    router.replace({ path: '/menu/chat' })
  }

  // openWith: auto-open or create DM (from friends list or user search)
  const openWithId = route.query.openWith
  if (openWithId) {
    const targetId = parseInt(String(openWithId), 10)
    if (!isNaN(targetId) && targetId > 0) {
      // Check if a DM with this user already exists
      const existing = rooms.value.find(r =>
        r.type === 0 && r.participants.some(p => p.id === targetId)
      )
      if (existing) {
        selectRoom(existing.id)
      } else {
        await createRoom([targetId])
      }
    }
    // Remove query param without adding to history
    router.replace({ path: '/menu/chat' })
  }
})


const handleSend = (content: string) => {
  sendMessage(content)
}

const handleBlockConfirm = async () => {
  if (dmPartnerId.value) {
    await blockUserInChat(dmPartnerId.value)
  }
  showBlockConfirm.value = false
}

const handleViewProfile = (userId: number) => {
  // Find username from active room participants or message senders
  const participant = activeRoom.value?.participants.find(p => p.id === userId)
  const msgSender = messages.value.find(m => m.senderId === userId)?.sender
  const username = participant?.username || msgSender?.username || `User #${userId}`
  profilePopupUser.value = { id: userId, username }
}

const handleProfileSendMessage = () => {
  // Already in the conversation — just close the popup
  profilePopupUser.value = null
}

const handleProfileViewFriends = () => {
  profilePopupUser.value = null
  router.push('/menu/friend')
}

const handleGameInvite = () => {
  const partnerName = activeRoom.value?.participants.find(p => p.id !== user.value?.id)?.username || 'opponent'
  sendMessage(`🎮 Game invitation! I'm challenging ${partnerName} to a match. Ready to play?`)
}

// Auto-dismiss transient errors after 5 seconds
let errorTimer: ReturnType<typeof setTimeout> | null = null
watch(error, (val) => {
  if (errorTimer) clearTimeout(errorTimer)
  if (val) {
    errorTimer = setTimeout(() => {
      error.value = ''
    }, 5000)
  }
})

onUnmounted(() => {
  if (errorTimer) clearTimeout(errorTimer)
})
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

      <!-- New chat: username search -->
      <div v-if="showNewChat" class="new-chat-form">
        <div class="new-chat-search">
          <input
            v-model="newChatQuery"
            type="text"
            class="input new-chat-input"
            :placeholder="$t('chat.searchUser')"
            autocomplete="off"
            @input="handleNewChatInput"
          />
          <button class="btn btn-ghost btn-sm" @click="cancelNewChat">&times;</button>
        </div>
        <ul v-if="newChatResults.length" class="new-chat-results">
          <li
            v-for="u in newChatResults"
            :key="u.id"
            class="new-chat-result"
            @click="handleNewChatSelect(u)"
          >
            <span class="result-username">{{ u.username }}</span>
            <span v-if="u.profile?.displayName" class="result-display">{{ u.profile.displayName }}</span>
          </li>
        </ul>
      </div>

      <div v-if="isLoadingRooms" class="loading-text">{{ $t('common.loading') }}</div>
      <div v-else-if="error && visibleRooms.length === 0" class="sidebar-error">
        <p class="sidebar-error-text">{{ $t('chat.loadError') }}</p>
        <button class="btn btn-ghost btn-sm" @click="fetchRooms()">{{ $t('common.retry') }}</button>
      </div>
      <div v-else-if="visibleRooms.length === 0" class="sidebar-empty">
        <p class="sidebar-empty-text">{{ $t('chat.noConversations') }}</p>
        <p class="sidebar-empty-hint">{{ $t('chat.noConversationsHint') }}</p>
      </div>
      <ChatRoomList
        v-else
        :rooms="visibleRooms"
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
          <button
            v-if="dmPartnerId && !isActiveRoomBlocked"
            class="btn btn-ghost btn-sm invite-btn"
            @click="handleGameInvite"
            :title="$t('chat.inviteToGame')"
          >
            &#127918;
          </button>
          <button
            v-if="dmPartnerId"
            class="btn btn-ghost btn-sm profile-btn"
            @click="handleViewProfile(dmPartnerId)"
            :title="$t('chat.viewProfile')"
          >
            &#128100;
          </button>
          <button
            v-if="dmPartnerId && !isActiveRoomBlocked"
            class="btn btn-ghost btn-sm block-btn"
            @click="showBlockConfirm = true"
            :title="$t('chat.blockUser')"
          >
            &#128683;
          </button>
        </div>

        <!-- Blocked state notice -->
        <div v-if="isActiveRoomBlocked" class="blocked-notice">
          <p>{{ $t('chat.blockedConversation') }}</p>
        </div>

        <ChatConversation
          v-if="!isActiveRoomBlocked"
          :messages="messages"
          :current-user-id="user?.id || 0"
          :is-loading="isLoadingMessages"
          :typing-users="currentRoomTypingUsers"
          :blocked-user-ids="blockedIdsArray"
          @delete-message="deleteMessage"
          @view-profile="handleViewProfile"
        />

        <MessageInput
          v-if="!isActiveRoomBlocked"
          :disabled="isSending"
          @send="handleSend"
          @typing="emitTyping"
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

    <!-- User profile popup -->
    <UserProfilePopup
      v-if="profilePopupUser"
      :user-id="profilePopupUser.id"
      :username="profilePopupUser.username"
      @close="profilePopupUser = null"
      @send-message="handleProfileSendMessage"
      @view-friends="handleProfileViewFriends"
    />

    <!-- Block confirmation dialog -->
    <ConfirmDialog
      v-if="showBlockConfirm"
      :title="$t('chat.blockUser')"
      :message="$t('chat.cannotMessageBlocked')"
      :danger="true"
      @confirm="handleBlockConfirm"
      @cancel="showBlockConfirm = false"
    />
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
  -webkit-clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
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
  flex-direction: column;
  border-bottom: 1px solid var(--border-subtle);
}

.new-chat-search {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
}

.new-chat-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2);
  font-size: var(--text-xs);
}

.new-chat-results {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 160px;
  overflow-y: auto;
  border-top: 1px solid var(--border-subtle);
}

.new-chat-result {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-default);
}

.new-chat-result:hover {
  background: var(--bg-hover);
}

.result-username {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.result-display {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
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

.invite-btn {
  margin-left: auto;
  font-size: var(--text-sm);
}

.profile-btn {
  font-size: var(--text-sm);
}

.block-btn {
  font-size: var(--text-sm);
}

.blocked-notice {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  color: var(--text-tertiary);
  font-size: var(--text-sm);
  font-style: italic;
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

.sidebar-error,
.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  text-align: center;
}

.sidebar-error-text {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-error);
}

.sidebar-empty-text {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.sidebar-empty-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
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

@media (max-width: 768px) {
  .chat-layout {
    flex-direction: column;
    max-height: none;
  }

  .chat-sidebar {
    width: 100%;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
  }

  .chat-main {
    min-height: 300px;
  }

  .chat-main-header {
    padding: var(--space-2) var(--space-3);
    gap: var(--space-2);
  }
}
</style>
