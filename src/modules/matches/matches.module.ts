import { Module } from '@nestjs/common';
import { OrganizersRepository } from '../organizers/organizers.repository';
import { TournamentRegistrationsRepository } from '../tournament-registrations/tournament-registrations.repository';
import { TournamentsRepository } from '../tournaments/tournaments.repository';
import { ZScoreModule } from '../zscore/zscore.module';
import { MatchesController } from './matches.controller';
import { MatchesRepository } from './matches.repository';
import { MatchesService } from './matches.service';

@Module({
  imports: [ZScoreModule],
  controllers: [MatchesController],
  providers: [
    MatchesService,
    MatchesRepository,
    TournamentsRepository,
    TournamentRegistrationsRepository,
    OrganizersRepository,
  ],
  exports: [MatchesService],
})
export class MatchesModule {}
