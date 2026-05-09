import { Module } from '@nestjs/common';
import { PlayersRepository } from '../players/players.repository';
import { TeamsController } from './teams.controller';
import { TeamsRepository } from './teams.repository';
import { TeamsService } from './teams.service';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRepository, PlayersRepository],
  exports: [TeamsService],
})
export class TeamsModule {}
