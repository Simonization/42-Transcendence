import { Controller, Get, Header, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetPublicTournamentQuery } from './get-public-tournament.query';
import { OgImageService } from './og-image.service';
import { ogModelOf } from './og-image';
import { buildSharePage, shareUrls } from './share-page';
import { resolveBaseUrl } from './base-url';

/**
 * Anonymous, read-only tournament data. Deliberately no JwtAuthGuard: these routes are for
 * people (and link crawlers) who have no account. The app registers no global guard or
 * throttler, so nothing else stands in the way; the PNG is memoised (og-image.service.ts).
 */
@Controller('public/tournaments')
export class PublicTournamentsController {
    constructor(private readonly query: GetPublicTournamentQuery) {}

    /** Tournament, phases, matches, standings and podium. See public-tournament.view.ts. */
    @Get(':id')
    @Header('Cache-Control', 'public, max-age=15')
    get(@Param('id', ParseIntPipe) id: number) {
        return this.query.execute(id);
    }
}

/** What a link unfurler fetches when someone pastes a tournament link. */
@Controller('share/t')
export class ShareController {
    constructor(
        private readonly query: GetPublicTournamentQuery,
        private readonly images: OgImageService,
        private readonly config: ConfigService,
    ) {}

    /** HTML with the og:/twitter: tags; humans are redirected to /t/:id. */
    @Get(':id')
    @Header('Content-Type', 'text/html; charset=utf-8')
    @Header('Cache-Control', 'public, max-age=300')
    @Header('X-Content-Type-Options', 'nosniff')
    async page(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: { headers: Record<string, string | string[] | undefined> },
    ) {
        const tournament = await this.query.execute(id);
        const base = resolveBaseUrl(req.headers, this.config.get<string>('PUBLIC_BASE_URL'));
        return buildSharePage(tournament, shareUrls(base, id));
    }

    /** The 1200x630 preview card. */
    @Get(':id/og.png')
    @Header('Content-Type', 'image/png')
    @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    @Header('X-Content-Type-Options', 'nosniff')
    async image(@Param('id', ParseIntPipe) id: number) {
        const tournament = await this.query.execute(id);
        return this.images.render(id, ogModelOf(tournament));
    }
}
