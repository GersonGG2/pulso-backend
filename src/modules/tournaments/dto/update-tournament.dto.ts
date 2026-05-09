import { PartialType } from '@nestjs/swagger';
import { CreateTournamentDto } from './create-tournament.dto';

/**
 * All fields optional. Update is only allowed in DRAFT status (enforced in service).
 */
export class UpdateTournamentDto extends PartialType(CreateTournamentDto) {}
