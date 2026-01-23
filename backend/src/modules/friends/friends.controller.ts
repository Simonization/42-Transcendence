import { 
        Controller, 
        Post, 
        Body,
        Delete, 
        ParseIntPipe, 
        Query,
        Get
} from '@nestjs/common';

import { FriendsService } from './friends.service';
import { ActionFriendDto } from './dto/action-friend.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { UnblockUserDto } from './dto/unblock-user.dto';

@Controller('social')
export class FriendsController {
    constructor(private readonly friendsService: FriendsService) {}

    @Post('friends')
    async addFriend(
        @Query('myId', ParseIntPipe) myId: number, 
        @Body() dto: ActionFriendDto
    ) {
        return await this.friendsService.addFriend(myId, dto);
    }

    @Delete('friends')
    async removeFriend(
        @Query('myId', ParseIntPipe) myId: number,
        @Body() dto: ActionFriendDto
    ) {
        return await this.friendsService.removeFriend(myId, dto);
    }

    @Post('blocks')
    async blockUser(
        @Query('myId', ParseIntPipe) myId: number,
        @Body() dto: BlockUserDto
    ) {
        return await this.friendsService.blockUser(myId, dto);
    }

    @Delete('blocks')
    async unblockUser(
        @Query('myId', ParseIntPipe) myId: number,
        @Body() dto: UnblockUserDto
    ) {
        return await this.friendsService.unblockUser(myId, dto);
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