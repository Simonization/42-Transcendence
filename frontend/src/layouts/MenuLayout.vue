<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import ThemeToggle from '../components/ThemeToggle.vue'
import SearchModal from '../components/common/SearchModal.vue'
import { useChat } from '@/composables/useChat'
import { useSearch } from '@/composables/useSearch'
import { friendsApi } from '../api/friends'
import type { Friend, ChatRoom } from '../types'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { logout } = authStore
const themeStore = useThemeStore()
const { theme } = themeStore
const { connectSocket, disconnectSocket, rooms: chatRooms } = useChat()
const { isOpen: searchOpen, openSearch, closeSearch } = useSearch()

const friends = ref<Friend[]>([])

onMounted(async () => {
    connectSocket()
    if (authStore.user?.id) {
      friendsApi.getFriends(authStore.user.id).then(f => { friends.value = f }).catch(() => {})
    }
})

const handleLogout = async () => {
  disconnectSocket()
  await logout()
  router.push('/')
}

const navItems = computed(() => {
  const baseItems = [
    { to: '/', label: t('nav.home'), icon: '⚡︎' },
    { to: '/menu/user', label: t('nav.user'), icon: '👤', badge: null },
    { to: '/menu/friend', label: t('nav.friend'), icon: '👥', badge: null },
    { to: '/menu/chat', label: t('nav.chat'), icon: '💬', badge: null },
    { to: '/menu/tournaments', label: t('nav.tourn'), icon: '🏆' },
    { to: '/menu/history', label: t('nav.history'), icon: '📊' },
    { to: '/menu/brackets', label: t('nav.brackets'), icon: '🏅' },
    { to: '/menu/dev', label: t('nav.dev'), icon: '🛠' },
    { to: '/menu/admin-invite-test', label: 'ADMIN INV', icon: '🧪' },
  ]

  if (authStore.isAdmin) {
    baseItems.push({ to: '/menu/admin', label: t('nav.admin'), icon: '⚙️' })
  }

  return baseItems
})
</script>

<template>
  <div class="menu-layout" :data-theme="theme">
    <!-- Animated background layer -->
    <div class="menu-background">
      <div class="bg-pattern"></div>
      <div class="bg-gradient"></div>
    </div>

    <!-- Glass header -->
    <header class="menu-header glass-header">
      <div class="menu-header-left">
        <RouterLink to="/" class="menu-title-link">
          <h1 class="menu-title">ESPORTENDENCE</h1>
        </RouterLink>
        <span class="hud-serial">SYS::ONLINE</span>
      </div>
      <div class="menu-header-actions">
        <button class="menu-search-btn" @click="openSearch" :title="$t('search.open')">&#9906;</button>
        <ThemeToggle />
        <button @click="handleLogout" class="menu-quit-btn">{{ $t('common.quit') }}</button>
      </div>
    </header>

    <!-- Vertical module selector -->
    <nav class="menu-modules">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="module-btn"
        active-class="module-btn-active"
      >
        <span class="module-icon">{{ item.icon }}</span>
        <span class="module-label">{{ item.label }}</span>
        <span v-if="item.badge" class="module-badge">{{ item.badge }}</span>
      </RouterLink>
    </nav>

    <!-- Content area -->
    <main class="menu-content">
      <RouterView v-slot="{ Component }">
        <Transition name="glass-fade" mode="out-in">
          <component :is="Component" class="glass-content" />
        </Transition>
      </RouterView>
    </main>

    <!-- Glass footer -->
    <div class="menu-hud-footer glass-footer">
      <span class="hud-serial">ESP-2026 // TOURNAMENT PLATFORM v3.0</span>
    </div>

    <!-- Search modal -->
    <SearchModal
      v-if="searchOpen"
      :friends="friends"
      :rooms="chatRooms"
      :current-user-id="authStore.user?.id || 0"
      @close="closeSearch"
      @select-room="closeSearch(); router.push('/menu/chat')"
      @select-tournament="(id) => { closeSearch(); router.push(`/menu/tournaments/${id}`) }"
    />
  </div>
</template>

<style scoped>
.menu-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
}

/* Background layer - fixed, behind everything */
.menu-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.bg-pattern {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23ffffff' fill-opacity='0.03'/%3E%3C/svg%3E");
  background-size: 60px 60px;
  opacity: 0.15;
  animation: pattern-drift 60s linear infinite;
}

@keyframes pattern-drift {
  from { transform: translate(0, 0); }
  to { transform: translate(60px, 60px); }
}

.bg-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 20% 30%,
    var(--accent-primary-glow) 0%,
    transparent 50%
  );
  opacity: 0.2;
  animation: gradient-pulse 8s ease-in-out infinite;
}

@keyframes gradient-pulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.3; }
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-8);
  position: relative;
  z-index: 10;
}

/* HUD accent line under header */
.menu-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 120px;
  height: var(--hud-border-thick);
  background: var(--accent-primary);
  opacity: 0.5;
}

.menu-header-left {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
}

.menu-title-link {
  text-decoration: none;
  color: inherit;
  transition: opacity var(--duration-fast) var(--ease-default);
}

.menu-title-link:hover {
  opacity: 0.7;
}

.menu-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  margin: 0;
  color: var(--text-primary);
}

.menu-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.menu-search-btn {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-base);
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  -webkit-clip-path: polygon(
    var(--chamfer-sm) 0,
    100% 0,
    100% calc(100% - var(--chamfer-sm)),
    calc(100% - var(--chamfer-sm)) 100%,
    0 100%,
    0 var(--chamfer-sm)
  );
  clip-path: polygon(
    var(--chamfer-sm) 0,
    100% 0,
    100% calc(100% - var(--chamfer-sm)),
    calc(100% - var(--chamfer-sm)) 100%,
    0 100%,
    0 var(--chamfer-sm)
  );
}

.menu-search-btn:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

.menu-quit-btn {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  -webkit-clip-path: polygon(
    var(--chamfer-sm) 0,
    100% 0,
    100% calc(100% - var(--chamfer-sm)),
    calc(100% - var(--chamfer-sm)) 100%,
    0 100%,
    0 var(--chamfer-sm)
  );
  clip-path: polygon(
    var(--chamfer-sm) 0,
    100% 0,
    100% calc(100% - var(--chamfer-sm)),
    calc(100% - var(--chamfer-sm)) 100%,
    0 100%,
    0 var(--chamfer-sm)
  );
}

.menu-quit-btn:hover {
  color: var(--color-error);
  border-color: var(--color-error);
  box-shadow: 0 0 10px var(--color-error-bg);
}

/* Vertical module selector on left */
.menu-modules {
  position: fixed;
  left: 0;
  top: var(--space-20);
  width: 100px;
  height: calc(100vh - var(--space-20) - var(--space-12));
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-3);
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--backdrop-blur-medium);
  backdrop-filter: var(--backdrop-blur-medium);
  border-right: 1px solid var(--glass-border);
  z-index: 9;
  overflow-y: auto;
}

.module-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-2);
  color: var(--text-tertiary);
  text-decoration: none;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  transition: all var(--duration-fast) var(--ease-default);
  -webkit-clip-path: polygon(
    var(--chamfer-sm) 0,
    100% 0,
    100% calc(100% - var(--chamfer-sm)),
    calc(100% - var(--chamfer-sm)) 100%,
    0 100%,
    0 var(--chamfer-sm)
  );
  clip-path: polygon(
    var(--chamfer-sm) 0,
    100% 0,
    100% calc(100% - var(--chamfer-sm)),
    calc(100% - var(--chamfer-sm)) 100%,
    0 100%,
    0 var(--chamfer-sm)
  );
  border: 1px solid transparent;
}

.module-icon {
  font-size: var(--text-lg);
}

.module-label {
  text-align: center;
  white-space: nowrap;
  font-size: 9px;
}

.module-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: var(--font-bold);
  background: var(--color-error);
  color: white;
  border-radius: 9px;
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.module-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
  border-color: var(--border-default);
}

.module-btn-active {
  color: var(--accent-primary);
  background: var(--bg-selected);
  border-color: var(--accent-primary);
  box-shadow: var(--glow-subtle);
}

.module-btn-active::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 40%;
  background: var(--accent-primary);
  box-shadow: var(--glow-strong);
}

/* Content area */
.menu-content {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: var(--space-8) var(--space-8) var(--space-8) calc(100px + var(--space-8));
  position: relative;
  z-index: 1;
}

.glass-content {
  width: 100%;
  max-width: 860px;
}

.menu-hud-footer {
  padding: var(--space-2) var(--space-8);
  text-align: right;
  position: relative;
  z-index: 10;
}

/* Mobile responsive - bottom tab bar */
@media (max-width: 768px) {
  .menu-modules {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    flex-direction: row;
    justify-content: space-around;
    padding: var(--space-2);
    border-right: none;
    border-top: 1px solid var(--glass-border);
  }

  .module-btn {
    flex: 1;
    min-width: 0;
  }

  .module-label {
    font-size: 8px;
  }

  .menu-content {
    padding: var(--space-4);
    padding-bottom: calc(80px + var(--space-4));
  }
}
</style>
