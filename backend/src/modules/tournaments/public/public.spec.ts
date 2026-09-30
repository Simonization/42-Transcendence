import { NotFoundException } from '@nestjs/common';
import { computePodium, placementOf } from './podium';
import { buildPublicTournament } from './public-tournament.view';
import { GetPublicTournamentQuery } from './get-public-tournament.query';
import { buildSharePage, describeTournament, shareUrls } from './share-page';
import { buildOgSvg, displayText, ogModelOf, wrapTitle } from './og-image';
import { OgImageService } from './og-image.service';
import { resolveBaseUrl } from './base-url';

const SECRET_MAIL = 'captain.secret@example.org';

const user = (id: number) => ({
    id,
    username: `user${id}`,
    mail: SECRET_MAIL,
    passwordHash: 'hash',
    firstName: 'Firstname',
    avatarUrl: 'http://x/a.png',
});

const team = (id: number, name: string, status = 'ARCHIVED') => ({
    id,
    name,
    status,
    captain_id: 1,
    captain: user(1),
    members: [user(1), user(2)],
    admins: [{ userId: 2 }],
    join_code: 'SECRETCODE',
});

const match = (over: any) => ({
    id: 0,
    phase_id: 1,
    round_order: 1,
    group_index: null,
    status: 'FINISHED',
    team1_id: null,
    team2_id: null,
    team1: null,
    team2: null,
    team1_score: null,
    team2_score: null,
    winner_id: null,
    score: null,
    winner_next_match_id: null,
    winner_next_match_slot: null,
    reported_by_team_id: 99,
    reported_at: new Date(),
    finished_at: new Date('2026-09-01'),
    created_at: new Date('2026-08-01'),
    game_data: { walkover: true, secretNote: 'do not leak', group: 'A' },
    ...over,
});

/** Four-team single elimination: two semi-finals, one final. */
function knockout(status = 'COMPLETED', over: any = {}): any {
    const A = team(1, 'Alpha');
    const B = team(2, 'Bravo');
    const C = team(3, 'Charlie');
    const D = team(4, 'Delta');
    const DRAFT = team(9, 'Draft Squad', 'DRAFT');
    const final = match({
        id: 3, round_order: 2, team1_id: 1, team2_id: 3, team1: A, team2: C,
        team1_score: 2, team2_score: 0, winner_id: 1, score: '2-0',
    });
    const semi1 = match({
        id: 1, round_order: 1, team1_id: 1, team2_id: 4, team1: A, team2: D,
        team1_score: 2, team2_score: 1, winner_id: 1, winner_next_match_id: 3, winner_next_match_slot: 1,
    });
    const semi2 = match({
        id: 2, round_order: 1, team1_id: 2, team2_id: 3, team1: B, team2: C,
        team1_score: 0, team2_score: 2, winner_id: 3, winner_next_match_id: 3, winner_next_match_slot: 2,
    });
    return {
        id: 7,
        name: 'Autumn Cup',
        description: 'Open cup for everyone',
        status,
        max_participants: 8,
        scheduledAt: null,
        finished_at: null,
        createdAt: new Date('2026-07-01'),
        seed_order: [1, 2, 3, 4],
        active_phase_id: 1,
        phases: [{
            id: 1, order: 1, type: 'SINGLE_ELIMINATION', game_id: 1, tournament_id: 7,
            game: { id: 1, name: 'Pong', teamSize: 2, teamCount: 2, createdAt: new Date() },
            teams_limit_start: null, teams_limit_end: null, swiss_rounds: null, group_size: null, group_winners_count: null,
            matches: [semi1, semi2, final],
        }],
        teams: [A, B, C, D, DRAFT],
        ...over,
    };
}

describe('podium', () => {
    const names = new Map([[1, 'Alpha'], [2, 'Bravo'], [3, 'Charlie'], [4, 'Delta']]);
    const nameOf = (id: number) => names.get(id) ?? `#${id}`;
    const input = (over: any = {}) => {
        const t = knockout();
        return {
            status: 'COMPLETED',
            phases: t.phases.map((p: any) => ({ order: p.order, type: p.type, matches: p.matches })),
            seedOrder: [1, 2, 3, 4],
            ...over,
        };
    };

    it('is null until the tournament is COMPLETED', () => {
        expect(computePodium(input({ status: 'ONGOING' }), nameOf)).toBeNull();
    });

    it('takes 1st/2nd from the final and 3rd from the semi-final losers', () => {
        const podium = computePodium(input(), nameOf)!;
        expect(podium.first).toEqual({ teamId: 1, name: 'Alpha' });
        expect(podium.second).toEqual({ teamId: 3, name: 'Charlie' });
        // Delta lost semi 1, Bravo lost semi 2: they share third, best seed first.
        expect(podium.third.map((t) => t.teamId)).toEqual([2, 4]);
    });

    it('ignores byes: a bye has no loser', () => {
        const base = input();
        const phases = [{
            order: 1, type: 'SINGLE_ELIMINATION',
            matches: [
                match({ id: 1, round_order: 1, status: 'BYE', team1_id: 1, team2_id: null, winner_id: 1, winner_next_match_id: 3 }),
                match({ id: 2, round_order: 1, team1_id: 2, team2_id: 3, winner_id: 2, winner_next_match_id: 3 }),
                match({ id: 3, round_order: 2, team1_id: 1, team2_id: 2, winner_id: 1 }),
            ],
        }];
        const podium = computePodium({ ...base, phases }, nameOf)!;
        expect(podium.third.map((t) => t.teamId)).toEqual([3]);
    });

    it('ranks a single group by its table when there is no knockout', () => {
        const phases = [{ order: 1, type: 'ROUND_ROBIN', matches: [match({ id: 1, team1_id: 1, team2_id: 2 })] }];
        const standings = [{ phaseOrder: 1, groups: [{ rows: [{ teamId: 2 }, { teamId: 1 }, { teamId: 3 }] }] }];
        const podium = computePodium({ status: 'COMPLETED', phases, standings }, nameOf)!;
        expect([podium.first.teamId, podium.second?.teamId, podium.third[0].teamId]).toEqual([2, 1, 3]);

        const two = [{ phaseOrder: 1, groups: [{ rows: [{ teamId: 1 }] }, { rows: [{ teamId: 2 }] }] }];
        expect(computePodium({ status: 'COMPLETED', phases, standings: two }, nameOf)).toBeNull();
    });

    it('places each team', () => {
        const podium = computePodium(input(), nameOf);
        expect(placementOf('COMPLETED', podium, 1)).toEqual({ place: 1, outcome: 'champion' });
        expect(placementOf('COMPLETED', podium, 3)).toEqual({ place: 2, outcome: 'finalist' });
        expect(placementOf('COMPLETED', podium, 4)).toEqual({ place: 3, outcome: 'semifinalist' });
        expect(placementOf('COMPLETED', podium, 77)).toEqual({ place: null, outcome: 'eliminated' });
        expect(placementOf('ONGOING', null, 1).outcome).toBe('in_progress');
        expect(placementOf('REGISTRATION_OPEN', null, 1).outcome).toBe('registered');
    });
});

describe('public tournament view', () => {
    const view = buildPublicTournament(knockout());
    const json = JSON.stringify(view);

    it('exposes no emails, users, invite codes, password data or report metadata', () => {
        expect(json).not.toContain(SECRET_MAIL);
        for (const leak of ['mail', 'passwordHash', 'join_code', 'SECRETCODE', 'username', 'captain', 'members', 'admins',
            'avatarUrl', 'reported_by', 'reported_at', 'secretNote', 'Firstname']) {
            expect(json).not.toContain(leak);
        }
    });

    it('lists exactly the whitelisted match fields', () => {
        expect(Object.keys(view.phases[0].matches[0]).sort()).toEqual([
            'created_at', 'finished_at', 'game_data', 'group_index', 'id', 'phase_id', 'round_order', 'score', 'status',
            'team1', 'team1_id', 'team1_score', 'team2', 'team2_id', 'team2_score', 'winner_id',
            'winner_next_match_id', 'winner_next_match_slot',
        ]);
        expect(Object.keys(view.phases[0].matches[0].team1!).sort()).toEqual(['id', 'name']);
        expect(view.phases[0].matches[0].game_data).toEqual({ walkover: true, group: 'A' });
    });

    it('hides draft teams but keeps locked and archived ones', () => {
        expect(view.teams.map((t) => t.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
        expect(json).not.toContain('Draft Squad');
        expect(Object.keys(view.teams[0]).sort()).toEqual(['id', 'name', 'status']);
    });

    it('carries the podium only once completed', () => {
        expect(view.podium?.first.name).toBe('Alpha');
        expect(buildPublicTournament(knockout('ONGOING')).podium).toBeNull();
    });
});

describe('GetPublicTournamentQuery', () => {
    const repoWith = (t: any) => ({ findOne: jest.fn().mockResolvedValue(t) }) as any;

    it('returns the view', async () => {
        const out = await new GetPublicTournamentQuery(repoWith(knockout())).execute(7);
        expect(out.name).toBe('Autumn Cup');
    });

    it('404s on an unknown id and on a DRAFT tournament', async () => {
        await expect(new GetPublicTournamentQuery(repoWith(null)).execute(1)).rejects.toBeInstanceOf(NotFoundException);
        await expect(new GetPublicTournamentQuery(repoWith(knockout('DRAFT'))).execute(7)).rejects.toBeInstanceOf(NotFoundException);
    });
});

describe('share page', () => {
    const urls = shareUrls('https://example.test', 7);

    it('has the og and twitter tags, the image and a redirect to /t/:id', () => {
        const html = buildSharePage(buildPublicTournament(knockout()), urls);
        expect(html).toContain('<meta property="og:title" content="Autumn Cup');
        expect(html).toContain('<meta property="og:description" content="Completed');
        expect(html).toContain('Winner: Alpha');
        expect(html).toContain('<meta property="og:image" content="https://example.test/api/share/t/7/og.png">');
        expect(html).toContain('<meta property="og:url" content="https://example.test/t/7">');
        expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
        expect(html).toContain('<meta http-equiv="refresh" content="0;url=/t/7">');
        expect(html).toContain('location.replace("/t/7")');
    });

    it('escapes tournament and team names', () => {
        const evil = '"><script>alert(1)</script>&\'';
        const t = knockout('COMPLETED', { name: evil });
        t.teams[0].name = evil;
        t.phases[0].matches.forEach((m: any) => { if (m.team1?.id === 1) m.team1.name = evil; if (m.team2?.id === 1) m.team2.name = evil; });
        const html = buildSharePage(buildPublicTournament(t), urls);
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).not.toContain(evil);
        expect(html).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;&#39;');
    });

    it('describes each status', () => {
        expect(describeTournament(buildPublicTournament(knockout('ONGOING')))).toBe('Live now · 4 teams');
        expect(describeTournament(buildPublicTournament(knockout()))).toBe('Completed · 4 teams · Winner: Alpha');
    });

    it('resolves the public origin from config or the proxy headers, never from junk', () => {
        expect(resolveBaseUrl({ host: 'a.test' }, 'https://cfg.test/x')).toBe('https://cfg.test');
        expect(resolveBaseUrl({ host: 'internal:3000', 'x-forwarded-host': 'site.test', 'x-forwarded-proto': 'https' })).toBe('https://site.test');
        expect(resolveBaseUrl({ host: 'localhost:3000' })).toBe('http://localhost:3000');
        expect(resolveBaseUrl({ host: '"><script>' })).toBe('http://localhost');
    });
});

describe('og image', () => {
    it('builds an SVG that contains no raw user markup and only drawable characters', () => {
        const evil = '<script>alert(1)</script> & 中文';
        const t = knockout('COMPLETED', { name: evil });
        t.teams[0].name = evil;
        const svg = buildOgSvg(ogModelOf(buildPublicTournament(t)));
        expect(svg).not.toContain('<script>');
        expect(svg).toContain('&lt;SCRIPT&gt;');
        expect(svg).not.toContain('中');
    });

    it('shows the podium when completed and the top seeds otherwise', () => {
        expect(ogModelOf(buildPublicTournament(knockout())).rows.map((r) => r.tag)).toEqual(['CHAMPION', 'FINALIST', 'SEMI-FINAL', 'SEMI-FINAL']);
        const live = ogModelOf(buildPublicTournament(knockout('ONGOING')));
        expect(live.rows.map((r) => r.tag)).toEqual(['SEED', 'SEED', 'SEED', 'SEED']);
        expect(live.statusLabel).toBe('LIVE');
    });

    it('truncates and wraps long names', () => {
        expect(displayText('x'.repeat(50), 10)).toHaveLength(10);
        expect(wrapTitle('The Very Long Tournament Name That Goes On', 22).length).toBeLessThanOrEqual(2);
    });

    it('renders a real 1200x630 PNG and memoises it', () => {
        const service = new OgImageService();
        const model = ogModelOf(buildPublicTournament(knockout()));
        const png = service.render(7, model);
        expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect(png.readUInt32BE(16)).toBe(1200);
        expect(png.readUInt32BE(20)).toBe(630);
        expect(service.render(7, model)).toBe(png);
        expect(service.render(7, { ...model, title: 'Renamed' })).not.toBe(png);
    });
});
