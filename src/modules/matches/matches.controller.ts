import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ReportMatchDto } from './dto/report-match.dto';
import { MatchListResponseDto, MatchResponseDto } from './dto/match-response.dto';
import { MatchWithParticipants } from './matches.repository';
import { MatchesService } from './matches.service';

@ApiTags('matches')
@Controller()
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post('tournaments/:tournamentId/start')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate the round-1 bracket and transition the tournament to IN_PROGRESS',
  })
  async start(
    @CurrentUser('id') userId: string,
    @Param('tournamentId') tournamentId: string,
  ): Promise<MatchListResponseDto> {
    const items = await this.matches.startTournament(userId, tournamentId);
    return {
      items: items.map((m) => this.toResponse(m)),
      total: items.length,
    };
  }

  @Public()
  @Get('tournaments/:tournamentId/matches')
  @ApiOperation({ summary: 'List all matches (the bracket) for a tournament' })
  @ApiOkResponse({ type: MatchListResponseDto })
  async list(@Param('tournamentId') tournamentId: string): Promise<MatchListResponseDto> {
    const items = await this.matches.listForTournament(tournamentId);
    return {
      items: items.map((m) => this.toResponse(m)),
      total: items.length,
    };
  }

  @Public()
  @Get('matches/:id')
  @ApiOperation({ summary: 'Get a single match by id' })
  async getById(@Param('id') id: string): Promise<MatchResponseDto> {
    return this.toResponse(await this.matches.getById(id));
  }

  @Post('matches/:id/report')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report match winner side (organizer only)' })
  async report(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReportMatchDto,
  ): Promise<MatchResponseDto> {
    return this.toResponse(await this.matches.report(userId, id, dto));
  }

  private toResponse(match: MatchWithParticipants): MatchResponseDto {
    return {
      id: match.id,
      tournamentId: match.tournamentId,
      round: match.round,
      bracketPosition: match.bracketPosition,
      status: match.status,
      scheduledAt: match.scheduledAt,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      riotMatchId: match.riotMatchId,
      tournamentCode: match.tournamentCode,
      winnerSide: match.winnerSide,
      participants: match.participants.map((p) => ({
        id: p.id,
        side: p.side,
        role: p.role,
        championPlayed: p.championPlayed,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        cs: p.cs,
        visionScore: p.visionScore,
        goldEarned: p.goldEarned,
        damageDealt: p.damageDealt,
        goldDiff15: p.goldDiff15,
        csPerMin: p.csPerMin,
        win: p.win,
        zScoreDelta: p.zScoreDelta,
        player: {
          id: p.player.id,
          username: p.player.user.username,
          displayName: p.player.user.displayName,
        },
      })),
    };
  }
}
