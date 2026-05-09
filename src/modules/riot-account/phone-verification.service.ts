import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  PreconditionFailedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RiotAccountRepository } from './riot-account.repository';
import { TwilioVerifyService, VerifyStatus } from './twilio-verify.service';

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: RiotAccountRepository,
    private readonly twilio: TwilioVerifyService,
  ) {}

  async sendCode(userId: string, phoneNumber: string): Promise<{ status: VerifyStatus; devCode?: string }> {
    const account = await this.accounts.findByUserId(userId);
    if (!account) {
      throw new PreconditionFailedException(
        'You must link a Riot account before phone verification',
      );
    }

    if (account.smsVerified && account.phoneNumber === phoneNumber) {
      throw new ConflictException('This phone number is already verified for your account');
    }

    // Anti-smurf: a phone number can only be verified by one Pulso identity at a time.
    const claimedBy = await this.prisma.riotAccount.findFirst({
      where: {
        phoneNumber,
        smsVerified: true,
        NOT: { userId },
      },
    });
    if (claimedBy) {
      throw new ConflictException('This phone number is already in use by another account');
    }

    return this.twilio.send(phoneNumber);
  }

  async verifyCode(
    userId: string,
    phoneNumber: string,
    code: string,
  ): Promise<{ verified: true }> {
    const account = await this.accounts.findByUserId(userId);
    if (!account) {
      throw new PreconditionFailedException(
        'You must link a Riot account before phone verification',
      );
    }

    const result = await this.twilio.check(phoneNumber, code);
    if (!result.approved) {
      throw new BadRequestException('Invalid or expired code');
    }

    await this.accounts.upsert(
      userId,
      {} as never, // create branch unreachable: account exists by precondition above
      {
        phoneNumber,
        smsVerified: true,
        smsVerifiedAt: new Date(),
      },
    );

    this.logger.log(`Phone verified for user ${userId}`);
    return { verified: true };
  }
}
