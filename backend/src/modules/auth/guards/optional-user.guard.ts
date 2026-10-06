import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * For routes that anyone may call but that answer differently for a signed-in user (or an
 * admin): runs the regular JWT strategy, so `req.user` is the validated user with its role when
 * a good token is sent, and null otherwise. Never rejects the request. (OptionalJwtAuthGuard,
 * by contrast, only decodes the token: no role, no ban or deletion check.)
 */
@Injectable()
export class OptionalUserGuard extends AuthGuard('jwt') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            await super.canActivate(context);
        } catch {
            context.switchToHttp().getRequest().user = null;
        }
        return true;
    }

    handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
        return (user || null) as TUser;
    }
}
