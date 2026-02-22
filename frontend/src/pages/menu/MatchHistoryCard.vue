<script setup lang="ts">
/**
 * Match History Card - Player Match History & Statistics
 * Displays historical matches, win/loss records from the backend
 */

import { ref, computed, onMounted } from 'vue'
import { useMatches } from '../../composables/useMatches'
import { useAuthStore } from '../../stores/auth'
import type { GameType, MatchResult } from '../../types'

type SortBy = 'date' | 'result'

const authStore = useAuthStore()
const { user } = authStore
const { matches, isLoading, error, stats, uniqueGames, fetchMyHistory } = useMatches(user?.id ?? 0)

const currentPage = ref(1)
const sortBy = ref<SortBy>('date')
const filterGame = ref<GameType | 'all'>('all')
const filterResult = ref<MatchResult | 'all'>('all')

const pageSize = 10

onMounted(() => {
  if (user) {
    fetchMyHistory()
  }
})

// Get filtered and sorted matches
const filteredMatches = computed(() => {
  let result = [...matches.value]

  // Filter by game
  if (filterGame.value !== 'all') {
    result = result.filter(m => m.game === filterGame.value)
  }

  // Filter by result
  if (filterResult.value !== 'all') {
    result = result.filter(m => m.result === filterResult.value)
  }

  // Sort
  if (sortBy.value === 'date') {
    result = result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } else if (sortBy.value === 'result') {
    const resultOrder: Record<MatchResult, number> = { win: 0, draw: 1, loss: 2 }
    result = result.sort((a, b) => resultOrder[a.result] - resultOrder[b.result])
  }

  return result
})

// Pagination
const totalPages = computed(() => Math.ceil(filteredMatches.value.length / pageSize))

const paginatedMatches = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredMatches.value.slice(start, end)
})

const getResultClass = (result: MatchResult) => {
  return {
    'result-win': result === 'win',
    'result-loss': result === 'loss',
    'result-draw': result === 'draw',
  }
}

const getResultIcon = (result: MatchResult) => {
  switch (result) {
    case 'win':
      return '✓'
    case 'loss':
      return '✕'
    case 'draw':
      return '='
  }
}

const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="match-history">
    <!-- No user guard -->
    <div v-if="!user" class="loading-state glass-panel">
      <span class="loading-spinner"></span>
      <p class="loading-text">Loading...</p>
    </div>

    <template v-else>
    <!-- Header -->
    <header class="match-header glass-header">
      <h1 class="match-title">MATCH HISTORY</h1>
      <span class="match-count">{{ filteredMatches.length }} MATCHES</span>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state glass-panel">
      <span class="loading-spinner"></span>
      <p class="loading-text">Loading match history...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state glass-panel">
      <p class="error-text">{{ error }}</p>
      <button class="retry-btn" @click="fetchMyHistory()">Retry</button>
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <div class="stats-grid glass-panel">
        <div class="stat-item">
          <span class="stat-label">Win Rate</span>
          <span class="stat-value">{{ stats.winRate }}%</span>
          <span class="stat-secondary">{{ stats.wins }}W - {{ stats.losses }}L - {{ stats.draws }}D</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Matches</span>
          <span class="stat-value">{{ stats.totalMatches }}</span>
          <span class="stat-secondary">{{ stats.wins }}W / {{ stats.losses }}L / {{ stats.draws }}D</span>
        </div>
      </div>

      <!-- Filters & Controls -->
      <div class="filters-bar glass-panel">
        <div class="filter-group">
          <label for="filter-game" class="filter-label">Game</label>
          <select id="filter-game" v-model="filterGame" class="filter-select">
            <option value="all">All Games</option>
            <option v-for="game in uniqueGames" :key="game" :value="game">
              {{ game }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label for="filter-result" class="filter-label">Result</label>
          <select id="filter-result" v-model="filterResult" class="filter-select">
            <option value="all">All Results</option>
            <option value="win">Wins Only</option>
            <option value="loss">Losses Only</option>
            <option value="draw">Draws Only</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="sort-by" class="filter-label">Sort By</label>
          <select id="sort-by" v-model="sortBy" class="filter-select">
            <option value="date">Date (Newest)</option>
            <option value="result">Result</option>
          </select>
        </div>
      </div>

      <!-- Matches Table -->
      <div class="matches-container glass-panel">
        <table class="matches-table">
          <caption class="visually-hidden">Match history results table showing date, opponent, game, and result</caption>
          <thead>
            <tr>
              <th>DATE</th>
              <th>OPPONENT</th>
              <th>GAME</th>
              <th>RESULT</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="match in paginatedMatches" :key="match.id" class="match-row">
              <td class="cell-date">{{ formatDate(match.date) }}</td>
              <td class="cell-opponent">{{ match.opponent }}</td>
              <td class="cell-game">{{ match.game }}</td>
              <td class="cell-result" :class="getResultClass(match.result)">
                <span class="result-icon">{{ getResultIcon(match.result) }}</span>
                {{ match.result }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- No Results -->
        <div v-if="filteredMatches.length === 0" class="no-results">
          <span class="no-results-icon">🔍</span>
          <p class="no-results-text">No matches found</p>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination glass-panel">
        <button
          class="pagination-btn"
          :disabled="currentPage === 1"
          aria-label="Go to previous page of match history"
          @click="goToPage(currentPage - 1)"
        >
          ← PREVIOUS
        </button>

        <div class="pagination-info">
          <span>Page {{ currentPage }} of {{ totalPages }}</span>
        </div>

        <button
          class="pagination-btn"
          :disabled="currentPage === totalPages"
          aria-label="Go to next page of match history"
          @click="goToPage(currentPage + 1)"
        >
          NEXT →
        </button>
      </div>
    </template>
    </template>
  </div>
</template>

<style scoped>
.match-history {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Header */
.match-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.match-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.match-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

/* Loading & Error States */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  text-align: center;
  gap: var(--space-4);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-subtle);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.error-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-error);
}

.retry-btn {
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
}

.retry-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.stat-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.stat-value {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
  letter-spacing: var(--tracking-wide);
}

.stat-secondary {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Filters */
.filters-bar {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 150px;
}

.filter-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-secondary);
  text-transform: uppercase;
}

.filter-select {
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  background: var(--bg-tertiary);
  border: var(--hud-border) solid var(--border-subtle);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.filter-select:focus-visible {
  border-color: var(--accent-primary);
  outline: none;
}

/* Matches Table */
.matches-container {
  padding: 0;
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow-x: auto;
}

.matches-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.matches-table thead {
  background: var(--bg-tertiary);
  border-bottom: var(--hud-border) solid var(--border-subtle);
}

.matches-table th {
  padding: var(--space-3);
  text-align: left;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.matches-table td {
  padding: var(--space-3);
  border-bottom: var(--hud-border) solid var(--border-subtle);
  color: var(--text-secondary);
}

.match-row:hover {
  background: var(--bg-selected);
}

/* Result Cell */
.cell-result {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--font-semibold);
  text-transform: capitalize;
}

.result-win {
  color: var(--color-success);
}

.result-loss {
  color: var(--color-error);
}

.result-draw {
  color: var(--color-warning);
}

.result-icon {
  font-weight: var(--font-bold);
  font-size: var(--text-lg);
}

/* No Results */
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  text-align: center;
}

.no-results-icon {
  font-size: var(--text-4xl);
  margin-bottom: var(--space-2);
}

.no-results-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Visually Hidden */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  box-shadow:
    var(--shadow-xl),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.pagination-btn {
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
}

.pagination-btn:not(:disabled):hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filters-bar {
    flex-direction: column;
  }

  .filter-group {
    flex: 1;
  }

  .matches-table {
    font-size: var(--text-xs);
  }

  .matches-table th,
  .matches-table td {
    padding: var(--space-2);
  }
}

@media (max-width: 480px) {
  .match-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .pagination {
    flex-wrap: wrap;
  }

  .pagination-btn {
    flex: 1;
  }
}
</style>
