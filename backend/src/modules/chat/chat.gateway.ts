import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

@WebSocketGateway(
	{
		cors:
		{
			origin: '*', // We need to change this for PROD level, (with frontend address)
		},
	})

export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private activeIntervals = new Map<string, NodeJS.Timeout>();
    constructor(private jwtService: JwtService) {}
    async handleConnection(client: Socket) {
        try {
            const token = this.extractTokenFromSocket(client);

            if (!token) {
                throw new UnauthorizedException('No Token found !');
            }
            const payload = this.jwtService.verify(token);
            client.data.user = payload; 
            console.log(`Client connected: ${client.id} | User ID: ${payload.sub} | Username: ${payload.username}`);
            client.emit('message', `Welcome ${payload.username}!`);
            this.startPulse(client); 

        } catch (error) {
            console.error(`Unauthorized Access Denied ! ${client.id} - ${error.message}`);
            client.disconnect(true); 
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client left: ${client.id}`);
        this.stopPulse(client);
    }

    @SubscribeMessage('sendMessage')
    handleMessage(client: Socket, payload: string): void {
        const user = client.data.user;
        console.log(`Incoming Message from ${user.username}: ${payload}`);
        this.server.emit('message', `${user.username}: ${payload}`);
    }

    @SubscribeMessage('create-announcement')
    handleAnnouncement(client: Socket, payload: { message: string }): void {

		// if(client.data.user.role !== 'admin') return; -> Possible Condition for Admin Check

        console.log(`Admin Announcement: ${payload.message}`);
        this.server.emit('announcement', {
            id: Date.now(),
            content: payload.message,
            createdAt: new Date().toISOString(),
            type: 'system'
        });
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
        }, 100); // 100ms or 10 sec
        this.activeIntervals.set(client.id, interval);
    }

    private stopPulse(client: Socket) {
        const interval = this.activeIntervals.get(client.id);
        if (interval) {
            clearInterval(interval);
            this.activeIntervals.delete(client.id);
        }
    }
}

/*	
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	private activeIntervals = new Map<string, NodeJS.Timeout>();
	constructor(private jwtService: JwtService) {}

	handleConnection(client: Socket) {
		const startTime = Date.now();
		const interval = setInterval(() => {
			const now = Date.now();
			const elapsed = ((now - startTime) / 1000).toFixed(1);
			client.emit('time-pulse', elapsed);
		}, 100);
		this.activeIntervals.set(client.id, interval);
		console.log(`Client connected: ${client.id}`);
		client.emit('message', 'Welcome to Chat Server!');
	}

	handleDisconnect(client: Socket) {
		console.log(`Client left: ${client.id}`);
		const interval = this.activeIntervals.get(client.id);
		if (interval) {
			clearInterval(interval);
			this.activeIntervals.delete(client.id);
		}
	}

	@SubscribeMessage('sendMessage')
	handleMessage(client: Socket, payload: string): void {
		console.log(`Incoming Message: ${payload}`);
		this.server.emit('message', `someone: ${payload}`);
	}

	@SubscribeMessage('create-announcement')
	handleAnnouncement(client: Socket, payload: { message: string }): void {
		console.log(`Admin Messages: ${payload.message}`);

		this.server.emit('announcement', {
			id: Date.now(),
			content: payload.message,
			createdAt: new Date().toISOString(),
			type: 'system'
		});
	}
}
*/