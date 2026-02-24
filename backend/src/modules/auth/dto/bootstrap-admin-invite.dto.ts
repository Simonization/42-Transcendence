import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class BootstrapAdminInviteDto {
    @IsString()
    @IsNotEmpty()
    secret: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(168)
    expiresInHours?: number;
}
