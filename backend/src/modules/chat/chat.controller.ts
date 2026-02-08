import { 
    Controller, Post, Get, Patch, Delete, 
    Body, Param, Query, Req, ParseIntPipe 
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

@Controller('chat')
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
        return this.startConvCmd.execute(req.user.id, dto);
    }

    @Get('rooms')
    async getInbox(@Req() req, @Query() dto: GetConversationsDto) {
        return this.getConvQuery.execute(req.user.id, dto.limit);
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
        return this.sendMessageCmd.execute(req.user.id, dto);
    }

    @Patch('messages/:id')
    async editMessage(
        @Req() req, 
        @Param('id', ParseIntPipe) messageId: number, 
        @Body() dto: EditMessageDto
    ) {
        return this.editMessageCmd.execute(req.user.id, messageId, dto);
    }

    @Delete('messages/:id')
    async deleteMessage(@Req() req, @Param('id', ParseIntPipe) messageId: number) {
        return this.deleteMessageCmd.execute(req.user.id, messageId);
    }

    @Patch('rooms/:id/read')
    async markAsRead(@Req() req, @Param('id', ParseIntPipe) chatId: number) {
        return this.markReadCmd.execute(req.user.id, chatId);
    }

    @Delete('rooms/:id/leave')
    async leaveGroup(@Req() req, @Param('id', ParseIntPipe) chatId: number) {
        return this.leaveGroupCmd.execute(req.user.id, chatId);
    }
}