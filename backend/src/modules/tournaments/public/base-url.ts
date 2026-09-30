/**
 * The site's public origin ("https://host", no trailing slash) for the absolute URLs link
 * unfurlers need. `PUBLIC_BASE_URL` wins when set; otherwise it is read from the request, where
 * the reverse proxy passes the original host and scheme along. A host that does not look like a
 * hostname is ignored rather than echoed back into the page.
 */

const HOST_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i;

type HeaderValue = string | string[] | undefined;

const first = (v: HeaderValue): string | undefined => {
    const raw = Array.isArray(v) ? v[0] : v;
    return raw?.split(',')[0]?.trim() || undefined;
};

export function resolveBaseUrl(headers: Record<string, HeaderValue>, configured?: string | null): string {
    if (configured) {
        try {
            const u = new URL(configured);
            if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin;
        } catch {
            // fall through to the request
        }
    }
    const host = first(headers['x-forwarded-host']) ?? first(headers['host']);
    const proto = first(headers['x-forwarded-proto']);
    if (!host || !HOST_PATTERN.test(host)) return 'http://localhost';
    const plain = proto ? proto === 'http' : /^(localhost|127\.)/.test(host);
    return `${plain ? 'http' : 'https'}://${host}`;
}
