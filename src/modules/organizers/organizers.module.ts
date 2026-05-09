import { Module } from '@nestjs/common';
import { OrganizersController } from './organizers.controller';
import { OrganizersRepository } from './organizers.repository';
import { OrganizersService } from './organizers.service';

@Module({
  controllers: [OrganizersController],
  providers: [OrganizersService, OrganizersRepository],
  exports: [OrganizersService, OrganizersRepository],
})
export class OrganizersModule {}
