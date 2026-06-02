import amqplib from 'amqplib';

export interface Logger {
  info(obj: unknown, msg?: string): void;
  info(msg: string): void;
  warn(obj: unknown, msg?: string): void;
  warn(msg: string): void;
  error(obj: unknown, msg?: string): void;
  error(msg: string): void;
}

export interface DocumentRepository {
  updateStatus(tenantId: string, documentId: string, status: string): Promise<void>;
}

export class StatusUpdateConsumer {
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;

  constructor(
    private readonly rabbitUrl: string,
    private readonly documentRepository: DocumentRepository,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    try {
      this.connection = await amqplib.connect(this.rabbitUrl);
      this.channel = await this.connection.createChannel();

      const queues = [
        'document.extraction.completed',
        'document.validation.completed',
        'document.validation.needs_review',
        'document.review.completed',
      ];

      for (const queue of queues) {
        // Assert queue in case it doesn't exist
        await this.channel.assertQueue(queue, { durable: true });
        await this.channel.prefetch(10);

        this.logger.info(`Document Service listening on queue: ${queue}`);

        void this.channel.consume(queue, (msg: amqplib.ConsumeMessage | null) => {
          if (!msg) return;

          void (async () => {
            try {
              const payload = JSON.parse(msg.content.toString()) as Record<string, unknown>;
              const tenantId = payload.tenantId as string | undefined;
              const documentId = payload.documentId as string | undefined;

              if (!tenantId || !documentId) {
                this.logger.warn({ payload }, 'Received event without tenantId or documentId');
                this.channel!.ack(msg);
                return;
              }

              let newStatus = '';

              if (queue === 'document.extraction.completed') {
                newStatus = payload.status === 'FAILED' ? 'FAILED' : 'EXTRACTED';
              } else if (queue === 'document.validation.completed') {
                newStatus = 'VALIDATED'; // auto-approved
              } else if (queue === 'document.validation.needs_review') {
                newStatus = 'REVIEW_NEEDED';
              } else if (queue === 'document.review.completed') {
                newStatus = payload.action === 'APPROVED' ? 'APPROVED' : 'REJECTED';
              }

              if (newStatus) {
                await this.documentRepository.updateStatus(tenantId, documentId, newStatus);
                this.logger.info({ documentId, newStatus }, 'Document status updated via event');
              }

              this.channel!.ack(msg);
            } catch (err: unknown) {
              const error = err as Error;
              this.logger.error(
                { error: error.message },
                'Failed to process document status update'
              );
              this.channel!.nack(msg, false, false);
            }
          })();
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error({ error: error.message }, 'Failed to start StatusUpdateConsumer');
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.logger.info('StatusUpdateConsumer stopped');
  }
}
