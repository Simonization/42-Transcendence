<script setup lang="ts">
/**
 * Tournaments Browse Page
 * Main tournament browsing with search, filters, and pagination
 */

import { computed, ref } from 'vue'
import { mockTournaments, type Tournament } from '../../data/mockTournaments'
import TournamentCard from '../../components/tournaments/TournamentCard.vue'
import TournamentFilters from '../../components/tournaments/TournamentFilters.vue'

const searchQuery = ref('')
const filtersOpen = ref(false)
const currentPage = ref(1)
const pageSize = 20

const activeFilters = ref({
  games: [] as string[],
  statuses: [] as string[],
})

// Filter and search tournaments
const filteredTournaments = computed(() => {
  return mockTournaments.filter(tournament => {
    // Search filter
    if (
      searchQuery.value &&
      !tournament.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    ) {
      return false
    }

    // Game filter
    if (
      activeFilters.value.games.length > 0 &&
      !activeFilters.value.games.includes(tournament.game)
    ) {
      return false
    }

    // Status filter
    if (
      activeFilters.value.statuses.length > 0 &&
      !activeFilters.value.statuses.includes(tournament.status)
    ) {
      return false
    }

    return true
  })
})

// Pagination
const totalPages = computed(() => Math.ceil(filteredTournaments.value.length / pageSize))

const paginatedTournaments = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredTournaments.value.slice(start, end)
})

const handleFilterUpdate = (filters: { games: string[]; statuses: string[] }) => {
  activeFilters.value = filters
  currentPage.value = 1 // Reset to first page when filtering
}

const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const getPageNumbers = () => {
  const pages = []
  const maxPagesToShow = 5

  if (totalPages.value <= maxPagesToShow) {
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i)
    }
  } else {
    pages.push(1)

    const startPage = Math.max(2, currentPage.value - 1)
    const endPage = Math.min(totalPages.value - 1, currentPage.value + 1)

    if (startPage > 2) {
      pages.push('...')
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    if (endPage < totalPages.value - 1) {
      pages.push('...')
    }

    pages.push(totalPages.value)
  }

  return pages
}
</script>

<template>
  <section class="tournaments-page">
    <!-- Header -->
    <header class="tournaments-header glass-header">
      <div class="tournaments-header-content">
        <h1 class="tournaments-title">{{ $t('tournament.title') }}</h1>
        <span class="tournaments-count">{{ $t('common.results', { count: filteredTournaments.length }) }}</span>
      </div>
      <button
        class="tournaments-filter-toggle"
        @click="filtersOpen = !filtersOpen"
        aria-label="Toggle filters"
      >
        🔍 {{ $t('common.filters') }}
      </button>
    </header>

    <!-- Search Bar -->
    <div class="tournaments-search">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        :placeholder="$t('tournament.searchPlaceholder')"
        aria-label="Search tournaments"
      />
      <span class="search-icon">🔍</span>
    </div>

    <div class="tournaments-container">
      <!-- Filters Sidebar -->
      <TournamentFilters
        :games="activeFilters.games"
        :statuses="activeFilters.statuses"
        :is-open="filtersOpen"
        @update="handleFilterUpdate"
        @close="filtersOpen = false"
      />

      <!-- Main Content -->
      <main class="tournaments-main">
        <!-- No Results Message -->
        <div v-if="filteredTournaments.length === 0" class="no-results">
          <div class="no-results-icon">🏆</div>
          <h2 class="no-results-title">{{ $t('tournament.noTournamentsFound') }}</h2>
          <p class="no-results-text">{{ $t('tournament.noTournamentsHint') }}</p>
        </div>

        <!-- Tournament Grid -->
        <div v-else class="tournaments-grid">
          <TournamentCard
            v-for="tournament in paginatedTournaments"
            :key="tournament.id"
            :tournament="tournament"
          />
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <button
            class="pagination-btn"
            :disabled="currentPage === 1"
            aria-label="Go to previous page of tournaments"
            @click="goToPage(currentPage - 1)"
          >
            {{ $t('common.previous') }}
          </button>

          <div class="pagination-numbers">
            <button
              v-for="(page, index) in getPageNumbers()"
              :key="index"
              class="pagination-number"
              :class="{ 'pagination-number--active': page === currentPage }"
              :disabled="page === '...'"
              :aria-label="typeof page === 'number' ? `Go to page ${page}` : 'More pages'"
              @click="typeof page === 'number' && goToPage(page)"
            >
              {{ page }}
            </button>
          </div>

          <button
            class="pagination-btn"
            :disabled="currentPage === totalPages"
            aria-label="Go to next page of tournaments"
            @click="goToPage(currentPage + 1)"
          >
            {{ $t('common.next') }}
          </button>
        </div>
      </main>
    </div>

    <!-- Mobile Filter Overlay -->
    <div
      v-if="filtersOpen"
      class="filter-overlay"
      @click="filtersOpen = false"
    ></div>
  </section>
</template>

<style scoped>
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

.tournaments-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.tournaments-header {
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
}

.tournaments-header-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.tournaments-title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.tournaments-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
}

.tournaments-filter-toggle {
  display: none;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-secondary);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.tournaments-filter-toggle:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

.tournaments-search {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: var(--space-4) var(--space-6) var(--space-4) var(--space-4);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) solid var(--glass-border);
  color: var(--text-primary);
  transition: all var(--duration-fast) var(--ease-default);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.search-input:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 0;
  border-color: var(--accent-primary);
}

.search-icon {
  position: absolute;
  right: var(--space-4);
  font-size: var(--text-lg);
  pointer-events: none;
}

.tournaments-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-6);
}

.tournaments-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.tournaments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16);
  text-align: center;
  background: var(--glass-bg-elevated);
  backdrop-filter: var(--backdrop-blur-heavy);
  border: var(--hud-border) dashed var(--glass-border);
}

.no-results-icon {
  font-size: var(--text-6xl);
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.no-results-title {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
  color: var(--text-primary);
}

.no-results-text {
  margin: var(--space-2) 0 0 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-6);
}

.pagination-btn {
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-widest);
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

.pagination-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.pagination-numbers {
  display: flex;
  gap: var(--space-2);
}

.pagination-number {
  width: 40px;
  height: 40px;
  padding: 0;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  background: transparent;
  border: var(--hud-border) solid var(--border-default);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.pagination-number:not(:disabled):hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-subtle);
}

.pagination-number--active {
  border-color: var(--accent-primary);
  background: var(--bg-selected);
  color: var(--accent-primary);
}

.pagination-number:disabled {
  cursor: default;
}

.pagination-number:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.filter-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: calc(var(--z-modal) - 1);
}

/* Responsive */
@media (max-width: 768px) {
  .tournaments-header {
    padding: var(--space-4);
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .tournaments-filter-toggle {
    display: block;
    order: 3;
    width: 100%;
  }

  .tournaments-container {
    grid-template-columns: 1fr;
  }

  .filter-overlay {
    display: block;
  }

  .tournaments-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  .pagination {
    flex-wrap: wrap;
  }

  .pagination-numbers {
    order: 2;
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .tournaments-title {
    font-size: var(--text-lg);
  }

  .tournaments-grid {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  .pagination-btn {
    flex: 1;
  }
}
</style>
