<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useFriends } from '../../composables/useFriends'
import AddFriendInput from '../../components/friends/AddFriendInput.vue'
import FriendList from '../../components/friends/FriendList.vue'
import FriendRequests from '../../components/friends/FriendRequests.vue'
import BlockedUsers from '../../components/friends/BlockedUsers.vue'

const { user } = useAuth()
const {
  acceptedFriends,
  pendingFriends,
  blocks,
  isLoading,
  error,
  fetchFriends,
  fetchBlocks,
  addFriend,
  removeFriend,
  blockUser,
  unblockUser,
} = useFriends()

type Tab = 'friends' | 'requests' | 'blocked'
const activeTab = ref<Tab>('friends')
const message = ref('')

const tabs: { key: Tab; label: string }[] = [
  { key: 'friends', label: 'FRIENDS' },
  { key: 'requests', label: 'REQUESTS' },
  { key: 'blocked', label: 'BLOCKED' },
]

onMounted(() => {
  if (user.value) {
    fetchFriends(user.value.id)
    fetchBlocks(user.value.id)
  }
})

const handleAdd = async (friendId: number) => {
  message.value = ''
  const ok = await addFriend(friendId)
  if (ok && user.value) {
    message.value = 'Friend request sent'
    fetchFriends(user.value.id)
  }
}

const handleRemove = async (friendId: number) => {
  await removeFriend(friendId)
}

const handleBlock = async (targetId: number) => {
  await blockUser(targetId)
}

const handleUnblock = async (targetId: number) => {
  await unblockUser(targetId)
}

const handleAccept = async (friendId: number) => {
  // Accept is the same as addFriend on the backend (creates reciprocal)
  const ok = await addFriend(friendId)
  if (ok && user.value) {
    fetchFriends(user.value.id)
  }
}

const handleDecline = async (friendId: number) => {
  await removeFriend(friendId)
}
</script>

<template>
  <div class="card card-page">
    <div class="card-header-section">
      <AddFriendInput @add="handleAdd" />

      <Transition name="msg">
        <p v-if="message" class="alert alert-success msg-inline">{{ message }}</p>
      </Transition>
      <Transition name="msg">
        <p v-if="error" class="alert alert-error msg-inline">{{ error }}</p>
      </Transition>
    </div>

    <!-- Tabs -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.key === 'requests' && pendingFriends.length" class="tab-badge">
          {{ pendingFriends.length }}
        </span>
      </button>
    </div>

    <!-- Content -->
    <div class="tab-content">
      <div v-if="isLoading" class="loading-text">Loading...</div>

      <template v-else>
        <FriendList
          v-if="activeTab === 'friends'"
          :friends="acceptedFriends"
          @remove="handleRemove"
          @block="handleBlock"
        />

        <FriendRequests
          v-if="activeTab === 'requests'"
          :requests="pendingFriends"
          @accept="handleAccept"
          @decline="handleDecline"
        />

        <BlockedUsers
          v-if="activeTab === 'blocked'"
          :blocks="blocks"
          @unblock="handleUnblock"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.card-page {
  width: 100%;
  max-width: 720px;
}

.card-header-section {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
}

.msg-inline {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border-subtle);
}

.tab-btn {
  flex: 1;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}

.tab-badge {
  background: var(--accent-primary);
  color: var(--text-on-accent);
  font-size: 10px;
  font-weight: var(--font-bold);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

.tab-content {
  padding: var(--space-4) var(--space-6);
}

.loading-text {
  padding: var(--space-6);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.msg-enter-active { transition: all var(--duration-normal) var(--ease-out); }
.msg-leave-active { transition: all var(--duration-fast) var(--ease-in); }
.msg-enter-from,
.msg-leave-to { opacity: 0; }
</style>
