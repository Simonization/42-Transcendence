<script setup lang="ts">
/**
 * Public Landing Page
 * Accessible without authentication - shows esports links and tournaments
 */

import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'
import ThemeToggle from '../components/ThemeToggle.vue'
import EsportsLinksCard from '../components/landing/EsportsLinksCard.vue'
import TournamentsCard from '../components/landing/TournamentsCard.vue'

const { theme } = useTheme()

const hasToken = computed(() => !!localStorage.getItem('accessToken'))
</script>

<template>
  <div class="landing" :data-theme="theme">
    <header class="landing-header">
      <div class="landing-header-left">
        <h1 class="landing-title">ESPORTENDENCE</h1>
        <span class="hud-serial">SYS::PUBLIC</span>
      </div>
      <div class="landing-header-actions">
        <ThemeToggle />
        <RouterLink
          v-if="hasToken"
          to="/menu"
          class="landing-action-btn clip-btn"
        >
          GO TO MENU
        </RouterLink>
        <RouterLink
          v-else
          to="/auth"
          class="landing-action-btn clip-btn"
        >
          SIGN IN
        </RouterLink>
      </div>
    </header>

    <main class="landing-main">
      <div class="landing-grid">
        <EsportsLinksCard />
        <TournamentsCard />
      </div>
    </main>

    <footer class="landing-footer">
      <span class="hud-serial">ESP-2026 // TOURNAMENT PLATFORM v3.0</span>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.landing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-8);
  border-bottom: var(--hud-border) solid var(--border-subtle);
  position: relative;
}

.landing-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 120px;
  height: var(--hud-border-thick);
  background: var(--accent-primary);
  opacity: 0.5;
}

.landing-header-left {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
}

.landing-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  margin: 0;
  color: var(--text-primary);
}

.landing-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.landing-action-btn {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  text-decoration: none;
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  transition: all var(--duration-fast) var(--ease-default);
}

.landing-action-btn:hover {
  background: var(--bg-selected);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.landing-action-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.landing-main {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: var(--space-8);
}

.landing-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  width: 100%;
  max-width: var(--container-max);
}

@media (min-width: 768px) {
  .landing-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.landing-footer {
  padding: var(--space-2) var(--space-8);
  border-top: var(--hud-border) solid var(--border-subtle);
  text-align: right;
}

.hud-serial {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}
</style>
