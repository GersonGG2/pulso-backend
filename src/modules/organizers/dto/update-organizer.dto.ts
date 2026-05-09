import { PartialType } from '@nestjs/swagger';
import { ApplyOrganizerDto } from './apply-organizer.dto';

export class UpdateOrganizerDto extends PartialType(ApplyOrganizerDto) {}
