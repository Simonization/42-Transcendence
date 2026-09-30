/**
 * Roster rules, mirroring backend/src/modules/teams/utils/roster.ts.
 *
 * A team needs `teamSize` members to lock and may carry up to MAX_SUBSTITUTES more. Members past
 * the first `teamSize` are substitutes: the captain always starts, the others keep the order
 * they joined in.
 */

export const MAX_SUBSTITUTES = 2

export const maxRosterSize = (teamSize: number): number => teamSize + MAX_SUBSTITUTES

/** Ids of the bench players. */
export function substituteIds(
  members: readonly { id: number }[],
  captainId: number,
  teamSize: number,
): Set<number> {
  const ordered = [
    ...members.filter(m => m.id === captainId),
    ...members.filter(m => m.id !== captainId),
  ]
  return new Set(ordered.slice(teamSize).map(m => m.id))
}
