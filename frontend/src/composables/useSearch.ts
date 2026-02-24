import { ref, computed } from 'vue'
import { mockTournaments, type Tournament } from '../data/mockTournaments'
import type { Friend, ChatRoom } from '../types'

export type SearchTab = 'tournaments' | 'users' | 'rooms'
export type SortDirection = 'asc' | 'desc'

export interface SearchFilters {
  games: string[]
  statuses: string[]
  dateFrom: string
  dateTo: string
}

const query = ref('')
const activeTab = ref<SearchTab>('tournaments')
const currentPage = ref(1)
const pageSize = 10
const sortField = ref<string>('name')
const sortDir = ref<SortDirection>('asc')
const filters = ref<SearchFilters>({
  games: [],
  statuses: [],
  dateFrom: '',
  dateTo: '',
})
const isOpen = ref(false)

export function useSearch() {
  const filteredTournaments = computed(() => {
    let result = [...mockTournaments]

    // Query filter
    if (query.value.trim()) {
      const q = query.value.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.game.toLowerCase().includes(q)
      )
    }

    // Game filter
    if (filters.value.games.length > 0) {
      result = result.filter(t => filters.value.games.includes(t.game))
    }

    // Status filter
    if (filters.value.statuses.length > 0) {
      result = result.filter(t => filters.value.statuses.includes(t.status))
    }

    // Date range filter
    if (filters.value.dateFrom) {
      result = result.filter(t => t.date >= filters.value.dateFrom)
    }
    if (filters.value.dateTo) {
      result = result.filter(t => t.date <= filters.value.dateTo)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      const field = sortField.value
      if (field === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (field === 'date') {
        cmp = a.date.localeCompare(b.date)
      } else if (field === 'status') {
        cmp = a.status.localeCompare(b.status)
      }
      return sortDir.value === 'desc' ? -cmp : cmp
    })

    return result
  })

  const filterUsers = (friends: Friend[]): Friend[] => {
    if (!query.value.trim()) return friends
    const q = query.value.toLowerCase()
    return friends.filter(f => f.username.toLowerCase().includes(q))
  }

  const filterRooms = (rooms: ChatRoom[], userId: number): ChatRoom[] => {
    if (!query.value.trim()) return rooms
    const q = query.value.toLowerCase()
    return rooms.filter(r => {
      if (r.title && r.title.toLowerCase().includes(q)) return true
      return r.participants.some(p =>
        p.id !== userId && p.username.toLowerCase().includes(q)
      )
    })
  }

  const paginatedItems = <T>(items: T[]): T[] => {
    const start = (currentPage.value - 1) * pageSize
    return items.slice(start, start + pageSize)
  }

  const totalPages = (count: number): number => {
    return Math.max(1, Math.ceil(count / pageSize))
  }

  const setQuery = (q: string) => {
    query.value = q
    currentPage.value = 1
  }

  const setTab = (tab: SearchTab) => {
    activeTab.value = tab
    currentPage.value = 1
  }

  const setPage = (page: number) => {
    currentPage.value = page
  }

  const setSortField = (field: string) => {
    if (sortField.value === field) {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortField.value = field
      sortDir.value = 'asc'
    }
    currentPage.value = 1
  }

  const updateFilters = (partial: Partial<SearchFilters>) => {
    filters.value = { ...filters.value, ...partial }
    currentPage.value = 1
  }

  const reset = () => {
    query.value = ''
    activeTab.value = 'tournaments'
    currentPage.value = 1
    sortField.value = 'name'
    sortDir.value = 'asc'
    filters.value = { games: [], statuses: [], dateFrom: '', dateTo: '' }
  }

  const openSearch = () => {
    isOpen.value = true
  }

  const closeSearch = () => {
    isOpen.value = false
    reset()
  }

  return {
    query,
    activeTab,
    currentPage,
    pageSize,
    sortField,
    sortDir,
    filters,
    isOpen,
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
    reset,
    openSearch,
    closeSearch,
  }
}
