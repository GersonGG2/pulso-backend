import { Module } from '@nestjs/common';
import { PlayersRepository } from '../players/players.repository';
import { TeamsRepository } from '../teams/teams.repository';
import { TournamentsRepository } from '../tournaments/tournaments.repository';
import { TournamentRegistrationsController } from './tournament-registrations.controller';
import { TournamentRegistrationsRepository } from './tournament-registrations.repository';
import { TournamentRegistrationsService } from './tournament-registrations.service';

@Module({
  controllers: [TournamentRegistrationsController],
  providers: [
    TournamentRegistrationsService,
    TournamentRegistrationsRepository,
    TournamentsRepository,
    PlayersRepository,
    TeamsRepository,
  ],
  exports: [TournamentRegistrationsService],
})
export class TournamentRegistrationsModule {}
