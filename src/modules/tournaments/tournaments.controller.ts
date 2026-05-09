import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { SearchTournamentsDto } from './dto/search-tournaments.dto';
import {
  TournamentListResponseDto,
  TournamentResponseDto,
} from './dto/tournament-response.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentWithOrganizer } from './tournaments.repository';
import { TournamentsService } from './tournaments.service';

@ApiTags('tournaments')
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  // -----------------------------
  // Authenticated (organizer)
  // -----------------------------

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tournament in DRAFT status (organizer only)' })
  @ApiOkResponse({ type: TournamentResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTournamentDto,
  ): Promise<TournamentResponseDto> {
    return this.toResponse(await this.tournaments.create(userId, dto));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a DRAFT tournament (owner organizer only)' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
  ): Promise<TournamentResponseDto> {
    return this.toResponse(await this.tournaments.update(userId, id, dto));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a DRAFT tournament (owner only)' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.tournaments.delete(userId, id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a DRAFT tournament (owner only)' })
  async publish(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<TournamentResponseDto> {
    return this.toResponse(await this.tournaments.publish(userId, id));
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a tournament in any non-COMPLETED status (owner only)' })
  async cancel(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<TournamentResponseDto> {
    return this.toResponse(await this.tournaments.cancel(userId, id));
  }

  // -----------------------------
  // Public
  // -----------------------------

  @Public()
  @Get()
  @ApiOperation({ summary: 'List tournaments publicly with filters' })
  @ApiOkResponse({ type: TournamentListResponseDto })
  async list(@Query() query: SearchTournamentsDto): Promise<TournamentListResponseDto> {
    const { items, total } = await this.tournaments.search(query);
    return {
      items: items.map((t) => this.toResponse(t)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  @Public()
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get a tournament by slug (SEO-friendly URLs)' })
  async getBySlug(@Param('slug') slug: string): Promise<TournamentResponseDto> {
    return this.toResponse(await this.tournaments.getBySlug(slug));
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a tournament by id' })
  async getById(@Param('id') id: string): Promise<TournamentResponseDto> {
    return this.toResponse(await this.tournaments.getById(id));
  }

  // -----------------------------
  // Mappers
  // -----------------------------

  private toResponse(t: TournamentWithOrganizer): TournamentResponseDto {
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      bannerUrl: t.bannerUrl,
      format: t.format,
      modality: t.modality,
      bracketType: t.bracketType,
      status: t.status,
      region: t.region,
      minTier: t.minTier,
      maxTier: t.maxTier,
      maxParticipants: t.maxParticipants,
      entryFeeMxnCents: t.entryFeeMxnCents,
      prizePool: (t.prizePoolJson as Record<string, unknown> | null) ?? null,
      registrationOpensAt: t.registrationOpensAt,
      registrationClosesAt: t.registrationClosesAt,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      rulesetVersion: t.rulesetVersion,
      createdAt: t.createdAt,
      organizer: {
        id: t.organizer.id,
        organizationName: t.organizer.organizationName,
        verified: t.organizer.verified,
      },
    };
  }
}
