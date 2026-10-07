import { BadRequestException, ConflictException } from '@nestjs/common';
import { EntityManager, QueryFailedError } from 'typeorm';

/**
 * Team names are unique within a tournament, compared case-insensitively and without the
 * surrounding spaces ("Reds" and " reds " clash). Teams outside any tournament are not
 * constrained.
 *
 * Two layers: the create / rename commands check under the tournament row lock (so they can
 * answer with a clear 409), and the partial unique index `UQ_teams_tournament_name` on
 * ("tournamentId", lower(btrim("name"))) is the backstop for any other writer.
 */

export const TEAM_NAME_INDEX = 'UQ_teams_tournament_name';
export const TEAM_NAME_TAKEN = 'TEAM_NAME_TAKEN';
export const TEAM_NAME_MIN = 3;

/** The stored form of a team name: trimmed. Throws 400 when too short once trimmed. */
export function cleanTeamName(raw: string): string {
    const name = (raw ?? '').trim();
    if (name.length < TEAM_NAME_MIN) {
        throw new BadRequestException(`Team name must be at least ${TEAM_NAME_MIN} characters`);
    }
    return name;
}

/** The 409 every path answers with; `error` is the code the SPA translates. */
export function teamNameTaken(): ConflictException {
    return new ConflictException('A team with that name is already registered in this tournament', TEAM_NAME_TAKEN);
}

/** Throws the 409 when another team of `tournamentId` already uses `name`. */
export async function assertTeamNameFree(
    manager: EntityManager,
    tournamentId: number,
    name: string,
    exceptTeamId?: number,
): Promise<void> {
    const rows: unknown[] = await manager.query(
        `SELECT 1 FROM "teams"
          WHERE "tournamentId" = $1 AND lower(btrim("name")) = lower(btrim($2)) AND "id" <> $3
          LIMIT 1`,
        [tournamentId, name, exceptTeamId ?? -1],
    );
    if (rows.length) throw teamNameTaken();
}

/** True when `err` is the unique index refusing a duplicate name. */
export function isTeamNameConflict(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) return false;
    const driver = (err as QueryFailedError & { driverError?: { code?: string; constraint?: string } }).driverError;
    return driver?.code === '23505' && driver?.constraint === TEAM_NAME_INDEX;
}
