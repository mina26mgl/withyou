import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/backend';
import { ClerkWebhookService } from './clerk-webhook.service';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(private readonly clerkWebhookService: ClerkWebhookService) {}

  @Post()
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') svixId?: string,
    @Headers('svix-timestamp') svixTimestamp?: string,
    @Headers('svix-signature') svixSignature?: string,
  ) {
    if (!req.rawBody || !svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Requête webhook invalide.');
    }

    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      throw new UnauthorizedException('CLERK_WEBHOOK_SECRET non configuré.');
    }

    let event: WebhookEvent;
    try {
      event = new Webhook(secret).verify(req.rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as WebhookEvent;
    } catch {
      throw new UnauthorizedException('Signature du webhook invalide.');
    }

    await this.clerkWebhookService.handleEvent(event);

    return { received: true };
  }
}