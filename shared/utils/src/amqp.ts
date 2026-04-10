import { connect, ChannelModel, ConfirmChannel, Options, ConsumeMessage } from 'amqplib';
import { ContextLogger } from './logger.js';
import { DomainEvent } from '@distill/types';

export class RabbitMQClient {
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  constructor(
    private url: string,
    private logger: ContextLogger
  ) {}

  public async connect(): Promise<void> {
    try {
      this.connection = await connect(this.url);
      this.channel = await this.connection.createConfirmChannel();

      this.connection.on('error', (err: Error) => {
        this.logger.error('RabbitMQ connection error', { error: err });
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed. Reconnecting in 5s...');
        setTimeout(() => {
          void this.connect();
        }, 5000);
      });

      this.logger.info('Connected to RabbitMQ successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to connect to RabbitMQ', { error: errorMessage });
      setTimeout(() => {
        void this.connect();
      }, 5000);
    }
  }

  public async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  public async assertTopology({
    exchange,
    queue,
    routingKey,
    dlx,
  }: {
    exchange: string;
    queue: string;
    routingKey: string;
    dlx?: string;
  }): Promise<void> {
    if (!this.channel) throw new Error('Channel not ready');

    if (dlx) {
      await this.channel.assertExchange(dlx, 'topic', { durable: true });
      await this.channel.assertQueue(`${queue}_dlq`, { durable: true });
      await this.channel.bindQueue(`${queue}_dlq`, dlx, '#');
    }

    await this.channel.assertExchange(exchange, 'topic', { durable: true });

    const queueOptions: Options.AssertQueue = { durable: true };
    if (dlx) {
      queueOptions.deadLetterExchange = dlx;
    }

    await this.channel.assertQueue(queue, queueOptions);
    await this.channel.bindQueue(queue, exchange, routingKey);
  }

  public async publish(exchange: string, routingKey: string, event: DomainEvent): Promise<boolean> {
    if (!this.channel) throw new Error('Channel not ready');

    const payload = Buffer.from(JSON.stringify(event));

    return new Promise((resolve, reject) => {
      this.channel!.publish(
        exchange,
        routingKey,
        payload,
        {
          persistent: true,
          correlationId: event.correlationId,
          contentType: 'application/json',
          timestamp: Date.now(),
        },
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  public async createConsumer<T>(
    queue: string,
    handler: (event: DomainEvent<T>) => Promise<void>,
    options: { prefetch?: number } = {}
  ): Promise<void> {
    if (!this.channel) throw new Error('Channel not ready');

    if (options.prefetch) {
      await this.channel.prefetch(options.prefetch);
    }

    await this.channel.consume(queue, (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const processMsg = async () => {
        try {
          const event = JSON.parse(msg.content.toString()) as DomainEvent<T>;
          await handler(event);
          this.channel!.ack(msg);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error('Error processing message', { error: errorMessage });
          // Nack and do not requeue (send to DLX if configured)
          this.channel!.nack(msg, false, false);
        }
      };

      void processMsg();
    });
  }
}
