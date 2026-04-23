import type { FastifyInstance } from 'fastify';
import type { DocumentController } from '../controllers/DocumentController.js';

export function documentRoutes(controller: DocumentController) {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async function (fastify: FastifyInstance) {
    fastify.post('/upload', async (req, reply) => {
      return controller.handleUpload(req, reply);
    });

    fastify.post('/upload/batch', async (req, reply) => {
      return controller.handleBatchUpload(req, reply);
    });

    fastify.get('/', async (req, reply) => {
      return controller.handleList(req, reply);
    });

    fastify.get('/:id', async (req, reply) => {
      return controller.handleGetById(req, reply);
    });

    fastify.delete('/:id', async (req, reply) => {
      return controller.handleDelete(req, reply);
    });

    fastify.get('/:id/download', async (req, reply) => {
      return controller.handleDownload(req, reply);
    });
  };
}
