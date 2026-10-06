import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { MailService } from './modules/mail/mail.service';
import { DataSource } from 'typeorm';
import { seedBotUser } from './modules/notifications/scripts/seed-bot-user';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // The app runs behind a reverse proxy (Caddy). Trusting proxies on loopback and private
  // networks makes req.ip the real client, which the anonymous routes' rate limit counts by.
  // TRUST_PROXY overrides it (any Express 'trust proxy' value, e.g. a hop count).
  app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal');
  
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

  const port = Number(process.env.PORT);
  console.log('Backend server is running on port 3000');
  await app.listen(port);
}
bootstrap();