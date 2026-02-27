import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SUPER_ADMIN_ROLE } from '../../users/constants/user-roles';

@Injectable()
export class SuperAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User must be authenticated');
        }

        if (user.role !== SUPER_ADMIN_ROLE) {
            throw new ForbiddenException('Only super admin can perform this action');
        }

        return true;
    }
}
