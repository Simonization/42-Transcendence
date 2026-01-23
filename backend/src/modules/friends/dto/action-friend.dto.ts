import {
    IsInt,
    IsPositive
} from 'class-validator';

export class ActionFriendDto {
    @IsInt()
    @IsPositive()
    friendId: number;
}