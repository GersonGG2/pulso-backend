import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Player } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayerListResponseDto, PlayerResponseDto } from './dto/player-response.dto';
import { SearchPlayersDto } from './dto/search-players.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayerWithRelations } from './players.repository';
import { PlayersService } from './players.service';

@ApiTags('players')
@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  // -----------------------------
  // Authenticated endpoints
  // -----------------------------

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create the authenticated user player profile' })
  @ApiOkResponse({ type: PlayerResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePlayerDto,
  ): Promise<PlayerResponseDto> {
    const player = await this.players.createForUser(userId, dto);
    const full = await this.players.getById(player.id);
    return this.toResponse(full);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user player profile' })
  @ApiOkResponse({ type: PlayerResponseDto })
  async getMine(@CurrentUser('id') userId: string): Promise<PlayerResponseDto> {
    return this.toResponse(await this.players.getByUserId(userId));
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user player profile' })
  @ApiOkResponse({ type: PlayerResponseDto })
  async updateMine(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePlayerDto,
  ): Promise<PlayerResponseDto> {
    return this.toResponse(await this.players.updateMine(userId, dto));
  }

  @Delete('me')
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete the authenticated user player profile' })
  async deleteMine(@CurrentUser('id') userId: string): Promise<void> {
    await this.players.deleteMine(userId);
  }

  // -----------------------------
  // Public talent graph endpoints
  // -----------------------------

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search the public talent graph by role/country/tier/recruitable' })
  @ApiOkResponse({ type: PlayerListResponseDto })
  async search(@Query() query: SearchPlayersDto): Promise<PlayerListResponseDto> {
    const { items, total } = await this.players.search(query);
    return {
      items: items.map((p) => this.toResponse(p)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  @Public()
  @Get('leaderboard')
  @ApiOperation({ summary: 'Public leaderboard ordered by ZScore (desc)' })
  @ApiOkResponse({ type: PlayerListResponseDto })
  async leaderboard(@Query() query: SearchPlayersDto): Promise<PlayerListResponseDto> {
    const { items, total } = await this.players.leaderboard(query);
    return {
      items: items.map((p) => this.toResponse(p)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a public player profile by id' })
  @ApiParam({ name: 'id', example: 'clx_player_1' })
  @ApiOkResponse({ type: PlayerResponseDto })
  async getById(@Param('id') id: string): Promise<PlayerResponseDto> {
    return this.toResponse(await this.players.getById(id));
  }

  // -----------------------------
  // Mappers
  // -----------------------------

  private toResponse(player: PlayerWithRelations): PlayerResponseDto {
    const riot = player.user.riotAccount;
    return {
      id: player.id,
      primaryRole: player.primaryRole,
      secondaryRole: player.secondaryRole,
      country: player.country,
      city: player.city,
      zScore: player.zScore,
      tier: player.tier,
      isPro: player.isPro,
      recruitable: player.recruitable,
      user: {
        id: player.user.id,
        username: player.user.username,
        displayName: player.user.displayName,
        avatarUrl: player.user.avatarUrl,
      },
      riotAccount: riot
        ? {
            gameName: riot.gameName,
            tagLine: riot.tagLine,
            region: riot.region,
            summonerLevel: riot.summonerLevel,
            currentTier: riot.currentTier,
            currentRank: riot.currentRank,
            highestRankEver: riot.highestRankEver,
          }
        : null,
    };
  }
}
