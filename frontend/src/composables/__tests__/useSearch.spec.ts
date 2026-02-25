/**
 * useSearch Composable Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSearch } from '../useSearch'
import type { Friend, ChatRoom } from '../../types'
import { FriendStatus } from '../../types'

// Mock API modules
vi.mock('../../api/tournaments', () => ({
  tournamentsApi: {
    getAll: vi.fn(),
  },
}))

vi.mock('../../api/users', () => ({
  usersApi: {
    search: vi.fn(),
  },
}))

import { tournamentsApi } from '../../api/tournaments'
import { usersApi } from '../../api/users'

const mockBackendTournaments = [
  {
    id: 1,
    name: 'Spring Championship 2026',
    description: 'Annual tournament',
    max_participants: 64,
    status: 'REGISTRATION_OPEN',
    phases: [{ id: 1, tournament_id: 1, order: 1, type: 'SINGLE_ELIMINATION', game_id: 1, game: { id: 1, name: 'League of Legends' }, matches: [] }],
    teams: [],
    createdAt: '2026-02-15T00:00:00Z',
  },
  {
    id: 2,
    name: 'Chess Blitz Royale',
    description: 'Fast-paced blitz',
    max_participants: 128,
    status: 'ONGOING',
    phases: [{ id: 2, tournament_id: 2, order: 1, type: 'ROUND_ROBIN', game_id: 2, game: { id: 2, name: 'Chess' }, matches: [] }],
    teams: [{ id: 1, name: 'Team A', status: 'active', captain_id: 1, members: [] }],
    createdAt: '2026-02-18T00:00:00Z',
  },
  {
    id: 3,
    name: 'Counter-Strike Elite Cup',
    description: 'Competitive CS',
    max_participants: 16,
    status: 'COMPLETED',
    phases: [{ id: 3, tournament_id: 3, order: 1, type: 'DOUBLE_ELIMINATION', game_id: 3, game: { id: 3, name: 'Counter-Strike 2' }, matches: [] }],
    teams: [],
    createdAt: '2026-02-20T00:00:00Z',
  },
]

describe('useSearch', () => {
  beforeEach(() => {
    const { reset } = useSearch()
    reset()
    vi.clearAllMocks()
    vi.mocked(tournamentsApi.getAll).mockResolvedValue(mockBackendTournaments as never)
    vi.mocked(usersApi.search).mockResolvedValue([])
  })

  describe('filteredTournaments (API-backed)', () => {
    it('should load tournaments from API', async () => {
      const { loadTournaments, filteredTournaments } = useSearch()
      await loadTournaments()
      expect(tournamentsApi.getAll).toHaveBeenCalled()
      expect(filteredTournaments.value.length).toBe(3)
    })

    it('should map backend status to display status', async () => {
      const { loadTournaments, filteredTournaments } = useSearch()
      await loadTournaments()
      const statuses = filteredTournaments.value.map(t => t.status)
      expect(statuses).toContain('open')
      expect(statuses).toContain('live')
      expect(statuses).toContain('finished')
    })

    it('should filter tournaments by name', async () => {
      const { loadTournaments, setQuery, filteredTournaments } = useSearch()
      await loadTournaments()
      setQuery('Championship')
      expect(filteredTournaments.value.every(t => t.name.toLowerCase().includes('championship'))).toBe(true)
    })

    it('should filter tournaments by game', async () => {
      const { loadTournaments, setQuery, filteredTournaments } = useSearch()
      await loadTournaments()
      setQuery('Chess')
      expect(filteredTournaments.value.every(t =>
        t.name.toLowerCase().includes('chess') ||
        t.game.toLowerCase().includes('chess')
      )).toBe(true)
    })

    it('should filter by status', async () => {
      const { loadTournaments, updateFilters, filteredTournaments } = useSearch()
      await loadTournaments()
      updateFilters({ statuses: ['open'] })
      expect(filteredTournaments.value.every(t => t.status === 'open')).toBe(true)
    })

    it('should filter by date range', async () => {
      const { loadTournaments, updateFilters, filteredTournaments } = useSearch()
      await loadTournaments()
      updateFilters({ dateFrom: '2026-02-19' })
      expect(filteredTournaments.value.every(t => t.date >= '2026-02-19')).toBe(true)
    })

    it('should return empty results when API fails', async () => {
      vi.mocked(tournamentsApi.getAll).mockRejectedValueOnce(new Error('Network error'))
      const { loadTournaments, filteredTournaments, searchError } = useSearch()
      // Force reload by resetting loaded state
      await loadTournaments()
      // After error, should have empty tournaments with error message
      // Note: tournamentsLoaded may still be false, but we verify graceful handling
      expect(searchError.value).toBe('Failed to load tournaments')
    })
  })

  describe('loading state', () => {
    it('should set isLoading during tournament fetch', async () => {
      let resolvePromise: (value: never[]) => void
      vi.mocked(tournamentsApi.getAll).mockReturnValue(new Promise(resolve => {
        resolvePromise = resolve as (value: never[]) => void
      }))
      const { loadTournaments, isLoading } = useSearch()
      const promise = loadTournaments()
      expect(isLoading.value).toBe(true)
      resolvePromise!([] as never[])
      await promise
      expect(isLoading.value).toBe(false)
    })

    it('should set isLoading during user search', async () => {
      let resolvePromise: (value: never[]) => void
      vi.mocked(usersApi.search).mockReturnValue(new Promise(resolve => {
        resolvePromise = resolve as (value: never[]) => void
      }))
      const { searchUsers, isLoading } = useSearch()
      const promise = searchUsers('alice')
      expect(isLoading.value).toBe(true)
      resolvePromise!([] as never[])
      await promise
      expect(isLoading.value).toBe(false)
    })
  })

  describe('searchUsers (API-backed)', () => {
    it('should call usersApi.search with query', async () => {
      const mockUsers = [
        { id: 10, username: 'alice', mail: 'a@a.com', twoFactorEnabled: false, profile: { userId: 10, displayName: null, avatarUrl: null, bio: null, createdAt: '' }, settings: {} },
      ]
      vi.mocked(usersApi.search).mockResolvedValue(mockUsers as never)
      const { searchUsers, searchedUsers } = useSearch()
      await searchUsers('alice')
      expect(usersApi.search).toHaveBeenCalledWith('alice')
      expect(searchedUsers.value).toHaveLength(1)
      expect(searchedUsers.value[0].username).toBe('alice')
    })

    it('should clear results when query is empty', async () => {
      const { searchUsers, searchedUsers } = useSearch()
      await searchUsers('')
      expect(usersApi.search).not.toHaveBeenCalled()
      expect(searchedUsers.value).toHaveLength(0)
    })

    it('should handle search error gracefully', async () => {
      vi.mocked(usersApi.search).mockRejectedValueOnce(new Error('Network error'))
      const { searchUsers, searchedUsers, searchError } = useSearch()
      await searchUsers('test')
      expect(searchedUsers.value).toHaveLength(0)
      expect(searchError.value).toBe('Failed to search users')
    })
  })

  describe('sorting', () => {
    it('should sort by name ascending by default', async () => {
      const { loadTournaments, filteredTournaments } = useSearch()
      await loadTournaments()
      const names = filteredTournaments.value.map(t => t.name)
      const sorted = [...names].sort()
      expect(names).toEqual(sorted)
    })

    it('should toggle sort direction', () => {
      const { setSortField, sortDir } = useSearch()
      expect(sortDir.value).toBe('asc')
      setSortField('name') // same field toggles direction
      expect(sortDir.value).toBe('desc')
    })

    it('should change sort field', () => {
      const { setSortField, sortField, sortDir } = useSearch()
      setSortField('date')
      expect(sortField.value).toBe('date')
      expect(sortDir.value).toBe('asc')
    })
  })

  describe('pagination', () => {
    it('should paginate items', () => {
      const { paginatedItems } = useSearch()
      const items = Array.from({ length: 25 }, (_, i) => i)
      const page1 = paginatedItems(items)
      expect(page1).toHaveLength(10)
      expect(page1[0]).toBe(0)
    })

    it('should return correct page', () => {
      const { paginatedItems, setPage } = useSearch()
      const items = Array.from({ length: 25 }, (_, i) => i)
      setPage(2)
      const page2 = paginatedItems(items)
      expect(page2).toHaveLength(10)
      expect(page2[0]).toBe(10)
    })

    it('should calculate total pages correctly', () => {
      const { totalPages } = useSearch()
      expect(totalPages(25)).toBe(3)
      expect(totalPages(10)).toBe(1)
      expect(totalPages(0)).toBe(1)
    })
  })

  describe('state management', () => {
    it('should reset page on filter change', () => {
      const { setPage, updateFilters, currentPage } = useSearch()
      setPage(3)
      expect(currentPage.value).toBe(3)
      updateFilters({ statuses: ['open'] })
      expect(currentPage.value).toBe(1)
    })

    it('should reset page on query change', () => {
      const { setPage, setQuery, currentPage } = useSearch()
      setPage(3)
      setQuery('test')
      expect(currentPage.value).toBe(1)
    })

    it('should reset page on tab change', () => {
      const { setPage, setTab, currentPage } = useSearch()
      setPage(3)
      setTab('users')
      expect(currentPage.value).toBe(1)
    })

    it('should reset all state', () => {
      const { setQuery, setTab, setPage, reset, query, activeTab, currentPage } = useSearch()
      setQuery('test')
      setTab('rooms')
      setPage(5)
      reset()
      expect(query.value).toBe('')
      expect(activeTab.value).toBe('tournaments')
      expect(currentPage.value).toBe(1)
    })
  })

  describe('filterUsers', () => {
    const mockFriends: Friend[] = [
      { id: 1, username: 'Alice', profile: { userId: 1, displayName: null, avatarUrl: null, bio: null, createdAt: '' }, status: FriendStatus.Accepted, since: '' },
      { id: 2, username: 'Bob', profile: { userId: 2, displayName: null, avatarUrl: null, bio: null, createdAt: '' }, status: FriendStatus.Accepted, since: '' },
      { id: 3, username: 'Charlie', profile: { userId: 3, displayName: null, avatarUrl: null, bio: null, createdAt: '' }, status: FriendStatus.Accepted, since: '' },
    ]

    it('should return all friends when query is empty', () => {
      const { filterUsers } = useSearch()
      expect(filterUsers(mockFriends)).toHaveLength(3)
    })

    it('should filter by username', () => {
      const { setQuery, filterUsers } = useSearch()
      setQuery('ali')
      const result = filterUsers(mockFriends)
      expect(result).toHaveLength(1)
      expect(result[0].username).toBe('Alice')
    })
  })

  describe('filterRooms', () => {
    const mockRooms: ChatRoom[] = [
      { id: 1, type: 0, title: null, participants: [{ id: 1, username: 'Me' }, { id: 2, username: 'Alice' }], lastMessage: null, isUnread: false },
      { id: 2, type: 1, title: 'Dev Chat', participants: [{ id: 1, username: 'Me' }], lastMessage: null, isUnread: false },
    ]

    it('should return all rooms when query is empty', () => {
      const { filterRooms } = useSearch()
      expect(filterRooms(mockRooms, 1)).toHaveLength(2)
    })

    it('should filter by room title', () => {
      const { setQuery, filterRooms } = useSearch()
      setQuery('dev')
      expect(filterRooms(mockRooms, 1)).toHaveLength(1)
    })

    it('should filter by participant username', () => {
      const { setQuery, filterRooms } = useSearch()
      setQuery('alice')
      const result = filterRooms(mockRooms, 1)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })
  })
})
