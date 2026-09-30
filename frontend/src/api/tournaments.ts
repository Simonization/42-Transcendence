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
import type { PhaseStandings, SeedingView } from '../types/tournament'

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
   * Freeze the field and generate phase 1's matches (admin only)
   */
  start(id: number): Promise<BackendTournament> {
    return api<BackendTournament>(`/tournaments/${id}/start`, {
      method: 'POST',
    })
  },

  /**
   * The teams that would enter (or entered), seed 1 first, with the first-round layout.
   * The bracket preview draws this, so it matches the real bracket exactly.
   */
  getSeeding(id: number): Promise<SeedingView> {
    return api<SeedingView>(`/tournaments/${id}/seeding`)
  },

  /** Set the seed order before start (admin only). */
  setSeeding(id: number, teamIds: number[]): Promise<SeedingView> {
    return api<SeedingView>(`/tournaments/${id}/seeding`, {
      method: 'PUT',
      body: { teamIds },
    })
  },

  /** Group / round-robin standings. */
  getStandings(id: number): Promise<PhaseStandings[]> {
    return api<PhaseStandings[]>(`/tournaments/${id}/standings`)
  },

  /** Withdraw a team from a running tournament: its opponents win by walkover (admin only). */
  withdrawTeam(id: number, teamId: number): Promise<{ teamId: number; matchIds: number[]; tournamentCompleted: boolean }> {
    return api(`/tournaments/${id}/teams/${teamId}/withdraw`, { method: 'POST' })
  },
}
