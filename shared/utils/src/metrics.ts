import fastifyMetrics from 'fastify-metrics';

interface FastifyLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: (plugin: any, opts: any) => any;
}

export async function setupMetrics(server: FastifyLike, appName: string) {
  await server.register(fastifyMetrics, {
    endpoint: '/metrics',
    defaultMetrics: {
      enabled: true,
      labels: {
        app: appName,
      },
    },
    routeMetrics: {
      enabled: true,
    },
  });
}
