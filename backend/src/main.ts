import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { MailService } from './modules/mail/mail.service';
import { DataSource } from 'typeorm';
import { seedBotUser } from './modules/notifications/scripts/seed-bot-user';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  app.enableCors({
    origin: 'http://localhost:5173', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Auto-create bot user for notifications system
  console.log('Checking notification bot user...');
  try {
    const dataSource = app.get(DataSource);
    await seedBotUser(dataSource);
  } catch (error) {
    console.error('Failed to create bot user:', error.message);
  }

  console.log('Backend server is running on port 3000');
  await app.listen(3000);
}
bootstrap();