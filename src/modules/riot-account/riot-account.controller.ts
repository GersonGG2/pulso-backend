import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RiotAccount } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PhoneVerificationService } from './phone-verification.service';
import { RiotAccountService } from './riot-account.service';
import { InitiateLinkDto, InitiateLinkResponseDto } from './dto/initiate-link.dto';
import { RiotAccountResponseDto } from './dto/riot-account-response.dto';
import { SendSmsDto, SendSmsResponseDto } from './dto/send-sms.dto';
import { VerifySmsDto, VerifySmsResponseDto } from './dto/verify-sms.dto';

@ApiTags('riot-account')
@ApiBearerAuth()
@Controller('riot-account')
export class RiotAccountController {
  constructor(
    private readonly service: RiotAccountService,
    private readonly phone: PhoneVerificationService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user linked Riot account' })
  @ApiOkResponse({ type: RiotAccountResponseDto })
  async getMine(@CurrentUser('id') userId: string): Promise<RiotAccountResponseDto> {
    const account = await this.service.getMyAccount(userId);
    return this.toResponse(account);
  }

  @Post('initiate-link')
  @ApiOperation({
    summary: 'Begin linking a Riot account — returns the icon the user must set',
  })
  @ApiOkResponse({ type: InitiateLinkResponseDto })
  initiate(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiateLinkDto,
  ): Promise<InitiateLinkResponseDto> {
    return this.service.initiateLink(userId, dto);
  }

  @Post('confirm-link')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confirm linking — verifies icon match and persists the Riot account',
  })
  @ApiOkResponse({ type: RiotAccountResponseDto })
  async confirm(@CurrentUser('id') userId: string): Promise<RiotAccountResponseDto> {
    const account = await this.service.confirmLink(userId);
    return this.toResponse(account);
  }

  @Delete('me')
  @HttpCode(204)
  @ApiOperation({ summary: 'Unlink the authenticated user Riot account' })
  async unlink(@CurrentUser('id') userId: string): Promise<void> {
    await this.service.unlink(userId);
  }

  @Post('sms/send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send SMS verification code (E.164 phone number)' })
  @ApiOkResponse({ type: SendSmsResponseDto })
  sendSms(
    @CurrentUser('id') userId: string,
    @Body() dto: SendSmsDto,
  ): Promise<SendSmsResponseDto> {
    return this.phone.sendCode(userId, dto.phoneNumber);
  }

  @Post('sms/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify SMS code and mark phone as verified' })
  @ApiOkResponse({ type: VerifySmsResponseDto })
  verifySms(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifySmsDto,
  ): Promise<VerifySmsResponseDto> {
    return this.phone.verifyCode(userId, dto.phoneNumber, dto.code);
  }

  // -----------------------------
  // Mappers
  // -----------------------------

  private toResponse(account: RiotAccount): RiotAccountResponseDto {
    return {
      id: account.id,
      gameName: account.gameName,
      tagLine: account.tagLine,
      region: account.region,
      summonerLevel: account.summonerLevel,
      currentTier: account.currentTier,
      currentRank: account.currentRank,
      currentLP: account.currentLP,
      highestRankEver: account.highestRankEver,
      smsVerified: account.smsVerified,
      linkedAt: account.linkedAt,
      lastSyncedAt: account.lastSyncedAt,
    };
  }
}
