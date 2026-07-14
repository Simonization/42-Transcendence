/**
 * Games API Module
 * Endpoints for game configuration (defines team size/count for tournaments)
 */

import { api } from './index'
import type { BackendGame, CreateGameDto, UpdateGameDto } from '../types'

export const gamesApi = {
  /**
   * List all available games
   */
  getAll(): Promise<BackendGame[]> {
    return api<BackendGame[]>('/games')
  },

  /**
   * Get a single game by ID
   */
  getById(id: number): Promise<BackendGame> {
    return api<BackendGame>(`/games/${id}`)
  },

  /**
   * Create a new game configuration (admin)
   */
  create(data: CreateGameDto): Promise<BackendGame> {
    return api<BackendGame>('/games', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Update a game configuration (admin)
   */
  update(id: number, data: UpdateGameDto): Promise<BackendGame> {
    return api<BackendGame>(`/games/${id}`, {
      method: 'PATCH',
      body: data,
    })
  },

  /**
   * Delete a game configuration (admin)
   */
  delete(id: number): Promise<void> {
    return api<void>(`/games/${id}`, {
      method: 'DELETE',
    })
  },
}
