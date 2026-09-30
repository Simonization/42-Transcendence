import { Socket } from 'socket.io';
import { User } from '../users/entities/user.entity';

/**
 * Shared by every Socket.IO gateway on the app's single namespace (today: ChatGateway and
 * RealtimeGateway). Pulled out of ChatGateway so a second gateway on the same socket doesn't
 * have to re-implement (and risk drifting from) the same handshake-token parsing and ban check.
 */
export function extractTokenFromSocket(client: Socket): string | undefined {
    const auth = client.handshake.auth;
    const headers = client.handshake.headers;

    if (auth && auth.token) {
        return auth.token.split(' ')[1] || auth.token;
    } else if (headers.authorization) {
        return headers.authorization.split(' ')[1];
    }
    return undefined;
}

export function isBannedUser(user: User): boolean {
    return user.status === 1 || (!!user.banUntil && new Date(user.banUntil) > new Date());
}
