import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import {
  RegistrationListResponseDto,
  RegistrationResponseDto,
} from './dto/registration-response.dto';
import { RegistrationWithRelations } from './tournament-registrations.repository';
import { TournamentRegistrationsService } from './tournament-registrations.service';

class ListRegistrationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}

@ApiTags('tournament-registrations')
@Controller('tournaments/:tournamentId/registrations')
export class TournamentRegistrationsController {
  constructor(private readonly service: TournamentRegistrationsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register self (solo) or team (captain) to a tournament' })
  @ApiOkResponse({ type: RegistrationResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Param('tournamentId') tournamentId: string,
    @Body() dto: CreateRegistrationDto,
  ): Promise<RegistrationResponseDto> {
    return this.toResponse(await this.service.create(userId, tournamentId, dto));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my active registration in this tournament (or null)' })
  async getMine(
    @CurrentUser('id') userId: string,
    @Param('tournamentId') tournamentId: string,
  ): Promise<RegistrationResponseDto | null> {
    const reg = await this.service.getMine(userId, tournamentId);
    return reg ? this.toResponse(reg) : null;
  }

  @Delete(':registrationId')
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Withdraw from the tournament (player or team captain)' })
  async withdraw(
    @CurrentUser('id') userId: string,
    @Param('tournamentId') tournamentId: string,
    @Param('registrationId') registrationId: string,
  ): Promise<void> {
    await this.service.withdraw(userId, tournamentId, registrationId);
  }

  @Post(':registrationId/check-in')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check in (CONFIRMED → CHECKED_IN)' })
  async checkIn(
    @CurrentUser('id') userId: string,
    @Param('tournamentId') tournamentId: string,
    @Param('registrationId') registrationId: string,
  ): Promise<RegistrationResponseDto> {
    return this.toResponse(await this.service.checkIn(userId, tournamentId, registrationId));
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List registrations for this tournament publicly' })
  @ApiOkResponse({ type: RegistrationListResponseDto })
  async list(
    @Param('tournamentId') tournamentId: string,
    @Query() query: ListRegistrationsDto,
  ): Promise<RegistrationListResponseDto> {
    const { items, total } = await this.service.list(tournamentId, query);
    return {
      items: items.map((r) => this.toResponse(r)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  private toResponse(r: RegistrationWithRelations): RegistrationResponseDto {
    return {
      id: r.id,
      tournamentId: r.tournamentId,
      status: r.status,
      player: r.player
        ? {
            id: r.player.id,
            username: r.player.user.username,
            displayName: r.player.user.displayName,
          }
        : null,
      team: r.team ? { id: r.team.id, name: r.team.name, tag: r.team.tag } : null,
      paidAt: r.paidAt,
      checkedInAt: r.checkedInAt,
      registeredAt: r.registeredAt,
    };
  }
}
