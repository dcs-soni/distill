import amqplib from 'amqplib';
import { ValidateExtraction } from '../../application/use-cases/ValidateExtraction';

export class RabbitMQConsumer {
  private connection: amqplib.Connection | null = null;
  private channel: amqplib.Channel | null = null;

  constructor(
    private readonly rabbitUrl: string,
    private readonly validateExtraction: ValidateExtraction,
    private readonly logger: any
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
          'x-dead-letter-routing-key': queueName
        }
      });

      await this.channel.prefetch(20); // Consume up to 20 concurrently

      this.logger.info(`Started RabbitMQ consumer on queue: ${queueName}`);

      this.channel.consume(queueName, async (msg) => {
        if (!msg) return;

        try {
          const payload = JSON.parse(msg.content.toString());
          
          if (payload.status === 'FAILED') {
            this.logger.info({ documentId: payload.documentId }, 'Skipping validation for failed extraction');
            this.channel!.ack(msg);
            return;
          }

          await this.validateExtraction.execute({
            documentId: payload.documentId,
            tenantId: payload.tenantId,
            extractionId: payload.extractionId
          });

          this.channel!.ack(msg);
        } catch (error: any) {
          this.logger.error({ error: error.message }, 'Failed to process message');
          
          // Requeue on transient errors (simplified logic here)
          const isTransient = error.statusCode === 502 || error.statusCode === 503 || error.code === 'ECONNREFUSED';
          if (isTransient) {
            this.channel!.nack(msg, false, true);
          } else {
            // Unrecoverable, send to DLX
            this.channel!.nack(msg, false, false);
          }
        }
      });

    } catch (error) {
      this.logger.error({ error }, 'Failed to start RabbitMQ consumer');
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.logger.info('RabbitMQ Consumer stopped');
  }
}
