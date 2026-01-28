import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Mail Service - Handles all email sending operations
@Injectable()
export class MailService {
    // Nodemailer transporter instance for sending emails
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor(private configService: ConfigService) {
        // Configure SMTP transporter with Gmail
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('MAIL_HOST'),
            port: this.configService.get('MAIL_PORT'),
            secure: false,
            auth: {
                user: this.configService.get('MAIL_USER'),
                pass: this.configService.get('MAIL_PASSWORD'),
            },
        });
    }

    // Send email verification link to new users
    async sendVerificationEmail(email: string, token: string, username: string) {
        // Build verification URL with token as query parameter
        const verificationUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost')}/verify-email?token=${token}`;
        
        try {
            await this.transporter.sendMail({
                from: `"Transcendence" <${this.configService.get('MAIL_FROM')}>`,
                to: email,
                subject: 'Verify your email address',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #42b883;">Welcome to Transcendence, ${username}!</h2>
                        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
                        <!-- Call-to-action button with inline styles for compatibility -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background-color: #42b883; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                Verify Email Address
                            </a>
                        </div>
                        <!-- Fallback plain text link in case button doesn't render -->
                        <p style="color: #666; font-size: 14px;">
                            If the button doesn't work, copy and paste this link into your browser:
                        </p>
                        <p style="color: #42b883; word-break: break-all;">
                            ${verificationUrl}
                        </p>
                        <p style="color: #999; font-size: 12px; margin-top: 30px;">
                            If you didn't create this account, please ignore this email.
                        </p>
                    </div>
                `,
            });
            this.logger.log(`Verification email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send verification email to ${email}`, error);
            throw error;
        }
    }

    //Send 2FA verification code via email
    async send2FACode(email: string, code: string, username: string) {
        try {
            await this.transporter.sendMail({
                from: `"Transcendence" <${this.configService.get('MAIL_FROM')}>`,
                to: email,
                subject: 'Your Transcendence 2FA Code',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #42b883;">Two-Factor Authentication</h2>
                        <p>Hi ${username},</p>
                        <p>Your 2FA code to enable two-factor authentication is:</p>
                        <!-- Display code in a prominent, easy-to-read format -->
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; display: inline-block;">
                                <h1 style="color: #42b883; margin: 0; letter-spacing: 5px; font-family: monospace;">
                                    ${code}
                                </h1>
                            </div>
                        </div>
                        <!-- Note: Actual expiration logic is handled in auth.service, not here -->
                        <p style="color: #666;">This code will expire in 10 minutes.</p>
                        <p style="color: #999; font-size: 12px; margin-top: 30px;">
                            If you didn't request this code, please ignore this email.
                        </p>
                    </div>
                `,
            });
            this.logger.log(`2FA code sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send 2FA code to ${email}`, error);
            throw error;
        }
    }
}
