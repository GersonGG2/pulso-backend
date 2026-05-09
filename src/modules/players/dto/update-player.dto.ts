import { PartialType } from '@nestjs/swagger';
import { CreatePlayerDto } from './create-player.dto';

/**
 * All fields are optional on update; same validation rules as create.
 */
export class UpdatePlayerDto extends PartialType(CreatePlayerDto) {}
