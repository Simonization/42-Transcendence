import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Optional guard - checks token if exists, otherwise allows request
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = request.headers.authorization?.replace('Bearer ', '');

        if (token) {
            try {
                const payload = await this.jwtService.verifyAsync(token);
                request.user = payload;
            } catch {}
        }
        return (true);
    }
}
