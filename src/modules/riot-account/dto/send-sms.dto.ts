import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export class SendSmsDto {
  @ApiProperty({
    description: 'Phone number in E.164 format (+ country code, then digits, no spaces)',
    example: '+525512345678',
    pattern: '^\\+[1-9]\\d{7,14}$',
  })
  @Matches(E164_REGEX, {
    message: 'phoneNumber must be in E.164 format (e.g. +525512345678)',
  })
  phoneNumber!: string;
}

export class SendSmsResponseDto {
  @ApiProperty({ example: 'pending' })
  status!: 'pending' | 'approved' | 'canceled';

  @ApiProperty({
    description: 'Set in development mode only — production never returns the code',
    required: false,
    example: '123456',
  })
  devCode?: string;
}
