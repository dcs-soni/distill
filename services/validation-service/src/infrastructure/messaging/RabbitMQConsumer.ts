import amqplib from 'amqplib';
import { ValidateExtraction } from '../../application/use-cases/ValidateExtraction';
import { Logger } from '../../application/use-cases/ValidateExtraction';

export class RabbitMQConsumer {
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;

  constructor(
    private readonly rabbitUrl: string,
    private readonly validateExtraction: ValidateExtraction,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    try {
      this.connection = await amqplib.connect(this.rabbitUrl);
      this.channel = await this.connection.createChannel();

      const queueName = 'validation.extraction.completed';

      // Ensure queue exists (this should be asserted by terraform/definitions.json in prod, but good to ensure here)
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'dlx.exchange',
          'x-dead-letter-routing-key': queueName,
        },
      });

      await this.channel.prefetch(20); // Consume up to 20 concurrently

      this.logger.info(`Started RabbitMQ consumer on queue: ${queueName}`);

      void this.channel.consume(queueName, (msg: amqplib.ConsumeMessage | null) => {
        if (!msg) return;

        void (async () => {
          try {
            const payload = JSON.parse(msg.content.toString()) as Record<string, unknown>;

            if (payload.status === 'FAILED') {
              this.logger.info(
                { documentId: payload.documentId },
                'Skipping validation for failed extraction'
              );
              this.channel!.ack(msg);
              return;
            }

            await this.validateExtraction.execute({
              documentId: payload.documentId as string,
              tenantId: payload.tenantId as string,
              extractionId: payload.extractionId as string,
            });

            this.channel!.ack(msg);
          } catch (error: unknown) {
            const err = error as Error & { statusCode?: number; code?: string };
            this.logger.error({ error: err.message }, 'Failed to process message');

            // Requeue on transient errors (simplified logic here)
            const isTransient =
              err.statusCode === 502 || err.statusCode === 503 || err.code === 'ECONNREFUSED';
            if (isTransient) {
              this.channel!.nack(msg, false, true);
            } else {
              // Unrecoverable, send to DLX
              this.channel!.nack(msg, false, false);
            }
          }
        })();
      });
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error({ error: error.message }, 'Failed to start RabbitMQ consumer');
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.logger.info('RabbitMQ Consumer stopped');
  }
}
