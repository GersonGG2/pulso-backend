/**
 * Subset of Clerk webhook event payloads we care about.
 * Full schema: https://clerk.com/docs/integrations/webhooks/overview
 */

export type ClerkWebhookEventType = 'user.created' | 'user.updated' | 'user.deleted';

export interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification?: { status: string };
}

export interface ClerkUserData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: number;
  updated_at: number;
}

export interface ClerkDeletedUserData {
  id: string;
  deleted: true;
}

export interface ClerkWebhookEvent<T = ClerkUserData | ClerkDeletedUserData> {
  type: ClerkWebhookEventType;
  data: T;
  object: 'event';
}

export const CLERK_WEBHOOK_HEADERS = {
  id: 'svix-id',
  timestamp: 'svix-timestamp',
  signature: 'svix-signature',
} as const;
