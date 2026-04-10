import pino from 'pino';

export interface LoggerConfig {
  service: string;
  level?: string;
}

export const createLogger = (config: LoggerConfig) => {
  const isDev = process.env.NODE_ENV !== 'production';

  return pino({
    level: config.level || 'info',
    base: { service: config.service },
    redact: {
      paths: [
        'password',
        '*.password',
        'token',
        '*.token',
        'secret',
        '*.secret',
        'key',
        '*.key',
        'authorization',
        '*.authorization',
        'headers.authorization',
      ],
      censor: '[REDACTED]',
    },
    ...(isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : {}),
  });
};

// Singleton context wrapper
export class ContextLogger {
  constructor(
    private logger: pino.Logger,
    private context: Record<string, unknown> = {}
  ) {}

  public withContext(ctx: Record<string, unknown>): ContextLogger {
    return new ContextLogger(this.logger, { ...this.context, ...ctx });
  }

  public info(msg: string, obj?: object) {
    this.logger.info({ ...this.context, ...obj }, msg);
  }

  public error(msg: string, obj?: object) {
    this.logger.error({ ...this.context, ...obj }, msg);
  }

  public warn(msg: string, obj?: object) {
    this.logger.warn({ ...this.context, ...obj }, msg);
  }

  public debug(msg: string, obj?: object) {
    this.logger.debug({ ...this.context, ...obj }, msg);
  }
}
