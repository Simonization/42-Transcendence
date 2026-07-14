import { 
    Controller, Post, Get, Patch, Delete, 
    Body, Param, Query, Req, ParseIntPipe,
    UseGuards 
} from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { GetConversationsDto } from './dto/get-conversations.dto';

// Commands & Queries
import { StartConversationCommand } from './commands/start-conversation.command';
import { SendMessageCommand } from './commands/send-message.command';
import { EditMessageCommand } from './commands/edit-message.command';
import { DeleteMessageCommand } from './commands/delete-message.command';
import { LeaveGroupCommand } from './commands/leave-group.command';
import { MarkReadCommand } from './commands/mark-read.command';
import { GetConversationsQuery } from './queries/get-conversations.query';
import { GetChatHistoryQuery } from './queries/get-chat-history.query';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(
        private readonly startConvCmd: StartConversationCommand,
        private readonly sendMessageCmd: SendMessageCommand,
        private readonly editMessageCmd: EditMessageCommand,
        private readonly deleteMessageCmd: DeleteMessageCommand,
        private readonly leaveGroupCmd: LeaveGroupCommand,
        private readonly markReadCmd: MarkReadCommand,
        private readonly getConvQuery: GetConversationsQuery,
        private readonly getHistoryQuery: GetChatHistoryQuery,
    ) {}

    @Post('rooms')
    async createRoom(@Req() req, @Body() dto: CreateChatDto) {
        const userId = req.user.id || req.user.sub;
        return this.startConvCmd.execute(userId, dto);
    }

    @Get('rooms')
    async getInbox(@Req() req, @Query() dto: GetConversationsDto) {
        const userId = req.user.id || req.user.sub;
        return this.getConvQuery.execute(userId, dto.limit);
    }

    @Get('rooms/:id/messages')
    async getHistory(
        @Param('id', ParseIntPipe) chatId: number, 
        @Query() dto: GetMessagesDto
    ) {
        return this.getHistoryQuery.execute(chatId, dto.limit, dto.offset);
    }

    @Post('messages')
    async sendMessage(@Req() req, @Body() dto: SendMessageDto) {
        const userId = req.user.id || req.user.sub; 
        return this.sendMessageCmd.execute(userId, dto);
    }

    @Patch('messages/:id')
    async editMessage(
        @Req() req, 
        @Param('id', ParseIntPipe) messageId: number, 
        @Body() dto: EditMessageDto
    ) {
        const userId = req.user.id || req.user.sub;
        return this.editMessageCmd.execute(userId, messageId, dto);
    }

    @Delete('messages/:id')
    async deleteMessage(@Req() req, @Param('id', ParseIntPipe) messageId: number) {
        const userId = req.user.id || req.user.sub;
        return this.deleteMessageCmd.execute(userId, messageId);
    }

    @Patch('rooms/:id/read')
    async markAsRead(@Req() req, @Param('id', ParseIntPipe) chatId: number) {
        const userId = req.user.id || req.user.sub;
        return this.markReadCmd.execute(userId, chatId);
    }

    @Delete('rooms/:id/leave')
    async leaveGroup(@Req() req, @Param('id', ParseIntPipe) chatId: number) {
        const userId = req.user.id || req.user.sub;
        return this.leaveGroupCmd.execute(userId, chatId);
    }
}
