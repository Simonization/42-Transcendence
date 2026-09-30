import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Chat } from '../entities/chat.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { Match, MatchStatus } from '../../matches/entities/match.entity';
import { Team } from '../../teams/entities/team.entity';
import { MatchChatService } from './match-chat.service';

/** Just enough of an EntityManager for MatchChatService, backed by arrays. */
function setup(over: { match?: Partial<Match> } = {}) {
    const matches: any[] = [
        { id: 1, team1_id: 10, team2_id: 20, status: MatchStatus.READY, chat_room_id: null, ...over.match },
    ];
    const teams: any[] = [
        { id: 10, name: 'Blues', members: [{ id: 1 }, { id: 2 }] },
        { id: 20, name: 'Reds', members: [{ id: 3 }, { id: 4 }, { id: 5 }] },
    ];
    const chats: any[] = [];
    const participants: any[] = [];
    let nextChat = 100;

    const manager: any = {
        create: (_c: any, data: any) => ({ ...data }),
        findOne: async (ctor: any, { where }: any) => {
            const table = ctor === Match ? matches : ctor === Chat ? chats : ctor === ChatParticipant ? participants : [];
            return table.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null;
        },
        find: async (_ctor: any, { where }: any) => teams.filter((t) => (where.id.value as number[]).includes(t.id)),
        save: async (ctor: any, data: any) => {
            if (Array.isArray(data)) {
                participants.push(...data);
                return data;
            }
            if (ctor === Chat) {
                const chat = { ...data, id: nextChat++ };
                chats.push(chat);
                return chat;
            }
            participants.push(data);
            return data;
        },
        update: async (_c: any, where: any, patch: any) => {
            Object.assign(matches.find((m) => m.id === where.id), patch);
        },
    };
    const dataSource = { transaction: (fn: any) => fn(manager) };
    const service = new MatchChatService(dataSource as any);
    return { service, matches, chats, participants, teams };
}

describe('MatchChatService', () => {
    describe('ensureRoom', () => {
        it('creates a group chat named after the two teams, with every member of both', async () => {
            const { service, chats, participants, matches } = setup();
            const chat = await service.ensureRoom(1);

            expect(chat).toMatchObject({ type: 1, title: 'Blues vs Reds' });
            expect(chats).toHaveLength(1);
            expect(participants.map((p) => p.userId).sort()).toEqual([1, 2, 3, 4, 5]);
            expect(participants.every((p) => p.chatId === chat!.id)).toBe(true);
            expect(matches[0].chat_room_id).toBe(chat!.id);
        });

        it('is idempotent: a second call returns the same room and adds nothing', async () => {
            const { service, chats, participants } = setup();
            const first = await service.ensureRoom(1);
            const again = await service.ensureRoom(1);

            expect(again!.id).toBe(first!.id);
            expect(chats).toHaveLength(1);
            expect(participants).toHaveLength(5);
        });

        it.each([MatchStatus.WAITING, MatchStatus.BYE, MatchStatus.FINISHED, MatchStatus.CANCELLED])(
            'creates nothing for a %s match',
            async (status) => {
                const { service, chats } = setup({ match: { status } });
                expect(await service.ensureRoom(1)).toBeNull();
                expect(chats).toHaveLength(0);
            },
        );

        it('creates nothing while a slot is still empty', async () => {
            const { service, chats } = setup({ match: { team2_id: null } });
            expect(await service.ensureRoom(1)).toBeNull();
            expect(chats).toHaveLength(0);
        });

        it('returns null for an unknown match', async () => {
            const { service } = setup();
            expect(await service.ensureRoom(999)).toBeNull();
        });

        it('creates a new room when the link points at a chat that was deleted', async () => {
            const { service, chats } = setup({ match: { chat_room_id: 777 } });
            const chat = await service.ensureRoom(1);
            expect(chat!.id).not.toBe(777);
            expect(chats).toHaveLength(1);
        });
    });

    describe('ensureRooms', () => {
        it('handles several matches and never throws', async () => {
            const { service, chats } = setup();
            await expect(service.ensureRooms([1, 1, 999])).resolves.toBeUndefined();
            expect(chats).toHaveLength(1);
        });
    });

    describe('openForMember', () => {
        it('returns the room to a member and adds them if they were not in it', async () => {
            const { service, participants, teams } = setup();
            await service.ensureRoom(1);
            teams[0].members.push({ id: 9 }); // joined the team after the room was created

            const { chatId } = await service.openForMember(1, 9);
            expect(chatId).toBe(100);
            expect(participants.filter((p) => p.userId === 9)).toHaveLength(1);

            await service.openForMember(1, 9);
            expect(participants.filter((p) => p.userId === 9)).toHaveLength(1);
        });

        it('creates the room on demand for a match that became READY before chats existed', async () => {
            const { service, chats } = setup();
            const { chatId } = await service.openForMember(1, 3);
            expect(chats.map((c) => c.id)).toEqual([chatId]);
        });

        it('refuses someone who is in neither team', async () => {
            const { service } = setup();
            await expect(service.openForMember(1, 42)).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('has no room for a match still waiting for its opponent', async () => {
            const { service } = setup({ match: { status: MatchStatus.WAITING } });
            await expect(service.openForMember(1, 1)).rejects.toBeInstanceOf(ConflictException);
        });

        it('404s on an unknown match', async () => {
            const { service } = setup();
            await expect(service.openForMember(999, 1)).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
