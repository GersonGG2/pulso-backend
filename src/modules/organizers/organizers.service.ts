import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ApplyOrganizerDto } from './dto/apply-organizer.dto';
import { UpdateOrganizerDto } from './dto/update-organizer.dto';
import { OrganizersRepository, OrganizerWithUser } from './organizers.repository';

@Injectable()
export class OrganizersService {
  private readonly logger = new Logger(OrganizersService.name);

  constructor(private readonly repo: OrganizersRepository) {}

  async getById(id: string): Promise<OrganizerWithUser> {
    const organizer = await this.repo.findById(id);
    if (!organizer) throw new NotFoundException(`Organizer ${id} not found`);
    return organizer;
  }

  async getByUserId(userId: string): Promise<OrganizerWithUser> {
    const organizer = await this.repo.findByUserId(userId);
    if (!organizer) throw new NotFoundException('No organizer profile for this user');
    return organizer;
  }

  /**
   * Apply to become an organizer. In MVP we auto-verify; later this will be
   * gated by manual review in the admin panel (KYC, RFC validation, etc.).
   */
  async apply(userId: string, dto: ApplyOrganizerDto): Promise<OrganizerWithUser> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) {
      throw new ConflictException('You already have an organizer profile');
    }

    const created = await this.repo.create({
      user: { connect: { id: userId } },
      organizationName: dto.organizationName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone ?? null,
      rfc: dto.rfc ?? null,
      website: dto.website ?? null,
      verified: true, // MVP auto-approve
      verifiedAt: new Date(),
    });

    this.logger.log(
      `Organizer auto-verified for user ${userId}: ${dto.organizationName}`,
    );
    return created;
  }

  async update(userId: string, dto: UpdateOrganizerDto): Promise<OrganizerWithUser> {
    await this.getByUserId(userId);
    return this.repo.update(userId, {
      ...(dto.organizationName !== undefined && { organizationName: dto.organizationName }),
      ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
      ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
      ...(dto.rfc !== undefined && { rfc: dto.rfc }),
      ...(dto.website !== undefined && { website: dto.website }),
    });
  }

  list(pagination: { limit: number; offset: number }) {
    return this.repo.list(pagination);
  }
}
