import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { BOT_USER_ID, BOT_USERNAME, BOT_EMAIL, BOT_ROLE, BOT_STATUS } from '../constants/notification.constants';
import { User } from '../../users/entities/user.entity';

// create bot and save it in db to use it for  This bot is used to send notifications to users as chat messages
export async function seedBotUser(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  
  // check if bot exists
  const existingBot = await userRepository.findOne({ 
    where: { id: BOT_USER_ID } 
  });

  if (existingBot) {
    console.log('Bot already exists');
    return;
  }

  // create bot randmom password
  const randomPassword = Math.random().toString(36).substring(2, 15);
  const passwordHash = await bcrypt.hash(randomPassword, 10);

  // create bot user
  const botUser = userRepository.create({
    id: BOT_USER_ID,
    username: BOT_USERNAME,
    mail: BOT_EMAIL,
    passwordHash: passwordHash,
    role: BOT_ROLE,
    status: BOT_STATUS,
    isEmailVerified: true,
    twoFactorEnabled: false,
  });

  await userRepository.save(botUser);

  console.log(`Bot created (ID: ${BOT_USER_ID}, Username: ${BOT_USERNAME})`);
}

// async from the main for Bot creatrion 

if (require.main === module) {
  (async () => {
    const { NestFactory } = await import('@nestjs/core');
    const { AppModule } = await import('../../../app.module.js');
    const app = await NestFactory.create(AppModule);
    const dataSource = app.get(DataSource);
    
    try {
      await seedBotUser(dataSource);
    } catch (error) {
      console.error(error);
    } finally {
      await app.close();
    }
  })();
}
