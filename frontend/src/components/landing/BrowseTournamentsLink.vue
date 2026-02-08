<script setup lang="ts">
/**
 * Browse Tournaments Link Card
 * Glass card CTA linking to full tournament browse page
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAccessToken } from '../../api'
import { mockTournaments } from '../../data/mockTournaments'

const router = useRouter()

const hasToken = computed(() => !!getAccessToken())

const totalTournaments = computed(() => mockTournaments.length)

const upcomingTournaments = computed(() =>
  mockTournaments.filter(t => t.status === 'open' || t.status === 'live')
)

const handleBrowse = () => {
  if (hasToken.value) {
    router.push('/menu/tournaments')
  } else {
    router.push('/auth')
  }
}
</script>

<template>
  <section class="browse-card glass-panel" @click="handleBrowse">
    <div class="browse-content">
      <div class="browse-icon">🏆</div>
      <h2 class="browse-title">BROWSE ALL TOURNAMENTS</h2>
      <p class="browse-subtitle">Discover tournaments and compete</p>

      <div class="browse-stats">
        <div class="browse-stat">
          <span class="browse-stat-value">{{ totalTournaments }}</span>
          <span class="browse-stat-label">Total</span>
        </div>
        <div class="browse-stat-divider"></div>
        <div class="browse-stat">
          <span class="browse-stat-value">{{ upcomingTournaments.length }}</span>
          <span class="browse-stat-label">Active</span>
        </div>
      </div>

      <div class="browse-cta">
        <span class="browse-cta-text">VIEW ALL TOURNAMENTS</span>
        <span class="browse-cta-arrow">→</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.browse-card {
  cursor: pointer;
  padding: var(--space-8);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all var(--duration-normal) var(--ease-default);
  display: flex;
  align-items: center;
  justify-content: center;
}

.browse-card:hover {
  box-shadow:
    0 0 20px var(--accent-primary-subtle),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-4px);
  border-color: var(--accent-primary);
}

.browse-card:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.browse-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}

.browse-icon {
  font-size: var(--text-5xl);
  animation: bounce-icon 3s ease-in-out infinite;
}

@keyframes bounce-icon {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.browse-title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.browse-subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.browse-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  width: 100%;
  border-top: var(--hud-border) solid var(--glass-border);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

.browse-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.browse-stat-value {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

.browse-stat-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.browse-stat-divider {
  height: 30px;
  width: 1px;
  background: var(--glass-border);
}

.browse-cta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  color: var(--accent-primary);
  transition: all var(--duration-fast) var(--ease-default);
}

.browse-card:hover .browse-cta {
  background: var(--bg-selected);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.browse-cta-text {
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
}

.browse-cta-arrow {
  font-size: var(--text-sm);
  transition: transform var(--duration-fast) var(--ease-default);
}

.browse-card:hover .browse-cta-arrow {
  transform: translateX(4px);
}

/* Responsive - mobile */
@media (max-width: 768px) {
  .browse-card {
    padding: var(--space-6);
  }

  .browse-title {
    font-size: var(--text-lg);
  }

  .browse-stat-value {
    font-size: var(--text-2xl);
  }

  .browse-stat-divider {
    display: none;
  }

  .browse-stats {
    flex-direction: column;
    gap: var(--space-2);
  }
}

@media (max-width: 480px) {
  .browse-card {
    padding: var(--space-4);
  }

  .browse-icon {
    font-size: var(--text-4xl);
  }

  .browse-title {
    font-size: var(--text-base);
  }

  .browse-subtitle {
    font-size: var(--text-xs);
  }
}
</style>
