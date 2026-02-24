/**
 * useSearch Composable Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useSearch } from '../useSearch'
import type { Friend, ChatRoom } from '../../types'
import { FriendStatus } from '../../types'

describe('useSearch', () => {
  beforeEach(() => {
    const { reset } = useSearch()
    reset()
  })

  describe('filteredTournaments', () => {
    it('should return all tournaments when query is empty', () => {
      const { filteredTournaments } = useSearch()
      expect(filteredTournaments.value.length).toBeGreaterThan(0)
    })

    it('should filter tournaments by name', () => {
      const { setQuery, filteredTournaments } = useSearch()
      setQuery('Championship')
      expect(filteredTournaments.value.every(t => t.name.toLowerCase().includes('championship'))).toBe(true)
    })

    it('should filter tournaments by game', () => {
      const { setQuery, filteredTournaments } = useSearch()
      setQuery('League of Legends')
      expect(filteredTournaments.value.every(t =>
        t.name.toLowerCase().includes('league of legends') ||
        t.game.toLowerCase().includes('league of legends')
      )).toBe(true)
    })

    it('should filter by status', () => {
      const { updateFilters, filteredTournaments } = useSearch()
      updateFilters({ statuses: ['open'] })
      expect(filteredTournaments.value.every(t => t.status === 'open')).toBe(true)
    })

    it('should filter by date range', () => {
      const { updateFilters, filteredTournaments } = useSearch()
      updateFilters({ dateFrom: '2026-03-01' })
      expect(filteredTournaments.value.every(t => t.date >= '2026-03-01')).toBe(true)
    })

    it('should combine query and filters', () => {
      const { setQuery, updateFilters, filteredTournaments } = useSearch()
      setQuery('a')
      updateFilters({ statuses: ['open'] })
      expect(filteredTournaments.value.every(t => t.status === 'open')).toBe(true)
    })
  })

  describe('sorting', () => {
    it('should sort by name ascending by default', () => {
      const { filteredTournaments } = useSearch()
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
