import { IsOptional, IsString, MaxLength, MinLength, IsUUID } from 'class-validator';

export class ChatConversationRequestDto {
  @IsString()
  @MinLength(1, { message: 'question must not be empty' })
  @MaxLength(8000, { message: 'question is too long' })
  question!: string;

  @IsOptional()
  @IsUUID('4', { message: 'sessionId must be a valid UUID' })
  sessionId?: string;
}
