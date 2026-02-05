<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'
import ThemeToggle from '../components/ThemeToggle.vue'

const router = useRouter()
const { checkAuth, logout } = useAuth()
const { theme } = useTheme()

onMounted(async () => {
  const isValid = await checkAuth()
  if (!isValid) {
    router.push('/auth')
  }
})

const handleLogout = async () => {
  await logout()
  router.push('/auth')
}

const navItems = [
  { to: '/menu/user', label: 'USER' },
  { to: '/menu/friend', label: 'FRIEND' },
  { to: '/menu/chat', label: 'CHAT' },
  { to: '/menu/dev', label: 'DEV' },
]
</script>

<template>
  <div class="menu-layout" :data-theme="theme">
    <header class="menu-header">
      <h1 class="menu-title">ESPORTENDENCE</h1>
      <div class="menu-header-actions">
        <ThemeToggle />
        <button @click="handleLogout" class="menu-quit-btn">QUIT</button>
      </div>
    </header>

    <nav class="menu-nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="menu-nav-btn"
        active-class="menu-nav-btn-active"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <main class="menu-content">
      <RouterView v-slot="{ Component }">
        <Transition name="card-slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.menu-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-8);
  border-bottom: 1px solid var(--border-subtle);
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

.menu-quit-btn {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.menu-quit-btn:hover {
  color: var(--color-error);
  border-color: var(--color-error);
}

.menu-nav {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-8);
}

.menu-nav-btn {
  position: relative;
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  text-decoration: none;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.menu-nav-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-default);
}

.menu-nav-btn-active {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-glow-sm);
}

.menu-nav-btn-active::before {
  content: var(--selection-indicator);
  position: absolute;
  left: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-xs);
  color: var(--accent-primary);
}

.menu-content {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 var(--space-8) var(--space-8);
}

/* Card slide transition */
.card-slide-enter-active {
  transition: all var(--duration-normal) var(--ease-out);
}

.card-slide-leave-active {
  transition: all var(--duration-fast) var(--ease-in);
}

.card-slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.card-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
