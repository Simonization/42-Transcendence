import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { Match, MatchStatus } from '../../matches/entities/match.entity';
import { Team } from '../../teams/entities/team.entity';

/** Chat type 1 is a group (see StartConversationCommand). */
const GROUP_CHAT_TYPE = 1;

/** Statuses in which both teams are known and the match is still to be played or settled. */
const PLAYABLE: readonly MatchStatus[] = [
    MatchStatus.READY,
    MatchStatus.ONGOING,
    MatchStatus.AWAITING_CONFIRMATION,
    MatchStatus.DISPUTED,
];

/**
 * One group chat per match, for the members of both teams.
 *
 * - Created (idempotently) when a match becomes READY: `matches.chat_room_id` holds the link.
 *   Undoing a result puts the match back to READY and reuses the same room.
 * - Members are copied once, at creation. Someone who joins or leaves a team afterwards is not
 *   synced; a member who is missing (or left the chat) can be put back by opening the room
 *   again through `openForMember`.
 * - The room is left as it is when the match finishes: players can still talk about the result
 *   or a dispute, and history stays readable. Members can leave it like any group.
 */
@Injectable()
export class MatchChatService {
    private readonly logger = new Logger(MatchChatService.name);

    constructor(private readonly dataSource: DataSource) {}

    /** Best effort, for callers after a commit: a failure is logged and never thrown. */
    async ensureRooms(matchIds: number[]): Promise<void> {
        for (const id of new Set(matchIds)) {
            try {
                await this.ensureRoom(id);
            } catch (err) {
                this.logger.warn(`Could not create the chat of match ${id}: ${(err as Error)?.message ?? err}`);
            }
        }
    }

    /** Returns the match's chat, creating it if the match is playable and has none. */
    async ensureRoom(matchId: number): Promise<Chat | null> {
        return this.dataSource.transaction((manager) => this.ensureIn(manager, matchId));
    }

    /**
     * Opens the match chat for a member of either team (creating it if needed) and makes sure
     * they are in it. Returns the chat id.
     */
    async openForMember(matchId: number, userId: number): Promise<{ chatId: number }> {
        return this.dataSource.transaction(async (manager) => {
            const match = await manager.findOne(Match, { where: { id: matchId } });
            if (!match) throw new NotFoundException(`Match ${matchId} not found`);
            const teams = await this.teamsOf(manager, match);
            if (!teams.some((t) => (t.members ?? []).some((m) => m.id === userId))) {
                throw new ForbiddenException('Only members of the two teams can open the match chat.');
            }

            const chat = await this.ensureIn(manager, matchId);
            if (!chat) throw new ConflictException('This match has no chat yet: both teams must be known.');

            const existing = await manager.findOne(ChatParticipant, { where: { chatId: chat.id, userId } });
            if (!existing) await manager.save(ChatParticipant, manager.create(ChatParticipant, { chatId: chat.id, userId }));
            return { chatId: chat.id };
        });
    }

    private async ensureIn(manager: EntityManager, matchId: number): Promise<Chat | null> {
        // Lock the row so two concurrent commits cannot both create a room.
        const match = await manager.findOne(Match, { where: { id: matchId }, lock: { mode: 'pessimistic_write' } });
        if (!match) return null;

        if (match.chat_room_id != null) {
            const existing = await manager.findOne(Chat, { where: { id: match.chat_room_id } });
            if (existing) return existing;
        }
        if (match.team1_id == null || match.team2_id == null || !PLAYABLE.includes(match.status)) return null;

        const teams = await this.teamsOf(manager, match);
        if (teams.length !== 2) return null;
        const [a, b] = teams;

        const chat = await manager.save(
            Chat,
            manager.create(Chat, { type: GROUP_CHAT_TYPE, title: `${a.name} vs ${b.name}` }),
        );
        const memberIds = [...new Set(teams.flatMap((t) => (t.members ?? []).map((m) => m.id)))];
        if (memberIds.length) {
            await manager.save(
                ChatParticipant,
                memberIds.map((userId) => manager.create(ChatParticipant, { chatId: chat.id, userId })),
            );
        }
        await manager.update(Match, { id: match.id }, { chat_room_id: chat.id });
        return chat;
    }

    /** The two teams in slot order, with their members. */
    private async teamsOf(manager: EntityManager, match: Match): Promise<Team[]> {
        if (match.team1_id == null || match.team2_id == null) return [];
        const found = await manager.find(Team, {
            where: { id: In([match.team1_id, match.team2_id]) },
            relations: ['members'],
        });
        return [match.team1_id, match.team2_id]
            .map((id) => found.find((t) => t.id === id))
            .filter((t): t is Team => !!t);
    }
}
