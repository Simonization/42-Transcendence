import { Repository } from "typeorm";
import { InvitationStatus, TeamInvitation } from "../entities/team-invitation.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";

@Injectable()
export class GetMyInvitationsQuery {
    constructor(
        @InjectRepository(TeamInvitation) 
        private inviteRepo: Repository<TeamInvitation>
    ) {}

    async execute(userId: number) {
        return await this.inviteRepo.find({
            where: { 
                receiver_id: userId, 
                status: InvitationStatus.PENDING 
            },
            relations: ['team', 'sender'] // So the user knows who invited them to what
        });
    }
}