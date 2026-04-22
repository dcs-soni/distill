import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import crypto from 'crypto';
import client from 'prom-client';

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
    user?: {
      id: string;
      tenantId: string;
      role: string;
    };
  }
}

// Create a Registry for Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Define custom metrics here if needed
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 5, 15, 50, 100, 500],
});
register.registerMetric(httpRequestDurationMicroseconds);

export const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket.remotePort,
        };
      },
    },
  },
  genReqId: () => crypto.randomUUID(), // X-Request-ID injection
});

// Calculate request duration
server.addHook('onRequest', (request, reply, done) => {
  request.startTime = performance.now();
  done();
});

server.addHook('onResponse', (request, reply, done) => {
  if (request.startTime) {
    const duration = performance.now() - request.startTime;
    httpRequestDurationMicroseconds
      .labels(request.method, request.routeOptions.url || request.url, reply.statusCode.toString())
      .observe(duration);
  }
  done();
});

export async function buildServer() {
  // 1. Security Headers
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
      },
    },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    xXssProtection: false, // Rely on CSP
  });

  // 2. CORS
  await server.register(cors, {
    origin: process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
    maxAge: 86400,
  });

  // Health and Readiness Checks
  server.get('/health', () => {
    return { status: 'ok', service: 'api-gateway' };
  });

  server.get('/ready', () => {
    return { status: 'ready' };
  });

  server.get('/metrics', async (request, reply) => {
    void reply.header('Content-Type', register.contentType);
    return await register.metrics();
  });

  // 3. Custom Plugins (Order matters!)
  await server.register(import('./plugins/oidc.plugin.js'));
  await server.register(import('./plugins/tenant.plugin.js'));
  await server.register(import('./plugins/rateLimit.plugin.js'));

  // 4. Proxy Routes
  await server.register(import('./routes/proxy.js'));

  // Graceful shutdown handler
  const shutdown = async () => {
    server.log.info('Gracefully shutting down gateway...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  return server;
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildServer()
    .then((app) => {
      app.listen(
        { port: parseInt(process.env.PORT || '3000', 10), host: '0.0.0.0' },
        (err, address) => {
          if (err) {
            app.log.error(err);
            process.exit(1);
          }
          app.log.info(`API Gateway listening at ${address}`);
        }
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
