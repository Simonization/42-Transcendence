<script setup lang="ts">
/**
 * Browse Tournaments Link Card
 * Glass card CTA linking to full tournament browse page
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAccessToken } from '../../api'
import { TournamentStatus } from '../../types'
import type { BackendTournament } from '../../types'
import HudIcon from '../hud/HudIcon.vue'

const props = defineProps<{
  tournaments: BackendTournament[]
}>()

const router = useRouter()

const hasToken = computed(() => !!getAccessToken())

const totalTournaments = computed(() => props.tournaments.length)

const upcomingTournaments = computed(() =>
  props.tournaments.filter(
    t =>
      t.status === TournamentStatus.REGISTRATION_OPEN ||
      t.status === TournamentStatus.ONGOING,
  ),
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
      <div class="browse-icon"><HudIcon name="tournament" :size="26" /></div>
      <h2 class="browse-title">{{ $t('landing.browseAll') }}</h2>
      <p class="browse-subtitle">{{ $t('landing.browseSubtitle') }}</p>

      <div class="browse-stats">
        <div class="browse-stat">
          <span class="browse-stat-value">{{ totalTournaments }}</span>
          <span class="browse-stat-label">{{ $t('landing.total') }}</span>
        </div>
        <div class="browse-stat-divider"></div>
        <div class="browse-stat">
          <span class="browse-stat-value">{{ upcomingTournaments.length }}</span>
          <span class="browse-stat-label">{{ $t('landing.active') }}</span>
        </div>
      </div>

      <div class="browse-cta">
        <span class="browse-cta-text">{{ $t('landing.viewAllTournaments') }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.browse-card {
  cursor: pointer;
  padding: var(--space-8);
  background: var(--bg-secondary);
  border: var(--hud-border) solid var(--border-default);
  transition: border-color var(--duration-fast) var(--ease-default);
  display: flex;
  align-items: center;
  justify-content: center;
}

.browse-card:hover {
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
  color: var(--accent-primary);
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
}

.browse-cta-text {
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
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

  .browse-title {
    font-size: var(--text-base);
  }

  .browse-subtitle {
    font-size: var(--text-xs);
  }
}
</style>
