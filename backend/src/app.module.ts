import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Entities
import { User } from './modules/users/entities/user.entity';
import { UserProfile } from './modules/users/entities/user-profile.entity';
import { UserSettings } from './modules/users/entities/user-settings.entity';
import { UserGameAccount } from './modules/users/entities/user-game-account.entity';

// Feature Modules
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './auth/auth.module';

//TODO we need to create the database once before

@Module({
  imports: [

    //TODO put login in a .env
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'db',
      port: 5432,
      username: 'user',
      password: 'password',
      database: 'transcendence_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),

    UsersModule,
    AuthModule,

  ],

  controllers: [AppController],
  providers: [AppService],

})

export class AppModule {}