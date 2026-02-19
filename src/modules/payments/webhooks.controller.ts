import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { EfiWebhookDto } from './dto/efi-webhook.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    @InjectQueue('payment-updates') private readonly paymentUpdatesQueue: Queue,
  ) {}

  @Post('efi/pix')
  @HttpCode(HttpStatus.OK)
  async handleEfiPixWebhook(@Body() payload: EfiWebhookDto) {
    this.logger.log('Received Efi PIX Webhook, adding to queue:');
    this.logger.log(JSON.stringify(payload, null, 2));

    try {
      await this.paymentUpdatesQueue.add('process-payment', payload, {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });
      this.logger.log('Successfully added payment update to the queue.');
    } catch (error) {
      this.logger.error(
        'Failed to add payment update to the queue.',
        error.stack,
      );
    }

    return { status: 'queued' };
  }
}
