<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useSearch, type SearchTab } from '../../composables/useSearch'
import type { Friend, ChatRoom } from '../../types'

const props = defineProps<{
  friends: Friend[]
  rooms: ChatRoom[]
  currentUserId: number
}>()

const emit = defineEmits<{
  close: []
  selectRoom: [id: number]
  selectTournament: [id: string]
}>()

const {
  query,
  activeTab,
  currentPage,
  sortField,
  sortDir,
  filters,
  filteredTournaments,
  filterUsers,
  filterRooms,
  paginatedItems,
  totalPages,
  setQuery,
  setTab,
  setPage,
  setSortField,
  updateFilters,
} = useSearch()

const searchInput = ref<HTMLInputElement | null>(null)

const filteredUsers = computed(() => filterUsers(props.friends))
const filteredChatRooms = computed(() => filterRooms(props.rooms, props.currentUserId))

const tournamentResults = computed(() => paginatedItems(filteredTournaments.value))
const userResults = computed(() => paginatedItems(filteredUsers.value))
const roomResults = computed(() => paginatedItems(filteredChatRooms.value))

const tournamentPages = computed(() => totalPages(filteredTournaments.value.length))
const userPages = computed(() => totalPages(filteredUsers.value.length))
const roomPages = computed(() => totalPages(filteredChatRooms.value.length))

const currentTotalPages = computed(() => {
  if (activeTab.value === 'tournaments') return tournamentPages.value
  if (activeTab.value === 'users') return userPages.value
  return roomPages.value
})

const tabs: { key: SearchTab; labelKey: string; countGetter: () => number }[] = [
  { key: 'tournaments', labelKey: 'search.tabTournaments', countGetter: () => filteredTournaments.value.length },
  { key: 'users', labelKey: 'search.tabUsers', countGetter: () => filteredUsers.value.length },
  { key: 'rooms', labelKey: 'search.tabRooms', countGetter: () => filteredChatRooms.value.length },
]

const availableGames = computed(() => {
  const games = new Set(filteredTournaments.value.map(t => t.game))
  return [...games].sort()
})

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

const getRoomDisplayName = (room: ChatRoom): string => {
  if (room.title) return room.title
  const partner = room.participants.find(p => p.id !== props.currentUserId)
  return partner?.username ?? 'Chat'
}

onMounted(() => {
  searchInput.value?.focus()
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <Teleport to="body">
    <div class="search-backdrop" @click.self="emit('close')">
      <div class="search-modal glass-panel" role="dialog" aria-modal="true" aria-label="Search">
        <!-- Search input -->
        <div class="search-input-row">
          <input
            ref="searchInput"
            type="text"
            class="input search-field"
            :placeholder="$t('search.placeholder')"
            :value="query"
            @input="setQuery(($event.target as HTMLInputElement).value)"
            autocomplete="off"
          />
          <button class="btn btn-ghost btn-sm" @click="emit('close')">&times;</button>
        </div>

        <!-- Tab bar -->
        <div class="search-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="search-tab"
            :class="{ active: activeTab === tab.key }"
            @click="setTab(tab.key)"
          >
            {{ $t(tab.labelKey) }}
            <span class="tab-count">{{ tab.countGetter() }}</span>
          </button>
        </div>

        <!-- Filters (tournaments only) -->
        <div v-if="activeTab === 'tournaments'" class="search-filters">
          <div class="filter-row">
            <label class="filter-label">{{ $t('search.sortBy') }}</label>
            <button
              class="sort-btn"
              :class="{ active: sortField === 'name' }"
              @click="setSortField('name')"
            >
              {{ $t('search.sortName') }}
              <span v-if="sortField === 'name'">{{ sortDir === 'asc' ? '&#9650;' : '&#9660;' }}</span>
            </button>
            <button
              class="sort-btn"
              :class="{ active: sortField === 'date' }"
              @click="setSortField('date')"
            >
              {{ $t('search.sortDate') }}
              <span v-if="sortField === 'date'">{{ sortDir === 'asc' ? '&#9650;' : '&#9660;' }}</span>
            </button>
            <button
              class="sort-btn"
              :class="{ active: sortField === 'status' }"
              @click="setSortField('status')"
            >
              {{ $t('search.sortStatus') }}
              <span v-if="sortField === 'status'">{{ sortDir === 'asc' ? '&#9650;' : '&#9660;' }}</span>
            </button>
          </div>
          <div class="filter-row">
            <label class="filter-label">{{ $t('search.from') }}</label>
            <input
              type="date"
              class="input filter-date"
              :value="filters.dateFrom"
              @input="updateFilters({ dateFrom: ($event.target as HTMLInputElement).value })"
            />
            <label class="filter-label">{{ $t('search.to') }}</label>
            <input
              type="date"
              class="input filter-date"
              :value="filters.dateTo"
              @input="updateFilters({ dateTo: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="filter-row filter-checkboxes">
            <label v-for="status in ['open', 'live', 'finished']" :key="status" class="filter-checkbox">
              <input
                type="checkbox"
                :checked="filters.statuses.includes(status)"
                @change="updateFilters({
                  statuses: filters.statuses.includes(status)
                    ? filters.statuses.filter(s => s !== status)
                    : [...filters.statuses, status]
                })"
              />
              {{ status.toUpperCase() }}
            </label>
          </div>
        </div>

        <!-- Results -->
        <div class="search-results">
          <!-- Tournament results -->
          <template v-if="activeTab === 'tournaments'">
            <div v-if="tournamentResults.length === 0" class="no-results">
              {{ $t('search.noResults') }}
            </div>
            <div
              v-for="t in tournamentResults"
              :key="t.id"
              class="result-row"
              @click="emit('selectTournament', t.id)"
            >
              <div class="result-main">
                <span class="result-name">{{ t.name }}</span>
                <span class="result-sub">{{ t.game }}</span>
              </div>
              <div class="result-meta">
                <span class="result-badge" :class="'status-' + t.status">{{ t.status.toUpperCase() }}</span>
                <span class="result-date">{{ t.date }}</span>
              </div>
            </div>
          </template>

          <!-- User results -->
          <template v-if="activeTab === 'users'">
            <div v-if="userResults.length === 0" class="no-results">
              {{ $t('search.noResults') }}
            </div>
            <div
              v-for="f in userResults"
              :key="f.id"
              class="result-row"
            >
              <div class="result-main">
                <span class="result-name">{{ f.username }}</span>
                <span class="result-sub result-status" :class="{ online: f.status === 1 }">
                  {{ f.status === 1 ? $t('friends.online') : $t('friends.offline') }}
                </span>
              </div>
            </div>
          </template>

          <!-- Room results -->
          <template v-if="activeTab === 'rooms'">
            <div v-if="roomResults.length === 0" class="no-results">
              {{ $t('search.noResults') }}
            </div>
            <div
              v-for="r in roomResults"
              :key="r.id"
              class="result-row"
              @click="emit('selectRoom', r.id)"
            >
              <div class="result-main">
                <span class="result-name">{{ getRoomDisplayName(r) }}</span>
                <span v-if="r.lastMessage" class="result-sub">{{ r.lastMessage.content }}</span>
              </div>
              <span v-if="r.isUnread" class="result-unread"></span>
            </div>
          </template>
        </div>

        <!-- Pagination -->
        <div v-if="currentTotalPages > 1" class="search-pagination">
          <button
            class="btn btn-ghost btn-sm"
            :disabled="currentPage <= 1"
            @click="setPage(currentPage - 1)"
          >
            {{ $t('common.previous') }}
          </button>
          <span class="page-info">{{ $t('common.pageOf', { current: currentPage, total: currentTotalPages }) }}</span>
          <button
            class="btn btn-ghost btn-sm"
            :disabled="currentPage >= currentTotalPages"
            @click="setPage(currentPage + 1)"
          >
            {{ $t('common.next') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.search-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-backdrop);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  background: rgba(0, 0, 0, 0.5);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.search-modal {
  width: 100%;
  max-width: 640px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  -webkit-clip-path: polygon(
    0 0,
    calc(100% - var(--chamfer-md)) 0,
    100% var(--chamfer-md),
    100% 100%,
    var(--chamfer-xs) 100%,
    0 calc(100% - var(--chamfer-xs))
  );
  clip-path: polygon(
    0 0,
    calc(100% - var(--chamfer-md)) 0,
    100% var(--chamfer-md),
    100% 100%,
    var(--chamfer-xs) 100%,
    0 calc(100% - var(--chamfer-xs))
  );
  box-shadow: var(--shadow-xl);
}

.search-input-row {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.search-field {
  flex: 1;
}

.search-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-subtle);
}

.search-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-wider);
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.search-tab:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.search-tab.active {
  color: var(--accent-primary);
  border-bottom: 2px solid var(--accent-primary);
}

.tab-count {
  font-size: 10px;
  padding: 1px 4px;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  border-radius: 2px;
}

.search-tab.active .tab-count {
  background: var(--accent-primary-subtle);
  color: var(--accent-primary);
}

.search-filters {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.filter-label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--text-tertiary);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
}

.filter-date {
  max-width: 140px;
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-2);
}

.filter-checkboxes {
  gap: var(--space-4);
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  cursor: pointer;
}

.sort-btn {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--text-tertiary);
  background: transparent;
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.sort-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-default);
}

.sort-btn.active {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;
}

.no-results {
  padding: var(--space-8);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-default);
}

.result-row:hover {
  background: var(--bg-hover);
}

.result-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.result-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  letter-spacing: var(--tracking-wider);
}

.result-sub {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.result-badge {
  font-size: 10px;
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-wider);
  padding: 2px 6px;
}

.status-open { color: var(--color-success); }
.status-live { color: var(--accent-primary); }
.status-finished { color: var(--text-tertiary); }

.result-date {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.result-status.online {
  color: var(--color-success);
}

.result-unread {
  width: 8px;
  height: 8px;
  background: var(--accent-primary);
  -webkit-clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  flex-shrink: 0;
}

.search-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}

.page-info {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}
</style>
