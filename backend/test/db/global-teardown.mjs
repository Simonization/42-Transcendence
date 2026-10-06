import { rmSync } from 'fs';

export default async function globalTeardown() {
    const state = globalThis.__TEST_PG__;
    if (!state) return;
    await state.pg.stop().catch(() => undefined);
    rmSync(state.dir, { recursive: true, force: true });
}
