<script setup lang="ts">
/**
 * Hero Section - Landing Page
 * Welcome banner with key CTAs and stats ticker
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAccessToken } from '../../api'
import { mockTournaments } from '../../data/mockTournaments'
import ShaderButton from '../hud/ShaderButton.vue'

const router = useRouter()

const hasToken = computed(() => !!getAccessToken())

const activeTournaments = computed(() =>
  mockTournaments.filter(t => t.status === 'open' || t.status === 'live')
)

const totalParticipants = computed(() =>
  mockTournaments.reduce((sum, t) => sum + t.currentParticipants, 0)
)

const handleBrowseTournaments = () => {
  if (hasToken.value) {
    router.push('/menu/tournaments')
  } else {
    router.push('/auth')
  }
}

const handleCreateAccount = () => {
  router.push('/auth')
}
</script>

<template>
  <section class="hero-section glass-panel">
    <div class="hero-background">
      <div class="hero-gradient-top"></div>
      <div class="hero-gradient-bottom"></div>
    </div>

    <div class="hero-content">
      <div class="hero-main">
        <h1 class="hero-title">ESPORTENDENCE</h1>
        <p class="hero-subtitle">{{ $t('landing.heroSubtitle') }}</p>
        <p class="hero-tagline">{{ $t('landing.heroTagline') }}</p>
      </div>

      <div class="hero-stats">
        <div class="stat-item">
          <span class="stat-value">{{ activeTournaments.length }}</span>
          <span class="stat-label">{{ $t('landing.activeTournaments') }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ totalParticipants }}</span>
          <span class="stat-label">{{ $t('landing.totalPlayers') }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">6</span>
          <span class="stat-label">{{ $t('landing.gameTitles') }}</span>
        </div>
      </div>

      <div class="hero-actions">
        <ShaderButton
          class="hero-btn-primary"
          :shader="true"
          size="lg"
          @click="handleBrowseTournaments"
        >
          {{ $t('landing.browseTournaments') }}
        </ShaderButton>

        <ShaderButton
          v-if="!hasToken"
          class="hero-btn-secondary"
          :shader="false"
          size="lg"
          @click="handleCreateAccount"
        >
          {{ $t('auth.createAccount') }}
        </ShaderButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  padding: var(--space-16) var(--space-8);
  margin-bottom: var(--space-12);
  overflow: hidden;
  background: var(--glass-bg-elevated);
  -webkit-backdrop-filter: var(--backdrop-blur-heavy);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.hero-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.hero-gradient-top {
  position: absolute;
  top: -50%;
  left: 10%;
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    var(--accent-primary-glow) 0%,
    transparent 70%
  );
  opacity: 0.15;
  animation: float 20s ease-in-out infinite;
}

.hero-gradient-bottom {
  position: absolute;
  bottom: -30%;
  right: 10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle,
    var(--accent-secondary-glow) 0%,
    transparent 70%
  );
  opacity: 0.1;
  animation: float 25s ease-in-out infinite 2s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
  text-align: center;
}

.hero-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.hero-title {
  font-size: var(--text-5xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  margin: 0;
  background: linear-gradient(
    135deg,
    var(--accent-primary),
    var(--accent-secondary)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-wide);
  margin: 0;
  color: var(--text-primary);
}

.hero-tagline {
  font-size: var(--text-base);
  margin: 0;
  color: var(--text-secondary);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
  flex-wrap: wrap;
  padding: var(--space-8) 0;
  border-top: var(--hud-border) solid var(--glass-border);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.stat-value {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

.stat-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.stat-divider {
  height: 40px;
  width: 1px;
  background: var(--glass-border);
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-6);
  flex-wrap: wrap;
}

.hero-btn-primary,
.hero-btn-secondary {
  min-width: 200px;
}

/* Responsive - tablets and down */
@media (max-width: 768px) {
  .hero-section {
    padding: var(--space-12) var(--space-6);
    margin-bottom: var(--space-8);
  }

  .hero-title {
    font-size: var(--text-4xl);
  }

  .hero-subtitle {
    font-size: var(--text-lg);
  }

  .hero-stats {
    gap: var(--space-4);
  }

  .stat-value {
    font-size: var(--text-3xl);
  }

  .stat-divider {
    display: none;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-btn-primary,
  .hero-btn-secondary {
    width: 100%;
  }
}

/* Responsive - mobile */
@media (max-width: 480px) {
  .hero-section {
    padding: var(--space-8) var(--space-4);
    margin-bottom: var(--space-6);
  }

  .hero-title {
    font-size: var(--text-3xl);
  }

  .hero-subtitle {
    font-size: var(--text-base);
  }

  .hero-tagline {
    font-size: var(--text-sm);
  }

  .hero-stats {
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4) 0;
  }

  .stat-value {
    font-size: var(--text-2xl);
  }
}
</style>
