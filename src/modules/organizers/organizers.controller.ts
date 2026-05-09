import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ApplyOrganizerDto } from './dto/apply-organizer.dto';
import {
  OrganizerResponseDto,
  PrivateOrganizerResponseDto,
} from './dto/organizer-response.dto';
import { UpdateOrganizerDto } from './dto/update-organizer.dto';
import { OrganizerWithUser } from './organizers.repository';
import { OrganizersService } from './organizers.service';

class ListOrganizersDto {
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

@ApiTags('organizers')
@Controller('organizers')
export class OrganizersController {
  constructor(private readonly organizers: OrganizersService) {}

  @Post('apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become a tournament organizer (auto-approved in MVP)' })
  @ApiOkResponse({ type: PrivateOrganizerResponseDto })
  async apply(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyOrganizerDto,
  ): Promise<PrivateOrganizerResponseDto> {
    return this.toPrivate(await this.organizers.apply(userId, dto));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user organizer profile' })
  @ApiOkResponse({ type: PrivateOrganizerResponseDto })
  async getMine(@CurrentUser('id') userId: string): Promise<PrivateOrganizerResponseDto> {
    return this.toPrivate(await this.organizers.getByUserId(userId));
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user organizer profile' })
  @ApiOkResponse({ type: PrivateOrganizerResponseDto })
  async updateMine(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrganizerDto,
  ): Promise<PrivateOrganizerResponseDto> {
    return this.toPrivate(await this.organizers.update(userId, dto));
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List verified organizers publicly' })
  async list(@Query() query: ListOrganizersDto) {
    const { items, total } = await this.organizers.list(query);
    return {
      items: items.map((o) => this.toPublic(o)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a public organizer profile by id' })
  @ApiOkResponse({ type: OrganizerResponseDto })
  async getById(@Param('id') id: string): Promise<OrganizerResponseDto> {
    return this.toPublic(await this.organizers.getById(id));
  }

  // Mappers

  private toPublic(o: OrganizerWithUser): OrganizerResponseDto {
    return {
      id: o.id,
      organizationName: o.organizationName,
      contactEmail: o.contactEmail,
      contactPhone: o.contactPhone,
      website: o.website,
      verified: o.verified,
      createdAt: o.createdAt,
      user: o.user,
    };
  }

  private toPrivate(o: OrganizerWithUser): PrivateOrganizerResponseDto {
    return { ...this.toPublic(o), rfc: o.rfc };
  }
}
