export class Confirm2FACommand {
    constructor(
        public readonly userId: number,
        public readonly code: string
    ) {}
}
