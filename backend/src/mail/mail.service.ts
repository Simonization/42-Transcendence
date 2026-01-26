import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor(private configService: ConfigService) {
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

    async sendTestEmail(email: string) {
        try {
            await this.transporter.sendMail({
                from: `"Transcendence" <${this.configService.get('MAIL_FROM')}>`,
                to: email,
                subject: 'Test Email from Transcendence',
                html: '<h1>Backend Started Successfully!</h1><p>Gmail SMTP is working.</p>',
            });
            this.logger.log(`✅ Test email sent to ${email}`);
        } catch (error) {
            this.logger.error(`❌ Failed to send test email to ${email}`, error.message);
            throw error;
        }
    }
}
