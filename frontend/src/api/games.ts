/**
 * Games API Module
 * Endpoints for game configuration (defines team size/count for tournaments)
 */

import { api } from './index'
import type { BackendGame, CreateGameDto } from '../types'

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
}
