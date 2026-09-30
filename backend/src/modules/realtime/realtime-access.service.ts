import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../teams/entities/team.entity';
import { Match } from '../matches/entities/match.entity';
import { User } from '../users/entities/user.entity';
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from '../users/constants/user-roles';
import { SUBSCRIBABLE_CHANNELS, SubscribableChannel } from './realtime.events';

export interface SubscribeTarget {
    channel: SubscribableChannel;
    id: number;
}

const MAX_PG_INT = 2147483647;

/**
 * Decides which rooms a socket may join. Read-only: it only queries the teams, matches and
 * users tables through their repositories.
 */
@Injectable()
export class RealtimeAccessService {
    constructor(
        @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
        @InjectRepository(Match) private readonly matchRepo: Repository<Match>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
    ) {}

    /**
     * Validates the raw `subscribe` / `unsubscribe` message body. Returns null for anything that
     * is not `{ channel: 'tournament' | 'match' | 'team', id: <positive int> }`. Ids may arrive
     * as numeric strings (route params) and are normalised to numbers.
     */
    parseTarget(payload: unknown): SubscribeTarget | null {
        if (typeof payload !== 'object' || payload === null) return null;
        const { channel, id } = payload as Record<string, unknown>;
        if (typeof channel !== 'string' || !(SUBSCRIBABLE_CHANNELS as readonly string[]).includes(channel)) {
            return null;
        }
        const numericId = typeof id === 'string' && /^\d{1,10}$/.test(id) ? Number(id) : id;
        if (typeof numericId !== 'number' || !Number.isInteger(numericId)) return null;
        if (numericId < 1 || numericId > MAX_PG_INT) return null;
        return { channel: channel as SubscribableChannel, id: numericId };
    }

    async canJoin(userId: number, target: SubscribeTarget): Promise<boolean> {
        switch (target.channel) {
            case 'tournament':
                // Tournaments and brackets are readable by any logged-in user through the REST
                // API, so a live view of them needs no extra check beyond being authenticated.
                return true;
            case 'team':
                return this.isTeamMember(userId, target.id);
            case 'match':
                return (await this.isAdmin(userId)) || (await this.isMatchParticipant(userId, target.id));
        }
    }

    async isTeamMember(userId: number, teamId: number): Promise<boolean> {
        const team = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['members'] });
        return !!team && team.members.some((m) => m.id === userId);
    }

    async isAdmin(userId: number): Promise<boolean> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        return !!user && (user.role === ADMIN_ROLE || user.role === SUPER_ADMIN_ROLE);
    }

    /** True when the user belongs to either team in the match's two slots. */
    async isMatchParticipant(userId: number, matchId: number): Promise<boolean> {
        const match = await this.matchRepo.findOne({
            where: { id: matchId },
            relations: ['team1', 'team1.members', 'team2', 'team2.members'],
        });
        if (!match) return false;
        return [match.team1, match.team2].some((team) =>
            (team?.members ?? []).some((m) => m.id === userId),
        );
    }
}
