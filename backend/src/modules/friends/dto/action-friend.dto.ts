import { IsInt, IsPositive, NotEquals } from 'class-validator';

export class ActionFriendDto {
    @IsInt()
    @IsPositive()
    friendId: number;
}