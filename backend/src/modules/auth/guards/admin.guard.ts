import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ADMIN_ROLE } from '../../users/constants/user-roles';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || user.role !== ADMIN_ROLE) {
            throw new ForbiddenException('Admin access required');
        }

        return true;
    }
}
