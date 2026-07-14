import { 
        Controller, 
        Post, 
        Body,
        Delete, 
        ParseIntPipe, 
        Query,
        Get,
        UseGuards,
        Request
} from '@nestjs/common';

import { FriendsService } from './friends.service';
import { ActionFriendDto } from './dto/action-friend.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { UnblockUserDto } from './dto/unblock-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class FriendsController {
    constructor(private readonly friendsService: FriendsService) {}

    @Post('friends')
    async addFriend(
        @Request() req,
        @Body() dto: ActionFriendDto
    ) {
        const userId = req.user.id || req.user.sub;
        try {
            const result = await this.friendsService.addFriend(userId, dto);
            return result;
        } catch (e) {
            console.error('[FriendsController] ADD FRIEND ERROR:', e.message);
            throw e;
        }
    }

    @Delete('friends')
    async removeFriend(
        @Request() req,
        @Body() dto: ActionFriendDto
    ) {
        const userId = req.user.id || req.user.sub;
        return await this.friendsService.removeFriend(userId, dto);
    }

    @Post('blocks')
    async blockUser(
        @Request() req,
        @Body() dto: BlockUserDto
    ) {
        const userId = req.user.id || req.user.sub;
        return await this.friendsService.blockUser(userId, dto);
    }

    @Delete('blocks')
    async unblockUser(
        @Request() req,
        @Body() dto: UnblockUserDto
    ) {
        const userId = req.user.id || req.user.sub;
        return await this.friendsService.unblockUser(userId, dto);
    }

    @Get('friends')
    async getFriends(@Request() req) {
        const userId = req.user.id || req.user.sub;
        return await this.friendsService.getFriends(userId);
    }

    @Get('blocks')
    async getBlocks(@Request() req) {
        const userId = req.user.id || req.user.sub;
        return await this.friendsService.getBlocks(userId);
    }
}