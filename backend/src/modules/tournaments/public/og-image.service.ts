import { Injectable } from '@nestjs/common';
import { Resvg } from '@resvg/resvg-js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { buildOgSvg, FONT_DISPLAY, OG_WIDTH, OgModel } from './og-image';

/**
 * Renders link-preview PNGs. resvg-js is a prebuilt native binding (musl builds included, so it
 * runs on node:alpine) that draws SVG without a browser or system fonts: the three .ttf files in
 * ./fonts are the only fonts it knows (Orbitron and JetBrains Mono, both SIL OFL).
 */
@Injectable()
export class OgImageService {
    /** Bounded so a crawler walking tournament ids cannot grow the heap without limit. */
    private static readonly MAX_ENTRIES = 100;

    private readonly cache = new Map<string, Buffer>();
    private fontFiles: string[] | null = null;

    /** The card for `model`, from memory when the same model was drawn before. */
    render(tournamentId: number, model: OgModel): Buffer {
        // Same model, same picture: any change to the name, status, teams or podium is a new key.
        const key = `${tournamentId}:${JSON.stringify(model)}`;
        const hit = this.cache.get(key);
        if (hit) return hit;

        const png = this.draw(model);
        // A tournament that changed leaves its previous card behind; drop it.
        for (const old of [...this.cache.keys()]) {
            if (old.startsWith(`${tournamentId}:`)) this.cache.delete(old);
        }
        this.cache.set(key, png);
        while (this.cache.size > OgImageService.MAX_ENTRIES) {
            this.cache.delete(this.cache.keys().next().value as string);
        }
        return png;
    }

    private draw(model: OgModel): Buffer {
        const resvg = new Resvg(buildOgSvg(model), {
            fitTo: { mode: 'width', value: OG_WIDTH },
            font: {
                fontFiles: this.fonts(),
                loadSystemFonts: false,
                defaultFontFamily: FONT_DISPLAY,
            },
        });
        return resvg.render().asPng();
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
