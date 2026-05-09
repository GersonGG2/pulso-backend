import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Prisma, TournamentStatus } from '@prisma/client';
import { OrganizersRepository } from '../organizers/organizers.repository';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { SearchTournamentsDto } from './dto/search-tournaments.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentWithOrganizer, TournamentsRepository } from './tournaments.repository';
import { randomSlugSuffix, slugify } from './tournaments.utils';

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(
    private readonly tournaments: TournamentsRepository,
    private readonly organizers: OrganizersRepository,
  ) {}

  async getById(id: string): Promise<TournamentWithOrganizer> {
    const t = await this.tournaments.findById(id);
    if (!t) throw new NotFoundException(`Tournament ${id} not found`);
    return t;
  }

  async getBySlug(slug: string): Promise<TournamentWithOrganizer> {
    const t = await this.tournaments.findBySlug(slug);
    if (!t) throw new NotFoundException(`Tournament "${slug}" not found`);
    return t;
  }

  async create(userId: string, dto: CreateTournamentDto): Promise<TournamentWithOrganizer> {
    const organizer = await this.organizers.findByUserId(userId);
    if (!organizer) {
      throw new PreconditionFailedException(
        'You must apply as organizer before creating tournaments',
      );
    }
    if (!organizer.verified) {
      throw new ForbiddenException('Organizer profile not verified yet');
    }

    this.assertDateOrder(dto.registrationOpensAt, dto.registrationClosesAt, dto.startsAt);

    if (dto.minTier && dto.maxTier) {
      this.assertTierOrder(dto.minTier, dto.maxTier);
    }

    const slug = await this.uniqueSlug(dto.name);

    const created = await this.tournaments.create({
      organizer: { connect: { id: organizer.id } },
      name: dto.name,
      slug,
      description: dto.description,
      bannerUrl: dto.bannerUrl ?? null,
      format: dto.format,
      modality: dto.modality,
      bracketType: dto.bracketType,
      region: dto.region,
      minTier: dto.minTier ?? null,
      maxTier: dto.maxTier ?? null,
      maxParticipants: dto.maxParticipants,
      entryFeeMxnCents: dto.entryFeeMxnCents ?? 0,
      prizePoolJson: (dto.prizePool ?? undefined) as Prisma.InputJsonValue | undefined,
      registrationOpensAt: dto.registrationOpensAt,
      registrationClosesAt: dto.registrationClosesAt,
      startsAt: dto.startsAt,
      rulesetVersion: dto.rulesetVersion,
      status: TournamentStatus.DRAFT,
    });

    this.logger.log(
      `Tournament created: ${created.id} (slug=${slug}) by org ${organizer.id}`,
    );
    return created;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTournamentDto,
  ): Promise<TournamentWithOrganizer> {
    const tournament = await this.assertOwnedByUser(userId, id);

    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new ConflictException(
        `Tournaments can only be edited in DRAFT status (current: ${tournament.status})`,
      );
    }

    const next = {
      registrationOpensAt: dto.registrationOpensAt ?? tournament.registrationOpensAt,
      registrationClosesAt: dto.registrationClosesAt ?? tournament.registrationClosesAt,
      startsAt: dto.startsAt ?? tournament.startsAt,
    };
    this.assertDateOrder(next.registrationOpensAt, next.registrationClosesAt, next.startsAt);

    const minTier = dto.minTier ?? tournament.minTier;
    const maxTier = dto.maxTier ?? tournament.maxTier;
    if (minTier && maxTier) this.assertTierOrder(minTier, maxTier);

    return this.tournaments.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
      ...(dto.format !== undefined && { format: dto.format }),
      ...(dto.modality !== undefined && { modality: dto.modality }),
      ...(dto.bracketType !== undefined && { bracketType: dto.bracketType }),
      ...(dto.region !== undefined && { region: dto.region }),
      ...(dto.minTier !== undefined && { minTier: dto.minTier }),
      ...(dto.maxTier !== undefined && { maxTier: dto.maxTier }),
      ...(dto.maxParticipants !== undefined && { maxParticipants: dto.maxParticipants }),
      ...(dto.entryFeeMxnCents !== undefined && { entryFeeMxnCents: dto.entryFeeMxnCents }),
      ...(dto.prizePool !== undefined && {
        prizePoolJson: dto.prizePool as Prisma.InputJsonValue,
      }),
      ...(dto.registrationOpensAt !== undefined && {
        registrationOpensAt: dto.registrationOpensAt,
      }),
      ...(dto.registrationClosesAt !== undefined && {
        registrationClosesAt: dto.registrationClosesAt,
      }),
      ...(dto.startsAt !== undefined && { startsAt: dto.startsAt }),
      ...(dto.rulesetVersion !== undefined && { rulesetVersion: dto.rulesetVersion }),
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    const tournament = await this.assertOwnedByUser(userId, id);
    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new ConflictException('Only DRAFT tournaments can be deleted; use /cancel instead');
    }
    await this.tournaments.delete(id);
  }

  async publish(userId: string, id: string): Promise<TournamentWithOrganizer> {
    const tournament = await this.assertOwnedByUser(userId, id);
    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new ConflictException(
        `Only DRAFT tournaments can be published (current: ${tournament.status})`,
      );
    }
    return this.tournaments.update(id, { status: TournamentStatus.PUBLISHED });
  }

  async cancel(userId: string, id: string): Promise<TournamentWithOrganizer> {
    const tournament = await this.assertOwnedByUser(userId, id);
    if (tournament.status === TournamentStatus.COMPLETED) {
      throw new ConflictException('Completed tournaments cannot be cancelled');
    }
    return this.tournaments.update(id, { status: TournamentStatus.CANCELLED });
  }

  search(query: SearchTournamentsDto) {
    return this.tournaments.search(
      {
        status: query.status,
        region: query.region,
        modality: query.modality,
        format: query.format,
      },
      { limit: query.limit, offset: query.offset },
    );
  }

  // -----------------------------
  // Internal
  // -----------------------------

  private async assertOwnedByUser(
    userId: string,
    tournamentId: string,
  ): Promise<TournamentWithOrganizer> {
    const tournament = await this.getById(tournamentId);
    const organizer = await this.organizers.findByUserId(userId);
    if (!organizer || organizer.id !== tournament.organizerId) {
      throw new ForbiddenException('You do not own this tournament');
    }
    return tournament;
  }

  private assertDateOrder(opens: Date, closes: Date, starts: Date) {
    if (opens.getTime() >= closes.getTime()) {
      throw new BadRequestException('registrationOpensAt must be before registrationClosesAt');
    }
    if (closes.getTime() > starts.getTime()) {
      throw new BadRequestException('registrationClosesAt must be at or before startsAt');
    }
  }

  private assertTierOrder(minTier: string, maxTier: string) {
    const order = ['AMATEUR', 'COMPETIDOR', 'SEMI_PRO', 'PRO'];
    if (order.indexOf(minTier) > order.indexOf(maxTier)) {
      throw new BadRequestException('minTier cannot be higher than maxTier');
    }
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    if (!base) {
      throw new BadRequestException('Cannot derive slug from name');
    }
    let candidate = base;
    while (await this.tournaments.slugExists(candidate)) {
      candidate = `${base}-${randomSlugSuffix()}`;
    }
    return candidate;
  }
}
