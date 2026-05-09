import { Module } from '@nestjs/common';
import { ZScoreController } from './zscore.controller';
import { ZScoreRepository } from './zscore.repository';
import { ZScoreService } from './zscore.service';

@Module({
  controllers: [ZScoreController],
  providers: [ZScoreService, ZScoreRepository],
  exports: [ZScoreService],
})
export class ZScoreModule {}
