<script setup lang="ts">
/**
 * Tournament Filters - Sidebar Filter Controls
 */

import { computed, ref } from 'vue'

interface Filters {
  games: string[]
  statuses: string[]
}

const props = withDefaults(
  defineProps<{
    games?: string[]
    statuses?: string[]
    isOpen?: boolean
  }>(),
  {
    games: () => [],
    statuses: () => [],
    isOpen: true,
  }
)

const emit = defineEmits<{
  update: [filters: Filters]
  close: []
}>()

const localFilters = ref<Filters>({
  games: props.games,
  statuses: props.statuses,
})

const gameOptions = [
  'League of Legends',
  'Counter-Strike 2',
  'Chess',
  'Dota 2',
  'Valorant',
  'StarCraft II',
  'Overwatch 2',
  'Rocket League',
  'Fortnite',
  'Street Fighter VI',
]

const statusOptions = [
  { value: 'open', label: 'Registration Open' },
  { value: 'live', label: 'Live' },
  { value: 'finished', label: 'Finished' },
]

const toggleGame = (game: string) => {
  const idx = localFilters.value.games.indexOf(game)
  if (idx > -1) {
    localFilters.value.games.splice(idx, 1)
  } else {
    localFilters.value.games.push(game)
  }
  emitUpdate()
}

const toggleStatus = (status: string) => {
  const idx = localFilters.value.statuses.indexOf(status)
  if (idx > -1) {
    localFilters.value.statuses.splice(idx, 1)
  } else {
    localFilters.value.statuses.push(status)
  }
  emitUpdate()
}

const resetFilters = () => {
  localFilters.value = {
    games: [],
    statuses: [],
  }
  emitUpdate()
}

const emitUpdate = () => {
  emit('update', { ...localFilters.value })
}

const hasActiveFilters = computed(
  () => localFilters.value.games.length > 0 || localFilters.value.statuses.length > 0
)
</script>

<template>
  <aside class="tournament-filters" :class="{ 'tournament-filters--open': isOpen }">
    <!-- Header -->
    <div class="filters-header">
      <h3 class="filters-title">FILTERS</h3>
      <button class="filters-close-btn" @click="emit('close')" aria-label="Close filters">
        ✕
      </button>
    </div>

    <!-- Game Filter -->
    <div class="filter-group">
      <h4 class="filter-group-title">GAME</h4>
      <div class="filter-options">
        <label v-for="game in gameOptions" :key="game" class="filter-checkbox">
          <input
            type="checkbox"
            :checked="localFilters.games.includes(game)"
            @change="toggleGame(game)"
          />
          <span class="checkbox-label">{{ game }}</span>
        </label>
      </div>
    </div>

    <!-- Status Filter -->
    <div class="filter-group">
      <h4 class="filter-group-title">STATUS</h4>
      <div class="filter-options">
        <label v-for="option in statusOptions" :key="option.value" class="filter-checkbox">
          <input
            type="checkbox"
            :checked="localFilters.statuses.includes(option.value)"
            @change="toggleStatus(option.value)"
          />
          <span class="checkbox-label">{{ option.label }}</span>
        </label>
      </div>
    </div>

    <!-- Reset Button -->
    <button
      v-if="hasActiveFilters"
      class="filters-reset-btn"
      @click="resetFilters"
    >
      RESET FILTERS
    </button>
  </aside>
</template>

<style scoped>
.tournament-filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-4);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-3);
  border-bottom: var(--hud-border) solid var(--glass-border);
}

.filters-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.filters-close-btn {
  display: none;
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: var(--text-lg);
  background: transparent;
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.filters-close-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.filter-group-title {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
  text-transform: uppercase;
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;
}

.filter-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--accent-primary);
}

.checkbox-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  transition: color var(--duration-fast) var(--ease-default);
}

.filter-checkbox input:checked + .checkbox-label {
  color: var(--accent-primary);
  font-weight: var(--font-semibold);
}

.filter-checkbox:hover .checkbox-label {
  color: var(--text-primary);
}

.filters-reset-btn {
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
  margin-top: var(--space-2);
}

.filters-reset-btn:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

.filters-reset-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Mobile */
@media (max-width: 768px) {
  .tournament-filters {
    position: fixed;
    top: 0;
    left: -280px;
    width: 280px;
    height: 100vh;
    border-radius: 0;
    z-index: var(--z-modal);
    transition: left var(--duration-normal) var(--ease-default);
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  }

  .tournament-filters--open {
    left: 0;
  }

  .filters-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .tournament-filters {
    width: 100%;
    left: -100%;
  }
}
</style>
