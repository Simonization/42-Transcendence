<script setup lang="ts">
/**
 * 404 — catch-all for any path that matches no route.
 * Standalone page (no menu chrome): reachable whether the visitor is logged in or not.
 */

import { useRouter } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'

const router = useRouter()
</script>

<template>
  <div class="not-found hud-boot">
    <div class="not-found-background">
      <div class="bg-pattern"></div>
    </div>

    <header class="not-found-header glass-header">
      <div class="not-found-header-left">
        <h1 class="not-found-title">ESPORTENDENCE</h1>
        <span class="hud-serial">SYS::404</span>
      </div>
      <div class="not-found-header-actions">
        <ThemeToggle />
      </div>
    </header>

    <main class="not-found-main">
      <div class="not-found-panel glass-panel">
        <div class="reg-marks" aria-hidden="true"></div>
        <span class="not-found-code num">{{ $t('notFound.code') }}</span>
        <span class="not-found-heading">{{ $t('notFound.heading') }}</span>
        <p class="not-found-message">{{ $t('notFound.message') }}</p>
        <button class="not-found-back" @click="router.push('/')">
          {{ $t('notFound.backHome') }}
        </button>
      </div>
    </main>

    <footer class="not-found-footer glass-footer">
      <span class="hud-serial">ESP-2026 // TOURNAMENT PLATFORM v3.0</span>
    </footer>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
}

.not-found-background {
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
}

.not-found-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-8);
  position: relative;
  z-index: 10;
}

.not-found-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 120px;
  height: var(--hud-border-thick);
  background: var(--color-live, var(--accent-primary));
  opacity: 0.5;
}

.not-found-header-left {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
}

.not-found-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  margin: 0;
  color: var(--text-primary);
}

.not-found-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.not-found-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  position: relative;
  z-index: 1;
}

.not-found-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
  padding: var(--space-12) var(--space-10);
  background: var(--glass-bg-elevated);
  border: var(--hud-border) solid var(--glass-border);
  max-width: 480px;
}

.reg-marks::before,
.reg-marks::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1px solid var(--border-default);
}

.reg-marks::before {
  top: -1px;
  left: -1px;
  border-right: none;
  border-bottom: none;
}

.reg-marks::after {
  bottom: -1px;
  right: -1px;
  border-left: none;
  border-top: none;
}

.not-found-code {
  font-family: var(--font-mono);
  font-size: var(--t-display, 88px);
  font-weight: var(--font-bold);
  line-height: 0.92;
  letter-spacing: -0.03em;
  color: var(--accent-primary);
  font-variant-numeric: tabular-nums;
}

.not-found-heading {
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
}

.not-found-message {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.not-found-back {
  margin-top: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--accent-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.not-found-back:hover {
  background: var(--bg-selected);
}

.not-found-back:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.not-found-footer {
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

@media (max-width: 768px) {
  .not-found-header {
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
  }

  .not-found-panel {
    padding: var(--space-8) var(--space-6);
  }

  .not-found-code {
    font-size: 56px;
  }
}
</style>
