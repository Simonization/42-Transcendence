import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatParticipant } from './entities/chat-participant.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { extractTokenFromSocket, isBannedUser } from '../auth/socket-auth.util';

@WebSocketGateway({
    cors: {
        origin: ['https://localhost:8443', 'http://localhost:8443'],
        credentials: true,
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private activeIntervals = new Map<string, NodeJS.Timeout>();

    constructor(
        private jwtService: JwtService,
        @InjectRepository(ChatParticipant) private partRepo: Repository<ChatParticipant>,
        @InjectRepository(Message) private messageRepo: Repository<Message>,
        @InjectRepository(User) private userRepo: Repository<User>,
    ) {}

    async handleConnection(client: Socket) {
        try {
            const token = extractTokenFromSocket(client);
            if (!token) throw new UnauthorizedException('No Token found !');

            const payload = this.jwtService.verify(token);
            const user = await this.userRepo.findOne({ where: { id: payload.sub } });
            if (!user || isBannedUser(user)) {
                throw new UnauthorizedException('User is banned');
            }
            client.data.user = payload;
            const personalRoom = `user_${payload.sub}`;
            client.join(personalRoom);

            client.use(async (_packet, next) => {
                const latestUser = await this.userRepo.findOne({ where: { id: payload.sub } });
                if (!latestUser || isBannedUser(latestUser)) {
                    client.emit('force-logout', { reason: 'banned' });
                    client.disconnect(true);
                    return;
                }
                next();
            });

            console.log(`Client connected: ${client.id} | Joined Room: ${personalRoom}`);
            this.startPulse(client);

        } catch (error) {
            console.error(`Unauthorized Access Denied ! ${client.id}`);
            client.disconnect(true);
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client left: ${client.id}`);
        this.stopPulse(client);
    }

    private startPulse(client: Socket) {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            client.emit('time-pulse', elapsed);
        }, 10000); // 100ms or 10 sec
        this.activeIntervals.set(client.id, interval);
    }

    private stopPulse(client: Socket) {
        const interval = this.activeIntervals.get(client.id);
        if (interval) {
            clearInterval(interval);
            this.activeIntervals.delete(client.id);
        }
    }

    broadcastToUsers(userIds: number[], event: string, data: any) {
        userIds.forEach(userId => {
            this.server.to(`user_${userId}`).emit(event, data);
        });
    }

    async disconnectUser(userId: number) {
        const roomName = `user_${userId}`;
        const sockets = await this.server.in(roomName).fetchSockets();
        sockets.forEach((socket) => {
            socket.emit('force-logout', { reason: 'banned' });
            socket.disconnect(true);
        });
    }

    /***    NEW CHAT EVENTS      ***/

    /**
     * Only participants may join a chat's room: it carries typing indicators and read receipts
     * (who is in the conversation and when they read it). Messages themselves go to `user_<id>`.
     */
    @SubscribeMessage('joinRoom')
    async handleJoinRoom(client: Socket, payload: { roomId: number }) {
        const chatId = Number(payload?.roomId);
        const userId = this.socketUserId(client);
        if (!Number.isInteger(chatId) || chatId <= 0 || userId === null) return { ok: false };
        if (!(await this.partRepo.existsBy({ chatId, userId }))) return { ok: false };

        const roomName = `room_${chatId}`;
        await client.join(roomName);
        console.log(`User ${userId} joined ${roomName}`);
        return { ok: true };
    }

    /**
     * The socket's user. A client may emit right after connecting, before the async
     * handleConnection has stored the payload, so fall back to verifying the handshake token
     * (handleConnection still disconnects banned or unknown users).
     */
    private socketUserId(client: Socket): number | null {
        const stored = client.data?.user?.sub;
        if (Number.isInteger(stored)) return stored;
        try {
            const token = extractTokenFromSocket(client);
            const sub = token ? this.jwtService.verify(token)?.sub : null;
            return Number.isInteger(sub) ? sub : null;
        } catch {
            return null;
        }
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(client: Socket, payload: { roomId: number }) {
        const roomName = `room_${payload?.roomId}`;
        client.leave(roomName);
        console.log(`User ${this.socketUserId(client)} left ${roomName}`);
    }

    @SubscribeMessage('typing')
    handleTyping(client: Socket, payload: { roomId: number, isTyping: boolean }) {
        // Only from inside the room (see joinRoom), so nobody can type "into" someone else's chat.
        if (!client.rooms.has(`room_${payload?.roomId}`)) return;
        client.broadcast.to(`room_${payload.roomId}`).emit('userTyping', {
            roomId: payload.roomId,
            userId: this.socketUserId(client),
            isTyping: payload.isTyping
        });
    }



}
