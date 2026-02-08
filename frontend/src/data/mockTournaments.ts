/**
 * Mock Tournament Data
 * Used for landing page, tournaments browse, and tournament detail pages
 * Will be replaced with real API data in production
 */

export interface Tournament {
  id: string
  name: string
  game: string
  date: string
  endDate: string
  status: 'open' | 'live' | 'finished'
  maxParticipants: number
  currentParticipants: number
  format: 'single-elimination' | 'double-elimination' | 'round-robin'
  description: string
  rules: string
  prize: string
  organizer: {
    name: string
    avatar: string
  }
  featured?: boolean
}

export const mockTournaments: Tournament[] = [
  {
    id: '1',
    name: 'Spring Championship 2026',
    game: 'League of Legends',
    date: '2026-02-15',
    endDate: '2026-02-22',
    status: 'open',
    maxParticipants: 64,
    currentParticipants: 42,
    format: 'single-elimination',
    description:
      'Annual spring tournament featuring the best League of Legends players. Compete for glory and prizes!',
    rules: '1. No cheating\n2. Respect opponents\n3. Check-in 15 minutes before match\n4. Valid credentials required',
    prize: '$1000 prize pool',
    organizer: {
      name: '42 Esports Club',
      avatar: '⚔️',
    },
    featured: true,
  },
  {
    id: '2',
    name: 'Counter-Strike Elite Cup',
    game: 'Counter-Strike 2',
    date: '2026-02-20',
    endDate: '2026-02-27',
    status: 'open',
    maxParticipants: 16,
    currentParticipants: 8,
    format: 'double-elimination',
    description: 'Competitive Counter-Strike tournament for elite players. Teams only.',
    rules: '1. Team size: 5 players\n2. Best of 3 matches\n3. Map pool: Dust2, Mirage, Inferno',
    prize: '$2000 prize pool',
    organizer: {
      name: 'CS Pro League',
      avatar: '🎯',
    },
    featured: true,
  },
  {
    id: '3',
    name: 'Chess Blitz Royale',
    game: 'Chess',
    date: '2026-02-18',
    endDate: '2026-02-18',
    status: 'live',
    maxParticipants: 128,
    currentParticipants: 96,
    format: 'round-robin',
    description: 'Fast-paced blitz chess tournament. 5 minutes per side. Solo players only.',
    rules: '1. Blitz time control (5+0)\n2. No draw offers before move 30\n3. Rating: Any level welcome',
    prize: '$500 prize pool',
    organizer: {
      name: 'Chess.com',
      avatar: '♟️',
    },
    featured: true,
  },
  {
    id: '4',
    name: 'Dota 2 International Qualifier',
    game: 'Dota 2',
    date: '2026-03-01',
    endDate: '2026-03-08',
    status: 'open',
    maxParticipants: 32,
    currentParticipants: 16,
    format: 'single-elimination',
    description: 'Qualify for the international championship. Teams only.',
    rules: '1. Team size: 5 players\n2. All heroes available\n3. Patch: Latest stable',
    prize: '$5000 prize pool + International invite',
    organizer: {
      name: 'Valve',
      avatar: '🎮',
    },
  },
  {
    id: '5',
    name: 'Valorant Ascent Cup',
    game: 'Valorant',
    date: '2026-02-25',
    endDate: '2026-03-04',
    status: 'open',
    maxParticipants: 48,
    currentParticipants: 32,
    format: 'double-elimination',
    description: 'Tactical shooter tournament. Teams of 5. Rank requirement: Silver+',
    rules: '1. Team size: 5 players\n2. Maps: All in pool\n3. Best of 3',
    prize: '$1500 prize pool',
    organizer: {
      name: 'Riot Games',
      avatar: '🔫',
    },
  },
  {
    id: '6',
    name: 'StarCraft II Masters',
    game: 'StarCraft II',
    date: '2026-02-28',
    endDate: '2026-03-07',
    status: 'open',
    maxParticipants: 64,
    currentParticipants: 48,
    format: 'single-elimination',
    description: 'Real-time strategy tournament. Solo players only. All races welcome.',
    rules: '1. Race: Any (Terran, Zerg, Protoss)\n2. Map pool: 3 active maps\n3. Best of 3',
    prize: '$800 prize pool',
    organizer: {
      name: 'Blizzard',
      avatar: '🌌',
    },
  },
  {
    id: '7',
    name: 'Overwatch 2 Battle Arena',
    game: 'Overwatch 2',
    date: '2026-02-10',
    endDate: '2026-02-10',
    status: 'finished',
    maxParticipants: 32,
    currentParticipants: 32,
    format: 'single-elimination',
    description: 'Recently concluded team-based tournament.',
    rules: '1. Team size: 6 players\n2. Best of 3\n3. All heroes available',
    prize: '$1000 prize pool (distributed)',
    organizer: {
      name: 'Blizzard',
      avatar: '🎮',
    },
  },
  {
    id: '8',
    name: 'Rocket League Grand Prix',
    game: 'Rocket League',
    date: '2026-03-05',
    endDate: '2026-03-12',
    status: 'open',
    maxParticipants: 24,
    currentParticipants: 12,
    format: 'round-robin',
    description: 'High-octane vehicular soccer tournament. Solo or teams of 3.',
    rules: '1. Solo or 3v3\n2. Best of 3\n3. All arenas available',
    prize: '$600 prize pool',
    organizer: {
      name: 'Psyonix',
      avatar: '🚗',
    },
  },
  {
    id: '9',
    name: 'Fortnite Winter Cup',
    game: 'Fortnite',
    date: '2026-03-10',
    endDate: '2026-03-17',
    status: 'open',
    maxParticipants: 100,
    currentParticipants: 64,
    format: 'battle-royale',
    description: 'Battle royale tournament. Solo or teams. No entry fee.',
    rules: '1. All weapons allowed\n2. Best 5 matches\n3. Points: Placement + eliminations',
    prize: '$3000 prize pool',
    organizer: {
      name: 'Epic Games',
      avatar: '🎮',
    },
  },
  {
    id: '10',
    name: 'Street Fighter VI Pro Tour',
    game: 'Street Fighter VI',
    date: '2026-02-12',
    endDate: '2026-02-12',
    status: 'finished',
    maxParticipants: 32,
    currentParticipants: 32,
    format: 'single-elimination',
    description: 'Fighting game tournament. Solo players. All characters available.',
    rules: '1. 2/3 matches\n2. All characters allowed\n3. Tournament rules per Capcom',
    prize: '$700 prize pool (distributed)',
    organizer: {
      name: 'Capcom',
      avatar: '🥊',
    },
  },
]

/**
 * Get featured tournaments (first 3 marked as featured)
 */
export function getFeaturedTournaments(limit = 3): Tournament[] {
  return mockTournaments.filter(t => t.featured).slice(0, limit)
}

/**
 * Get tournaments by status
 */
export function getTournamentsByStatus(status: Tournament['status']): Tournament[] {
  return mockTournaments.filter(t => t.status === status)
}

/**
 * Get tournaments by game
 */
export function getTournamentsByGame(game: string): Tournament[] {
  return mockTournaments.filter(t => t.game.toLowerCase().includes(game.toLowerCase()))
}
