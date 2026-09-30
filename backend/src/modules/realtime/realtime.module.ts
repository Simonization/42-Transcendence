import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../teams/entities/team.entity';
import { Match } from '../matches/entities/match.entity';
import { User } from '../users/entities/user.entity';
import { getJwtSecret } from '../auth/jwt-secret';
import { RealtimeService } from './realtime.service';
import { RealtimeAccessService } from './realtime-access.service';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Global so any command can inject RealtimeService without importing this module.
 * See docs/realtime.md.
 */
@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Team, Match, User]),
        JwtModule.register({ secret: getJwtSecret() }),
    ],
    providers: [RealtimeService, RealtimeAccessService, RealtimeGateway],
    exports: [RealtimeService],
})
export class RealtimeModule {}
