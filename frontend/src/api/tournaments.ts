/**
 * Tournaments API
 * Endpoints for tournament CRUD and registration
 */

import { api } from './index'
import type {
  BackendTournament,
  CreateTournamentDto,
  UpdateTournamentDto,
  RegisterTournamentDto,
} from '../types'

export const tournamentsApi = {
  /**
   * List all tournaments
   */
  getAll(): Promise<BackendTournament[]> {
    return api<BackendTournament[]>('/tournaments')
  },

  /**
   * Get a single tournament by ID (includes phases, teams, matches)
   */
  getById(id: number): Promise<BackendTournament> {
    return api<BackendTournament>(`/tournaments/${id}`)
  },

  /**
   * Create a new tournament
   */
  create(data: CreateTournamentDto): Promise<BackendTournament> {
    return api<BackendTournament>('/tournaments', {
      method: 'POST',
      body: data,
    })
  },

  /**
   * Update a tournament
   */
  update(id: number, data: UpdateTournamentDto): Promise<BackendTournament> {
    return api<BackendTournament>(`/tournaments/${id}`, {
      method: 'PATCH',
      body: data,
    })
  },

  /**
   * Delete a tournament
   */
  delete(id: number): Promise<void> {
    return api<void>(`/tournaments/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Register for a tournament
   */
  register(id: number, data?: RegisterTournamentDto): Promise<void> {
    return api<void>(`/tournaments/${id}/register`, {
      method: 'POST',
      body: data ?? {},
    })
  },
}
