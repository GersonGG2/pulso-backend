import { Module } from '@nestjs/common';
import { RiotAccountRepository } from '../riot-account/riot-account.repository';
import { PlayersController } from './players.controller';
import { PlayersRepository } from './players.repository';
import { PlayersService } from './players.service';

@Module({
  controllers: [PlayersController],
  providers: [PlayersService, PlayersRepository, RiotAccountRepository],
  exports: [PlayersService],
})
export class PlayersModule {}
