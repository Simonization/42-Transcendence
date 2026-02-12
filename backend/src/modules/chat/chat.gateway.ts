import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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