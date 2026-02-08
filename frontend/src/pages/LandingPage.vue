<script setup lang="ts">
/**
 * Public Landing Page
 * Accessible without authentication - shows esports links, hero, featured tournaments
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAccessToken } from '../api'
import { useThemeStore } from '../stores/theme'
import ThemeToggle from '../components/ThemeToggle.vue'
import ShaderButton from '../components/hud/ShaderButton.vue'
import HeroSection from '../components/landing/HeroSection.vue'
import FeaturedTournamentsSection from '../components/landing/FeaturedTournamentsSection.vue'
import EsportsLinksCard from '../components/landing/EsportsLinksCard.vue'
import BrowseTournamentsLink from '../components/landing/BrowseTournamentsLink.vue'

const router = useRouter()

const themeStore = useThemeStore()
const { theme } = themeStore

const hasToken = computed(() => !!getAccessToken())
</script>

<template>
  <div class="landing" :data-theme="theme">
    <!-- Animated background layer -->
    <div class="landing-background">
      <div class="bg-pattern"></div>
      <div class="bg-gradient"></div>
    </div>

    <!-- Glass header -->
    <header class="landing-header glass-header">
      <div class="landing-header-left">
        <h1 class="landing-title">ESPORTENDENCE</h1>
        <span class="hud-serial">SYS::PUBLIC</span>
      </div>
      <div class="landing-header-actions">
        <ThemeToggle />
        <ShaderButton
          v-if="hasToken"
          :shader="true"
          size="md"
          @click="router.push('/menu')"
        >
          GO TO MENU
        </ShaderButton>
        <ShaderButton
          v-else
          :shader="true"
          size="md"
          @click="router.push('/auth')"
        >
          SIGN IN
        </ShaderButton>
      </div>
    </header>

    <main class="landing-main">
      <!-- Hero Section -->
      <HeroSection />

      <!-- Featured Tournaments Carousel -->
      <FeaturedTournamentsSection />

      <!-- Browse Grid -->
      <div class="landing-grid">
        <EsportsLinksCard class="glass-card" />
        <BrowseTournamentsLink class="glass-card" />
      </div>
    </main>

    <!-- Glass footer -->
    <footer class="landing-footer glass-footer">
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
  position: relative;
}

/* Background layer - fixed, behind everything */
.landing-background {
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

.landing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-8);
  position: relative;
  z-index: 10;
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
  font-family: var(--font-display);
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
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: var(--space-8);
  position: relative;
  z-index: 1;
  gap: var(--space-8);
}

.landing-main > * {
  width: 100%;
  max-width: var(--container-max);
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

.glass-card {
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.landing-footer {
  padding: var(--space-2) var(--space-8);
  text-align: right;
  position: relative;
  z-index: 10;
}

.hud-serial {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}
</style>
