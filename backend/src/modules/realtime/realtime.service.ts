import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { RealtimePayload, roomName } from './realtime.events';

/**
 * Publish side of the realtime layer. Inject it anywhere (the module is @Global) and call the
 * method that matches the audience:
 *
 *   this.realtime.toTournament(id, RealtimeEvents.BRACKET_UPDATED, { reason: 'match_finished' });
 *
 * Publishing is fire-and-forget and never throws: a missed push only means the client sees the
 * change on its next fetch, so a broken socket must not fail the command that triggered it.
 */
@Injectable()
export class RealtimeService {
    private readonly logger = new Logger(RealtimeService.name);
    private server: Server | null = null;

    /** Called once by RealtimeGateway when the shared Socket.IO server is up. */
    setServer(server: Server): void {
        this.server = server;
    }

    toUser(userId: number, event: string, payload: RealtimePayload = {}): void {
        this.emit(roomName.user(userId), event, payload);
    }

    toTeam(teamId: number, event: string, payload: RealtimePayload = {}): void {
        this.emit(roomName.team(teamId), event, payload);
    }

    toTournament(tournamentId: number, event: string, payload: RealtimePayload = {}): void {
        this.emit(roomName.tournament(tournamentId), event, payload);
    }

    toMatch(matchId: number, event: string, payload: RealtimePayload = {}): void {
        this.emit(roomName.match(matchId), event, payload);
    }

    private emit(room: string, event: string, payload: RealtimePayload): void {
        if (!this.server) return;
        try {
            this.server.to(room).emit(event, payload);
        } catch (err) {
            this.logger.warn(`emit ${event} to ${room} failed: ${(err as Error).message}`);
        }
    }
}
