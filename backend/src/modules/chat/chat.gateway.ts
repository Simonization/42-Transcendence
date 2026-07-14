import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not} from 'typeorm';
import { ChatParticipant } from './entities/chat-participant.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';

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
            const token = this.extractTokenFromSocket(client);
            if (!token) throw new UnauthorizedException('No Token found !');

            const payload = this.jwtService.verify(token);
            const user = await this.userRepo.findOne({ where: { id: payload.sub } });
            if (!user || this.isBannedUser(user)) {
                throw new UnauthorizedException('User is banned');
            }
            client.data.user = payload;
            const personalRoom = `user_${payload.sub}`;
            client.join(personalRoom);

            client.use(async (_packet, next) => {
                const latestUser = await this.userRepo.findOne({ where: { id: payload.sub } });
                if (!latestUser || this.isBannedUser(latestUser)) {
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

    private isBannedUser(user: User): boolean {
        return user.status === 1 || (!!user.banUntil && new Date(user.banUntil) > new Date());
    }

    private extractTokenFromSocket(client: Socket): string | undefined {
        const auth = client.handshake.auth;
        const headers = client.handshake.headers;

        if (auth && auth.token) {
            return auth.token.split(' ')[1] || auth.token;
        } else if (headers.authorization) {
            return headers.authorization.split(' ')[1];
        }
        return undefined;
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

    @SubscribeMessage('joinRoom')
    handleJoinRoom(client: Socket, payload: { roomId: number }) {
        const roomName = `room_${payload.roomId}`;
        client.join(roomName);
        console.log(`User ${client.data.user.username} joined ${roomName}`);
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(client: Socket, payload: { roomId: number }) {
        const roomName = `room_${payload.roomId}`;
        client.leave(roomName);
        console.log(`User ${client.data.user.username} left ${roomName}`);
    }

    @SubscribeMessage('typing')
    handleTyping(client: Socket, payload: { roomId: number, isTyping: boolean }) {
        const user = client.data.user;
        client.broadcast.to(`room_${payload.roomId}`).emit('userTyping', {
            roomId: payload.roomId,
            userId: user.sub,
            isTyping: payload.isTyping
        });
    }

    @SubscribeMessage('markRead')
    async handleMarkRead(client: Socket, payload: { roomId: number }) {
        const user = client.data.user;
        await this.messageRepo.update(
            { 
                chatId: payload.roomId, 
                senderId: Not(user.sub), 
                isRead: false 
            },
            { isRead: true }
        );
        client.broadcast.to(`room_${payload.roomId}`).emit('messagesRead', {
            roomId: payload.roomId,
            userId: user.sub
        });
    }

    @SubscribeMessage('sendMessage')
    async handleSendMessage(client: Socket, payload: { roomId: number, content: string }) {
        const user = client.data.user;

        const newMessage = this.messageRepo.create({
            chatId: payload.roomId,
            senderId: user.sub,
            content: payload.content,
        });
        const savedMessage = await this.messageRepo.save(newMessage);

        const messageToBroadcast = {
            id: savedMessage.id,
            roomId: payload.roomId,
            senderId: user.sub,
            content: savedMessage.content,
            createdAt: savedMessage.createdAt,
            sender: { id: user.sub, username: user.username }
        };

        this.server.to(`room_${payload.roomId}`).emit('newMessage', messageToBroadcast);
    }

    @SubscribeMessage('create-announcement')
    handleAnnouncement(client: Socket, payload: { message: string }): void {
        console.log(`Admin Announcement: ${payload.message}`);
        this.server.emit('announcement', {
            id: Date.now(),
            content: payload.message,
            createdAt: new Date().toISOString(),
            type: 'system'
        });
    }
}
