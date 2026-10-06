import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type * as ResvgModule from '@resvg/resvg-js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { buildOgSvg, FONT_DISPLAY, OG_WIDTH, OgModel } from './og-image';

interface Entry {
    /** The model the picture was drawn from; a different model is a new picture. */
    key: string;
    png: Promise<Buffer>;
    expiresAt: number;
}

/**
 * Renders link-preview PNGs. resvg-js is a prebuilt native binding (musl builds included, so it
 * runs on node:alpine) that draws SVG without a browser or system fonts: the three .ttf files in
 * ./fonts are the only fonts it knows (Orbitron and JetBrains Mono, both SIL OFL).
 *
 * The binding is loaded on the first draw, not when this file is imported: if it cannot load
 * (wrong libc, missing optional package), og.png answers 503 and the rest of the app runs.
 * Drawing uses renderAsync, which runs on the libuv thread pool instead of the event loop.
 */
@Injectable()
export class OgImageService {
    private static readonly logger = new Logger(OgImageService.name);

    /** One entry per tournament id, so a crawler walking ids holds at most this many PNGs. */
    static readonly MAX_ENTRIES = 500;
    /** How long a picture is served before the next request may draw it again. */
    static readonly TTL_MS = 10 * 60 * 1000;

    private readonly cache = new Map<number, Entry>();
    private fontFiles: string[] | null = null;
    /** undefined: not tried yet; null: tried and failed (not retried, the failure is permanent). */
    private binding: typeof ResvgModule | null | undefined;

    /**
     * The card for `model`. Served from memory while the same id was drawn from the same model
     * less than TTL_MS ago; concurrent requests for one id share a single draw.
     */
    async render(tournamentId: number, model: OgModel): Promise<Buffer> {
        // Any change to the name, status, teams or podium is a new key, hence a new picture.
        const key = JSON.stringify(model);
        const now = this.now();
        const hit = this.cache.get(tournamentId);
        if (hit && hit.key === key && hit.expiresAt > now) return hit.png;

        const png = this.draw(model);
        // Re-insert so the Map's order is least recently drawn first.
        this.cache.delete(tournamentId);
        this.cache.set(tournamentId, { key, png, expiresAt: now + OgImageService.TTL_MS });
        // A failed draw is not cached.
        png.catch(() => {
            if (this.cache.get(tournamentId)?.png === png) this.cache.delete(tournamentId);
        });
        this.evict(now);
        return png;
    }

    private evict(now: number) {
        for (const [id, entry] of this.cache) {
            if (entry.expiresAt <= now) this.cache.delete(id);
        }
        while (this.cache.size > OgImageService.MAX_ENTRIES) {
            this.cache.delete(this.cache.keys().next().value as number);
        }
    }

    private async draw(model: OgModel): Promise<Buffer> {
        const resvg = this.resvg();
        const rendered = await resvg.renderAsync(buildOgSvg(model), {
            fitTo: { mode: 'width', value: OG_WIDTH },
            font: {
                fontFiles: this.fonts(),
                loadSystemFonts: false,
                defaultFontFamily: FONT_DISPLAY,
            },
        });
        return rendered.asPng();
    }

    /** The native binding, loaded once; a 503 when it cannot load on this platform. */
    private resvg(): typeof ResvgModule {
        if (this.binding === undefined) {
            try {
                this.binding = this.loadBinding();
            } catch (err) {
                this.binding = null;
                OgImageService.logger.error(
                    `@resvg/resvg-js failed to load; og.png is disabled: ${err instanceof Error ? err.message : err}`,
                );
            }
        }
        if (!this.binding) throw new ServiceUnavailableException('Preview images are unavailable.');
        return this.binding;
    }

    /** Overridable clock, for the TTL tests. */
    protected now(): number {
        return Date.now();
    }

    /** Separate so tests can simulate a platform without the binding. */
    protected loadBinding(): typeof ResvgModule {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('@resvg/resvg-js') as typeof ResvgModule;
    }

    private fonts(): string[] {
        if (!this.fontFiles) {
            // Copied next to this file by the nest build (see nest-cli.json assets).
            const dir = join(__dirname, 'fonts');
            this.fontFiles = readdirSync(dir)
                .filter((f) => f.endsWith('.ttf'))
                .map((f) => join(dir, f));
        }
        return this.fontFiles;
    }
}
