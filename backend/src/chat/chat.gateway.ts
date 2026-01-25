import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(
{
  cors:
  {
    origin: '*', // We need to change this for PROD level, (with frontend address)
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket)
  {
    console.log(`Client connected: ${client.id}`);
    client.emit('message', 'Welcome to Chat Server!');
  }

  handleDisconnect(client: Socket)
  {
    console.log(`Client left: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: string): void
  {
    console.log(`Incoming Message: ${payload}`);
    this.server.emit('message', `someone: ${payload}`);
  }
}