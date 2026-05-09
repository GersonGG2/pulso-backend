import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Public } from '../auth/decorators/public.decorator';
import {
  ZScoreEventListResponseDto,
  ZScoreEventResponseDto,
} from './dto/zscore-event-response.dto';
import { ZScoreService } from './zscore.service';

class ListZScoreEventsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}

@ApiTags('zscore')
@Controller('players/:playerId/zscore')
export class ZScoreController {
  constructor(private readonly zscore: ZScoreService) {}

  @Public()
  @Get('history')
  @ApiOperation({ summary: 'Public ZScore event history for a player' })
  @ApiOkResponse({ type: ZScoreEventListResponseDto })
  async history(
    @Param('playerId') playerId: string,
    @Query() query: ListZScoreEventsDto,
  ): Promise<ZScoreEventListResponseDto> {
    const { items, total } = await this.zscore.listEventsForPlayer(playerId, query);
    return {
      items: items.map(
        (e): ZScoreEventResponseDto => ({
          id: e.id,
          playerId: e.playerId,
          source: e.source,
          delta: e.delta,
          newScore: e.newScore,
          matchId: e.matchId,
          tournamentId: e.tournamentId,
          metadata: (e.metadata as Record<string, unknown> | null) ?? null,
          createdAt: e.createdAt,
        }),
      ),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
