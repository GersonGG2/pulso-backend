import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ReportMatchDto {
  @ApiProperty({
    description: 'Side that won the match',
    enum: ['BLUE', 'RED'],
    example: 'BLUE',
  })
  @IsIn(['BLUE', 'RED'])
  winnerSide!: 'BLUE' | 'RED';
}
