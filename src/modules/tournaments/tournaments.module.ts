import { Module } from '@nestjs/common';
import { OrganizersModule } from '../organizers/organizers.module';
import { TournamentsController } from './tournaments.controller';
import { TournamentsRepository } from './tournaments.repository';
import { TournamentsService } from './tournaments.service';

@Module({
  imports: [OrganizersModule],
  controllers: [TournamentsController],
  providers: [TournamentsService, TournamentsRepository],
  exports: [TournamentsService],
})
export class TournamentsModule {}
