import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { extractTokenFromSocket, isBannedUser } from '../auth/socket-auth.util';
import { RealtimeService } from './realtime.service';
import { RealtimeAccessService } from './realtime-access.service';
import { roomName } from './realtime.events';

/**
 * Realtime layer on the SAME Socket.IO namespace as ChatGateway (default namespace, same
 * options), so a browser keeps exactly one socket: chat events and realtime events travel over
 * it together. ChatGateway remains the authority that rejects unauthenticated or banned
 * sockets; this gateway verifies the token itself only to learn which user to put in the
 * `user:<id>` room, and silently ignores sockets it cannot identify.
 */
@WebSocketGateway({
    cors: {
        origin: ['https://localhost:8443', 'http://localhost:8443'],
        credentials: true,
    },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwtService: JwtService,
        private readonly realtime: RealtimeService,
        private readonly access: RealtimeAccessService,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
    ) {}

    afterInit(server: Server) {
        this.realtime.setServer(server);
    }

    async handleConnection(client: Socket) {
        const userId = await this.authenticate(client);
        if (userId !== null) client.join(roomName.user(userId));
    }

    /** Join `tournament:<id>`, `match:<id>` or `team:<id>`. Replies with an ack `{ ok }`. */
    @SubscribeMessage('subscribe')
    async handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
        const target = this.access.parseTarget(body);
        if (!target) return { ok: false, error: 'invalid_request' };
        // A client can emit `subscribe` the moment it connects, before the async handshake
        // checks in handleConnection have stored the user on the socket, so resolve it here.
        const userId = await this.resolveUserId(client);
        if (userId === null) return { ok: false, error: 'unauthorized' };

        if (!(await this.access.canJoin(userId, target))) return { ok: false, error: 'forbidden' };
        await client.join(roomName[target.channel](target.id));
        return { ok: true };
    }

    @SubscribeMessage('unsubscribe')
    async handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
        const target = this.access.parseTarget(body);
        if (!target) return { ok: false, error: 'invalid_request' };

        await client.leave(roomName[target.channel](target.id));
        return { ok: true };
    }

    private async resolveUserId(client: Socket): Promise<number | null> {
        const sub = client.data?.user?.sub;
        return Number.isInteger(sub) ? sub : this.authenticate(client);
    }

    private async authenticate(client: Socket): Promise<number | null> {
        try {
            const token = extractTokenFromSocket(client);
            if (!token) return null;
            const payload = this.jwtService.verify(token);
            const user = await this.userRepo.findOne({ where: { id: payload.sub } });
            if (!user || isBannedUser(user)) return null;
            // ChatGateway sets the same value; whichever gateway runs first wins, both agree.
            client.data.user = client.data.user ?? payload;
            return payload.sub;
        } catch {
            return null;
        }
    }
}
