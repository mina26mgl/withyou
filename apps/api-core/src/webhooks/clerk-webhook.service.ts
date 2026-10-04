import { Injectable, Logger } from '@nestjs/common';
import type { UserJSON, WebhookEvent } from '@clerk/backend';
import { UsersService } from '../users/users.service';

@Injectable()
export class ClerkWebhookService {
  private readonly logger = new Logger(ClerkWebhookService.name);

  constructor(private readonly users: UsersService) {}

  async handleEvent(event: WebhookEvent) {
    switch (event.type) {
      case 'user.created':
        await this.createUser(event.data);
        break;
      default:
        this.logger.debug(`Événement Clerk ignoré: ${event.type}`);
    }
  }

  private async createUser(data: UserJSON) {
    const primaryEmail =
      data.email_addresses?.find((e) => e.id === data.primary_email_address_id)?.email_address ??
      data.email_addresses?.[0]?.email_address;
    if (!primaryEmail) {
      this.logger.warn(`user.created sans email pour clerk_id=${data.id}`);
      return;
    }

    await this.users.provisionFromClerk({
      clerkId: data.id,
      email: primaryEmail,
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      username: data.username ?? null,
      // Sans photo, Clerk fournit un avatar générique : ce n'est pas une photo de profil.
      imageUrl: data.has_image ? (data.image_url ?? null) : null,
      unsafeMetadata: data.unsafe_metadata,
    });
  }
}
