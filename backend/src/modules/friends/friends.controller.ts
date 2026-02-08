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
        return await this.friendsService.addFriend(req.user.id, dto);
    }

    @Delete('friends')
    async removeFriend(
        @Request() req,
        @Body() dto: ActionFriendDto
    ) {
        return await this.friendsService.removeFriend(req.user.id, dto);
    }

    @Post('blocks')
    async blockUser(
        @Request() req,
        @Body() dto: BlockUserDto
    ) {
        return await this.friendsService.blockUser(req.user.id, dto);
    }

    @Delete('blocks')
    async unblockUser(
        @Request() req,
        @Body() dto: UnblockUserDto
    ) {
        return await this.friendsService.unblockUser(req.user.id, dto);
    }

    @Get('friends')
    async getFriends(@Query('myId', ParseIntPipe) myId: number) {
        return await this.friendsService.getFriends(myId);
    }

    @Get('blocks')
    async getBlocks(@Query('myId', ParseIntPipe) myId: number) {
        return await this.friendsService.getBlocks(myId);
    }
}