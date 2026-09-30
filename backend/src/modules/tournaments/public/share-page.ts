/**
 * The tiny HTML page link-unfurlers read (Discord, Slack, WhatsApp, X do not run JavaScript, so
 * the SPA cannot set per-tournament meta tags). Humans who land on it are sent on to the real
 * page at once. Every tournament-supplied string goes through `escapeHtml`.
 */

import { escapeHtml } from './escape-html';
import { PublicTournament } from './public-tournament.view';

export const SITE_NAME = 'Esportendence';

const STATUS_PHRASE: Record<string, string> = {
    REGISTRATION_OPEN: 'Registration open',
    ONGOING: 'Live now',
    COMPLETED: 'Completed',
};

/** "Live now - 8 teams", "Completed - 8 teams - Winner: Blues", ... */
export function describeTournament(t: PublicTournament): string {
    const teams = t.seeding.teams.length;
    const parts = [
        STATUS_PHRASE[t.status] ?? t.status,
        `${teams} ${teams === 1 ? 'team' : 'teams'}`,
    ];
    if (t.podium) parts.push(`Winner: ${t.podium.first.name}`);
    return parts.join(' \u00b7 ');
}

export interface SharePageUrls {
    /** Absolute URL of the human page, `<base>/t/<id>`. */
    page: string;
    /** Absolute URL of the card, `<base>/api/share/t/<id>/og.png`. */
    image: string;
    /** Where the redirect goes; relative so it works on whatever host served this page. */
    redirect: string;
}

export function shareUrls(baseUrl: string, id: number): SharePageUrls {
    return {
        page: `${baseUrl}/t/${id}`,
        image: `${baseUrl}/api/share/t/${id}/og.png`,
        redirect: `/t/${id}`,
    };
}

export function buildSharePage(t: PublicTournament, urls: SharePageUrls): string {
    const title = escapeHtml(`${t.name} \u2014 ${SITE_NAME}`);
    const description = escapeHtml(describeTournament(t));
    const alt = escapeHtml(`${t.name} on ${SITE_NAME}`);
    const page = escapeHtml(urls.page);
    const image = escapeHtml(urls.image);
    const redirect = escapeHtml(urls.redirect);

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${page}">
<meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<link rel="canonical" href="${page}">
<meta http-equiv="refresh" content="0;url=${redirect}">
<script>location.replace(${JSON.stringify(urls.redirect).replace(/</g, '\\u003c')});</script>
</head>
<body>
<p><a href="${redirect}">${title}</a></p>
</body>
</html>
`;
}
