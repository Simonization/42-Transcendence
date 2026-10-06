import { BadRequestException } from '@nestjs/common';
import { AuthService, MAX_2FA_ATTEMPTS } from './auth.service';

/** A user row as the repository stores it, behind find / save / update mocks. */
function setup(row: Record<string, any>) {
    const userRepository = {
        findOne: jest.fn(async () => ({ ...row })),
        save: jest.fn(async (u) => Object.assign(row, u)),
        update: jest.fn(async (_id, patch) => Object.assign(row, patch)),
    };
    const refreshTokenRepository = { delete: jest.fn(), save: jest.fn() };
    const jwtService = { sign: jest.fn(() => 'jwt') };
    const mailService = { send2FACode: jest.fn(), sendVerificationEmail: jest.fn() };
    const service = new AuthService(
        {} as any,
        jwtService as any,
        mailService as any,
        userRepository as any,
        refreshTokenRepository as any,
        {} as any,
    );
    return { service, row, userRepository, mailService };
}

describe('AuthService email verification', () => {
    it('clears the token, so a verification link works once', async () => {
        const { service, row } = setup({ id: 7, verificationToken: 'tok', isEmailVerified: false });
        await service.verifyEmail('tok');
        expect(row.isEmailVerified).toBe(true);
        expect(row.verificationToken).toBeNull();
    });
});

describe('AuthService 2FA codes', () => {
    const user = () => ({ id: 7, username: 'u', mail: 'u@x', twoFactorEnabled: true, twoFactorCode: '123456' });

    it('a code logs in once, then is gone', async () => {
        const { service, row } = setup(user());
        await expect(service.verify2FA(7, '123456')).resolves.toHaveProperty('accessToken');
        expect(row.twoFactorCode).toBeNull();
        await expect(service.verify2FA(7, '123456')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('confirming 2FA consumes the code', async () => {
        const { service, row } = setup({ ...user(), twoFactorEnabled: false });
        await service.confirm2FA(7, '123456');
        expect(row.twoFactorEnabled).toBe(true);
        expect(row.twoFactorCode).toBeNull();
    });

    it(`throws the code away after ${MAX_2FA_ATTEMPTS} wrong guesses`, async () => {
        const { service, row } = setup(user());
        for (let i = 1; i < MAX_2FA_ATTEMPTS; i++) {
            await expect(service.verify2FA(7, '000000')).rejects.toThrow('Invalid verification code');
        }
        await expect(service.verify2FA(7, '000000')).rejects.toThrow('Too many');
        expect(row.twoFactorCode).toBeNull();
        // even the right code is useless now
        await expect(service.verify2FA(7, '123456')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('a new code resets the counter', async () => {
        const { service, row, mailService } = setup(user());
        for (let i = 1; i < MAX_2FA_ATTEMPTS; i++) {
            await expect(service.verify2FA(7, '000000')).rejects.toThrow('Invalid');
        }
        await service.enable2FA(7);
        const code = mailService.send2FACode.mock.calls[0][1];
        expect(code).toMatch(/^\d{6}$/);
        expect(row.twoFactorCode).toBe(code);
        await expect(service.verify2FA(7, code === '000000' ? '111111' : '000000')).rejects.toThrow('Invalid');
        await expect(service.verify2FA(7, code)).resolves.toHaveProperty('accessToken');
    });

    it('disabling clears a pending code', async () => {
        const { service, row } = setup(user());
        await service.disable2FA(7);
        expect(row.twoFactorEnabled).toBe(false);
        expect(row.twoFactorCode).toBeNull();
    });
});
