import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTeamDto } from './create-team.dto';

/**
 * tag is immutable for SEO/branding stability and to keep registrations stable.
 * If the team needs to rebrand they delete and create a new team.
 */
export class UpdateTeamDto extends PartialType(OmitType(CreateTeamDto, ['tag'] as const)) {}
