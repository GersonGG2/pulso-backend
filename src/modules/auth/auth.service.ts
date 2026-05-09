import { Injectable, Logger } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { UsersRepository } from '../users/users.repository';
import { ClerkUserData } from './dto/clerk-webhook.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly users: UsersRepository) {}

  /**
   * Idempotent sync of a Clerk user into our DB.
   * Called from webhook handlers AND from JWT guard on first authenticated request.
   */
  async syncUserFromClerk(clerk: ClerkUserData): Promise<User> {
    const email = this.extractPrimaryEmail(clerk);
    const username = clerk.username ?? this.deriveUsername(email, clerk.id);
    const displayName = this.deriveDisplayName(clerk, username);

    const existing = await this.users.findByClerkId(clerk.id);

    if (existing) {
      const changed =
        existing.email !== email ||
        existing.displayName !== displayName ||
        existing.avatarUrl !== clerk.image_url;

      if (!changed) return existing;

      this.logger.log(`Updating user ${existing.id} from Clerk sync`);
      return this.users.update(existing.id, {
        email,
        displayName,
        avatarUrl: clerk.image_url,
      });
    }

    this.logger.log(`Creating user from Clerk: ${email}`);
    return this.users.create({
      clerkUserId: clerk.id,
      email,
      username: await this.ensureUniqueUsername(username),
      displayName,
      avatarUrl: clerk.image_url,
      role: UserRole.PLAYER,
    });
  }

  async deleteUserByClerkId(clerkUserId: string): Promise<void> {
    const user = await this.users.findByClerkId(clerkUserId);
    if (!user) {
      this.logger.warn(`Delete requested for unknown Clerk user ${clerkUserId}`);
      return;
    }
    this.logger.log(`Deleting user ${user.id} (Clerk: ${clerkUserId})`);
    await this.users.delete(user.id);
  }

  // -----------------------------
  // Internal helpers
  // -----------------------------

  private extractPrimaryEmail(clerk: ClerkUserData): string {
    const primary = clerk.email_addresses.find((e) => e.id === clerk.primary_email_address_id);
    const email = primary?.email_address ?? clerk.email_addresses[0]?.email_address;
    if (!email) {
      throw new Error(`Clerk user ${clerk.id} has no email addresses`);
    }
    return email.toLowerCase();
  }

  private deriveUsername(email: string, clerkId: string): string {
    const local = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_.-]/g, '') ?? '';
    if (local.length >= 3 && local.length <= 24) return local;
    // fall back to a stable handle derived from the Clerk id
    return `user_${clerkId.slice(-8)}`.toLowerCase();
  }

  private deriveDisplayName(clerk: ClerkUserData, fallback: string): string {
    const parts = [clerk.first_name, clerk.last_name].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return fallback;
  }

  private async ensureUniqueUsername(base: string): Promise<string> {
    let candidate = base;
    let suffix = 1;
    while (await this.users.findByUsername(candidate)) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
      if (suffix > 999) {
        candidate = `${base}_${Date.now().toString(36)}`;
        break;
      }
    }
    return candidate;
  }
}
