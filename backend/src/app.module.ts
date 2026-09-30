import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseOptions } from './database/database-options';

// Entities
import { User } from './modules/users/entities/user.entity';
import { UserProfile } from './modules/users/entities/user-profile.entity';
import { UserSettings } from './modules/users/entities/user-settings.entity';
import { UserGameAccount } from './modules/users/entities/user-game-account.entity';

// Feature Modules
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { FriendsModule } from './modules/friends/friends.module';
import { ChatModule } from './modules/chat/chat.module';
import { MatchesModule } from './modules/matches/matches.module';
import { GamesModule } from './modules/games/games.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // DB_* variables, entities and migrations: see database/database-options.ts. Migrations
    // run on boot unless DB_SYNCHRONIZE=true or DB_MIGRATIONS_RUN=false (docs/migrations.md).
    TypeOrmModule.forRoot(databaseOptions()),
    UsersModule,
    AuthModule,
    MailModule,
    FriendsModule,
    ChatModule,
    MatchesModule,
    NotificationsModule,
    GamesModule,
    TeamsModule,
    TournamentsModule,
    OrganizationsModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}