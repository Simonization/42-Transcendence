import { ServiceUnavailableException } from '@nestjs/common';
import { Resvg } from '@resvg/resvg-js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { buildOgSvg, FONT_DISPLAY, OG_WIDTH, OgModel } from './og-image';
import { OgImageService } from './og-image.service';

const model = (title = 'Cup'): OgModel => ({
    title,
    status: 'ONGOING',
    statusLabel: 'LIVE',
    teamsCount: 4,
    game: 'Game',
    rows: [],
});

/** A service whose binding and clock the test controls. */
class TestService extends OgImageService {
    clock = 1_000_000;
    draws = 0;
    fake: any = {
        renderAsync: jest.fn(async () => {
            this.draws++;
            return { asPng: () => Buffer.from(`png${this.draws}`) };
        }),
    };
    protected now() {
        return this.clock;
    }
    protected loadBinding() {
        return this.fake;
    }
}

describe('OgImageService', () => {
    it('produces the same bytes as the synchronous renderer it replaces', async () => {
        const m = model('Autumn Cup');
        const dir = join(__dirname, 'fonts');
        const fontFiles = readdirSync(dir)
            .filter((f) => f.endsWith('.ttf'))
            .map((f) => join(dir, f));
        const before = new Resvg(buildOgSvg(m), {
            fitTo: { mode: 'width', value: OG_WIDTH },
            font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT_DISPLAY },
        })
            .render()
            .asPng();
        const after = await new OgImageService().render(1, m);
        expect(after.equals(before)).toBe(true);
    });

    it('draws once per id and model within the TTL, again after it', async () => {
        const s = new TestService();
        const first = await s.render(1, model());
        expect(await s.render(1, model())).toBe(first);
        expect(s.draws).toBe(1);

        s.clock += OgImageService.TTL_MS + 1;
        await s.render(1, model());
        expect(s.draws).toBe(2);
    });

    it('draws again when the model changes', async () => {
        const s = new TestService();
        await s.render(1, model('A'));
        await s.render(1, model('B'));
        expect(s.draws).toBe(2);
    });

    it('shares one draw between concurrent requests for the same id', async () => {
        const s = new TestService();
        await Promise.all([s.render(1, model()), s.render(1, model()), s.render(1, model())]);
        expect(s.draws).toBe(1);
    });

    it('keeps one entry per id and at most MAX_ENTRIES of them', async () => {
        const s = new TestService();
        for (let id = 1; id <= OgImageService.MAX_ENTRIES + 50; id++) await s.render(id, model());
        expect((s as any).cache.size).toBe(OgImageService.MAX_ENTRIES);
        // The newest ids are still served from memory.
        const draws = s.draws;
        await s.render(OgImageService.MAX_ENTRIES + 50, model());
        expect(s.draws).toBe(draws);
    });

    it('does not cache a failed draw', async () => {
        const s = new TestService();
        s.fake.renderAsync.mockRejectedValueOnce(new Error('boom'));
        await expect(s.render(1, model())).rejects.toThrow('boom');
        await s.render(1, model());
        expect(s.draws).toBe(1);
    });

    it('answers 503 when the native binding cannot load, and does not retry it', async () => {
        const s = new TestService();
        const load = jest.fn(() => {
            throw new Error('Cannot find module @resvg/resvg-js-linux-x64-musl');
        });
        (s as any).loadBinding = load;
        jest.spyOn((OgImageService as any).logger, 'error').mockImplementation(() => undefined);
        await expect(s.render(1, model())).rejects.toBeInstanceOf(ServiceUnavailableException);
        await expect(s.render(2, model())).rejects.toBeInstanceOf(ServiceUnavailableException);
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('can be imported when the binding is broken (the app still boots)', () => {
        jest.isolateModules(() => {
            jest.doMock('@resvg/resvg-js', () => {
                throw new Error('Error relocating resvgjs.linux-x64-musl.node: symbol not found');
            });
            expect(() => require('./og-image.service')).not.toThrow();
        });
        jest.dontMock('@resvg/resvg-js');
    });
});
