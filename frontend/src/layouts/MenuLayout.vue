<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import ThemeToggle from '../components/ThemeToggle.vue'
import HudIcon from '../components/hud/HudIcon.vue'
import SearchModal from '../components/common/SearchModal.vue'
import NotificationBell from '../components/notifications/NotificationBell.vue'
import { useChat } from '@/composables/useChat'
import { useSearch } from '@/composables/useSearch'
import { useFriendsStore } from '../stores/friends'
import type { ChatRoom } from '../types'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { logout } = authStore
const { connectSocket, disconnectSocket, rooms: chatRooms, unreadCount, wsConnected, fetchRooms, onFriendActivity } = useChat()
const { isOpen: searchOpen, openSearch, closeSearch } = useSearch()
const friendsStore = useFriendsStore()

/*
 * One source for the roster. This used to keep a local `friends` ref fetched straight from the
 * API *alongside* the store, so the same list was requested twice and the two could disagree;
 * the store's copy was also never fetched on mount, only when a friend event happened to fire.
 */
const friends = computed(() => friendsStore.acceptedFriends)
const friendCount = computed(() => friends.value.length)

const loadFriends = () => {
  if (!authStore.user?.id) return
  friendsStore.fetchFriends().catch(() => {})
  friendsStore.fetchBlocks().catch(() => {})
}

onMounted(async () => {
  connectSocket()
  await fetchRooms().catch(() => {})
  onFriendActivity(loadFriends)
  loadFriends()
})

const handleLogout = async () => {
  disconnectSocket()
  await logout()
  router.push('/')
}

interface NavItem {
  to: string
  label: string
  icon: string
  badge?: string | number | null
}

const navItems = computed(() => {

  const baseItems: NavItem[] = [
    { to: '/', label: t('nav.home'), icon: 'home' },
    { to: '/menu/user', label: t('nav.user'), icon: 'user', badge: null },
    { to: '/menu/friend', label: t('nav.friend'), icon: 'friend', badge: null },
    { to: '/menu/chat', label: t('nav.chat'), icon: 'chat', badge: null },
    { to: '/menu/tournaments', label: t('nav.tourn'), icon: 'tournament' },
    { to: '/menu/history', label: t('nav.history'), icon: 'history' },
    { to: '/menu/brackets', label: t('nav.brackets'), icon: 'brackets' },
    { to: '/menu/organizations', label: t('nav.orgs'), icon: 'orgs' },
  ]

  if (authStore.isAdmin) {
    baseItems.push({ to: '/menu/admin', label: t('nav.admin'), icon: 'admin' })
  }

  return baseItems
})
</script>

<template>
  <div class="menu-layout hud-boot">
    <!-- Animated background layer -->
    <div class="menu-background">
      <div class="bg-pattern"></div>
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
        <button class="menu-search-btn" @click="openSearch" :title="$t('search.open')" :aria-label="$t('search.open')">
          <HudIcon name="search" :size="15" />
        </button>
        <NotificationBell />
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
        <HudIcon :name="item.icon" class="module-icon" />
        <span class="module-label">{{ item.label }}</span>
        <span v-if="item.badge" class="module-badge">{{ item.badge }}</span>
      </RouterLink>

      <!--
        Corner-anchored status cluster. The rail is taller than nine items need, and the answer
        to dead space is information, not thinner padding. Everything here is live state the
        layout already holds.
      -->
      <div class="rail-cluster">
        <div class="tick-rule"></div>
        <div class="rail-stat">
          <span class="rail-stat-label">{{ $t('hud.link') }}</span>
          <span class="rail-stat-value num" :class="{ 'rail-stat-on': wsConnected }">
            {{ wsConnected ? $t('hud.linkUp') : $t('hud.linkDown') }}
          </span>
        </div>
        <div class="rail-stat">
          <span class="rail-stat-label">{{ $t('hud.msg') }}</span>
          <span class="rail-stat-value num">{{ String(unreadCount).padStart(2, '0') }}</span>
        </div>
        <div class="rail-stat">
          <span class="rail-stat-label">{{ $t('hud.crew') }}</span>
          <span class="rail-stat-value num">{{ String(friendCount).padStart(2, '0') }}</span>
        </div>
        <div class="reg-marks"></div>
      </div>
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
      @select-room="(id) => { closeSearch(); router.push({ path: '/menu/chat', query: { openRoom: String(id) } }) }"
      @select-tournament="(id) => { closeSearch(); router.push(`/menu/tournaments/${id}`) }"
      @select-user="(id) => { closeSearch(); router.push({ path: '/menu/chat', query: { openWith: String(id) } }) }"
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

/*
 * A hairline survey grid rather than the old diamond tile: that tile was a data-URI with a
 * hardcoded white fill, so it was invisible against Stellar's light ground and only ever
 * showed up in Dragon. Gradients take custom properties, so this one follows the theme.
 */
.bg-pattern {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, var(--border-subtle) 1px, transparent 1px),
    linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px);
  background-size: 80px 80px;
  opacity: 0.4;
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
  min-width: 0;
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
  min-width: 0;
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
  border-right: 1px solid var(--glass-border);
  z-index: 9;
  overflow-y: auto;
}

.rail-cluster {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-top: var(--space-3);
}

.rail-stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.rail-stat-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
}

.rail-stat-value {
  font-size: 11px;
  font-weight: var(--font-bold);
  color: var(--text-secondary);
}

.rail-stat-on {
  color: var(--accent-primary);
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
  color: currentColor;
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
  color: var(--bg-primary);
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
  /*
   * Default `stretch` pulled every page card to the full height of the viewport, so a short
   * page (a three-team bracket, an empty roster) rendered 277px of framed emptiness below its
   * last row. Cards size to their content; a page that genuinely wants the height asks for it.
   */
  align-items: flex-start;
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
  /* The header's min-content width is ~700px (unbreakable Orbitron wordmark + four actions),
     so without wrapping and these reductions it alone pushes the document past the viewport. */
  .menu-header {
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
  }

  .menu-title {
    font-size: var(--text-base);
    letter-spacing: var(--tracking-wider);
  }

  .menu-header-left .hud-serial {
    display: none;
  }

  .menu-header-actions {
    gap: var(--space-2);
  }

  /* Up to 9 modules, so a 5-column grid wraps to two rows rather than overflowing sideways.
     The base rule's overflow-y makes overflow-x compute to auto, which is what allowed the
     strip to be swiped horizontally, so both axes are reset here. */
  .menu-modules {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--space-1);
    padding: var(--space-2);
    overflow: visible;
    border-right: none;
    border-top: 1px solid var(--glass-border);
  }

  .module-btn {
    min-width: 0;
    padding: var(--space-2) var(--space-1);
  }

  .module-label {
    font-size: 8px;
    letter-spacing: var(--tracking-wide);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Clears the two-row fixed tab bar for the content and the footer alike. */
  .menu-layout {
    padding-bottom: 132px;
  }

  .menu-content {
    padding: var(--space-4);
  }
}
</style>
