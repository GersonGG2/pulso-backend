import { Module } from '@nestjs/common';
import { PhoneVerificationService } from './phone-verification.service';
import { RiotAccountController } from './riot-account.controller';
import { RiotAccountService } from './riot-account.service';
import { RiotAccountRepository } from './riot-account.repository';
import { RiotApiService } from './riot-api.service';
import { TwilioVerifyService } from './twilio-verify.service';

@Module({
  controllers: [RiotAccountController],
  providers: [
    RiotAccountService,
    RiotAccountRepository,
    RiotApiService,
    PhoneVerificationService,
    TwilioVerifyService,
  ],
  exports: [RiotAccountService, RiotApiService],
})
export class RiotAccountModule {}
