<script setup lang="ts">
/**
 * Featured Tournaments Section - Landing Page
 * Horizontal carousel of featured tournaments with snap-to-grid behavior
 */

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getFeaturedTournaments } from '../../data/mockTournaments'

const router = useRouter()
const scrollContainer = ref<HTMLElement | null>(null)

const featuredTournaments = computed(() => getFeaturedTournaments(3))

const handleViewDetails = (tournamentId: string) => {
  router.push(`/menu/tournaments/${tournamentId}`)
}

const scroll = (direction: 'left' | 'right') => {
  if (!scrollContainer.value) return

  const scrollAmount = 300
  const scrollTo =
    scrollContainer.value.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount)

  scrollContainer.value.scrollTo({
    left: scrollTo,
    behavior: 'smooth',
  })
}

const getStatusBadgeClass = (status: string) => {
  return {
    'status-open': status === 'open',
    'status-live': status === 'live',
    'status-finished': status === 'finished',
  }
}

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
</script>

<template>
  <section class="featured-section">
    <header class="featured-header">
      <div class="featured-header-content">
        <h2 class="featured-title">FEATURED TOURNAMENTS</h2>
        <span class="featured-subtitle">{{ featuredTournaments.length }} TOURNAMENTS</span>
      </div>
      <div class="featured-nav-buttons">
        <button
          class="featured-nav-btn"
          aria-label="Show previous featured tournament"
          @click="scroll('left')"
        >
          ←
        </button>
        <button
          class="featured-nav-btn"
          aria-label="Show next featured tournament"
          @click="scroll('right')"
        >
          →
        </button>
      </div>
    </header>

    <div class="featured-carousel" role="region" aria-roledescription="carousel" aria-label="Featured tournaments">
      <div ref="scrollContainer" class="featured-scroll-container" role="group" aria-live="polite" aria-atomic="false">
        <div
          v-for="(tournament, index) in featuredTournaments"
          :key="tournament.id"
          class="featured-card glass-panel"
          role="group"
          :aria-roledescription="`Slide ${index + 1} of ${featuredTournaments.length}`"
          :aria-label="`${tournament.name} tournament card`"
        >
          <!-- Card Header -->
          <div class="featured-card-header">
            <span class="featured-game-icon" aria-hidden="true">{{ tournament.organizer.avatar }}</span>
            <div class="featured-game-info">
              <h3 class="featured-game-name">{{ tournament.game }}</h3>
              <span class="featured-status" :class="getStatusBadgeClass(tournament.status)">
                {{ getStatusLabel(tournament.status) }}
              </span>
            </div>
          </div>

          <!-- Card Title -->
          <h4 class="featured-tournament-name">{{ tournament.name }}</h4>

          <!-- Card Stats -->
          <div class="featured-stats">
            <div class="featured-stat">
              <span class="featured-stat-label">Date</span>
              <span class="featured-stat-value">{{ tournament.date }}</span>
            </div>
            <div class="featured-stat">
              <span class="featured-stat-label">Players</span>
              <span class="featured-stat-value">
                {{ tournament.currentParticipants }}/{{ tournament.maxParticipants }}
              </span>
            </div>
          </div>

          <!-- Prize -->
          <div class="featured-prize">
            <span class="featured-prize-label">Prize Pool:</span>
            <span class="featured-prize-value">{{ tournament.prize }}</span>
          </div>

          <!-- CTA -->
          <button
            class="featured-cta"
            :aria-label="`View details for ${tournament.name}`"
            @click="handleViewDetails(tournament.id)"
          >
            VIEW DETAILS
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.featured-section {
  margin-bottom: var(--space-12);
}

.featured-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  padding: 0 var(--space-4);
}

.featured-header-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.featured-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  margin: 0;
  color: var(--text-primary);
}

.featured-subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.featured-nav-buttons {
  display: flex;
  gap: var(--space-2);
}

.featured-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.featured-nav-btn:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

.featured-nav-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.featured-carousel {
  overflow: hidden;
  padding: 0 var(--space-4);
}

.featured-scroll-container {
  display: flex;
  gap: var(--space-6);
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  padding-bottom: var(--space-4);

  /* Hide scrollbar */
  scrollbar-width: none;
}

.featured-scroll-container::-webkit-scrollbar {
  display: none;
}

.featured-card {
  flex: 0 0 calc(50% - var(--space-3));
  scroll-snap-align: start;
  scroll-snap-stop: always;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all var(--duration-normal) var(--ease-default);
}

.featured-card:hover {
  box-shadow:
    0 0 20px var(--accent-primary-subtle),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-4px);
}

.featured-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

.featured-game-icon {
  font-size: var(--text-2xl);
}

.featured-game-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.featured-game-name {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  color: var(--text-primary);
}

.featured-status {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  padding: var(--space-1) var(--space-2);
  width: fit-content;
  border-radius: 2px;
}

.status-open {
  background: var(--color-success-dark);
  color: white;
}

.status-live {
  background: var(--color-warning-dark);
  color: white;
  animation: pulse-badge 2s ease-in-out infinite;
}

.status-finished {
  background: var(--text-secondary);
  color: white;
}

@keyframes pulse-badge {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.featured-tournament-name {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wide);
  color: var(--accent-primary);
  line-height: var(--leading-normal);
}

.featured-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.featured-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
}

.featured-stat-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.featured-stat-value {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  letter-spacing: var(--tracking-wide);
}

.featured-prize {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-selected);
  border: var(--hud-border) solid var(--accent-primary-subtle);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.featured-prize-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  letter-spacing: var(--tracking-wide);
  font-weight: var(--font-semibold);
}

.featured-prize-value {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

.featured-cta {
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-primary);
  background: transparent;
  border: var(--hud-border) solid var(--accent-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.featured-cta:hover {
  background: var(--bg-selected);
  color: var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-primary-subtle);
}

.featured-cta:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Responsive - tablets and down */
@media (max-width: 768px) {
  .featured-nav-buttons {
    display: none;
  }

  .featured-card {
    flex: 0 0 calc(85% - var(--space-3));
  }

  .featured-card:last-child {
    margin-right: var(--space-4);
  }
}

/* Responsive - mobile */
@media (max-width: 480px) {
  .featured-header {
    padding: 0 var(--space-2);
  }

  .featured-carousel {
    padding: 0 var(--space-2);
  }

  .featured-card {
    flex: 0 0 calc(100% - var(--space-3));
    padding: var(--space-4);
  }

  .featured-tournament-name {
    font-size: var(--text-sm);
  }

  .featured-prize {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
