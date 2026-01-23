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

//TODO we need to create the database once before

@Module({
  imports: [

    //TODO put login in a .env
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'bloom',
      entities: [User, UserProfile, UserSettings, UserGameAccount],
      synchronize: true,
    }),

    UsersModule,

  ],

  controllers: [AppController],
  providers: [AppService],

})

export class AppModule {}