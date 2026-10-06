import type { ThrottlerModuleOptions } from '@nestjs/throttler';

/*
 * Rate limits for the anonymous routes (/public/tournaments, /share/t). Only the controllers that
 * opt in with @UseGuards(ThrottlerGuard) are limited; there is no global guard, so logged-in
 * routes are unaffected.
 *
 * Counted per client IP. Behind Caddy, `req.ip` is the client only because main.ts sets Express's
 * `trust proxy` (TRUST_PROXY, default: loopback and private-network proxies); without it every
 * visitor would share Caddy's address and one bucket.
 */

const MINUTE = 60_000;

/** Every anonymous route: a page view fetches one or two of these. */
export const PUBLIC_THROTTLE: ThrottlerModuleOptions = [{ name: 'default', ttl: MINUTE, limit: 60 }];

/** og.png draws a PNG when it is not cached: tighter. */
export const OG_IMAGE_THROTTLE = { default: { ttl: MINUTE, limit: 20 } };
