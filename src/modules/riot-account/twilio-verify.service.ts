import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio } from 'twilio';

export type VerifyStatus = 'pending' | 'approved' | 'canceled';

/**
 * Wrapper around Twilio Verify v2 API.
 *
 * In development (no Twilio creds in env), this service runs in MOCK mode:
 *   - send() logs the request and returns a fixed dev code (123456)
 *   - check() accepts code "123456" as approved, anything else as denied
 *
 * In production, all Twilio creds (ACCOUNT_SID, AUTH_TOKEN, VERIFY_SERVICE_SID)
 * must be set or the service throws ServiceUnavailable.
 */
@Injectable()
export class TwilioVerifyService {
  private readonly logger = new Logger(TwilioVerifyService.name);
  private readonly client: Twilio | null;
  private readonly serviceSid: string | undefined;
  private readonly devMode: boolean;
  /** Code used in dev mode when Twilio is not configured. */
  static readonly DEV_CODE = '123456';

  constructor(private readonly config: ConfigService) {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    this.serviceSid = this.config.get<string>('TWILIO_VERIFY_SERVICE_SID');
    const isProd = this.config.get('NODE_ENV') === 'production';

    if (sid && token && this.serviceSid) {
      this.client = twilio(sid, token);
      this.devMode = false;
      this.logger.log('Twilio Verify configured');
    } else if (isProd) {
      this.client = null;
      this.devMode = false;
      this.logger.error('Twilio not configured in production');
    } else {
      this.client = null;
      this.devMode = true;
      this.logger.warn(`Twilio not configured — running in DEV MOCK mode. Use code ${TwilioVerifyService.DEV_CODE} to verify.`);
    }
  }

  async send(phoneNumber: string): Promise<{ status: VerifyStatus; devCode?: string }> {
    if (this.devMode) {
      this.logger.log(`[DEV] Pretending to send SMS to ${phoneNumber} (code: ${TwilioVerifyService.DEV_CODE})`);
      return { status: 'pending', devCode: TwilioVerifyService.DEV_CODE };
    }

    if (!this.client || !this.serviceSid) {
      throw new ServiceUnavailableException('SMS verification not configured');
    }

    try {
      const verification = await this.client.verify.v2
        .services(this.serviceSid)
        .verifications.create({ to: phoneNumber, channel: 'sms' });
      return { status: verification.status as VerifyStatus };
    } catch (err) {
      this.logger.error(`Twilio send failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Failed to send verification SMS');
    }
  }

  async check(phoneNumber: string, code: string): Promise<{ approved: boolean; status: VerifyStatus }> {
    if (this.devMode) {
      const approved = code === TwilioVerifyService.DEV_CODE;
      this.logger.log(`[DEV] Code check for ${phoneNumber}: ${approved ? 'approved' : 'denied'}`);
      return { approved, status: approved ? 'approved' : 'pending' };
    }

    if (!this.client || !this.serviceSid) {
      throw new ServiceUnavailableException('SMS verification not configured');
    }

    try {
      const check = await this.client.verify.v2
        .services(this.serviceSid)
        .verificationChecks.create({ to: phoneNumber, code });
      const status = check.status as VerifyStatus;
      return { approved: status === 'approved', status };
    } catch (err) {
      this.logger.error(`Twilio check failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Failed to verify code');
    }
  }
}
