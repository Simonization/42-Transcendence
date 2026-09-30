import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** A random, unguessable, url-safe join code (10 chars, ~59 bits of entropy). */
export function generateJoinCode(length = 10): string {
    const bytes = randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i++) {
        code += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return code;
}
