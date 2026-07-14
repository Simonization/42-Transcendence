import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { CreateUserCommand } from '../../users/commands/create-user.command';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly createUserCommand: CreateUserCommand) { // Inject Command
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: 'https://localhost:8443/api/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  authorizationParams(): { [key: string]: string; } {
    return {
      access_type: 'offline',
      prompt: 'select_account'
    };
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails, photos } = profile;
    
    // Map Google Profile to your CreateUserDto structure
    const userDto = {
        mail: emails[0].value,
        username: emails[0].value.split('@')[0] + Math.floor(Math.random() * 1000), // Ensure unique username
        password: '', // Not used for Google
        picture: photos[0].value
    };

    // Execute the command
    const user = await this.createUserCommand.execute(userDto as any, true);
    
    done(null, user);
  }
}