import { ApiProperty } from '@nestjs/swagger';
import { Length, Matches } from 'class-validator';

const E164_REGEX = /^\+[1-9]\d{7,14}$/;
const CODE_REGEX = /^\d{4,8}$/;

export class VerifySmsDto {
  @ApiProperty({ example: '+525512345678' })
  @Matches(E164_REGEX, {
    message: 'phoneNumber must be in E.164 format (e.g. +525512345678)',
  })
  phoneNumber!: string;

  @ApiProperty({ example: '123456', minLength: 4, maxLength: 8 })
  @Length(4, 8)
  @Matches(CODE_REGEX, { message: 'code must be 4–8 digits' })
  code!: string;
}

export class VerifySmsResponseDto {
  @ApiProperty({ example: true })
  verified!: boolean;
}
