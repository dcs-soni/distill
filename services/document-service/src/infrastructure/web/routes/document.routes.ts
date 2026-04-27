import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { DocumentController } from '../controllers/DocumentController.js';
import {
  DocumentIdParams,
  ListDocumentsQuery,
  BatchNameQuery,
  UploadResponseSchema,
  ListDocumentsResponseSchema,
  DocumentDetailResponseSchema,
  DownloadResponseSchema,
  BatchUploadResponseSchema,
  ErrorResponseSchema,
} from '../schemas/document.schemas.js';

export function documentRoutes(controller: DocumentController) {
  // eslint-disable-next-line @typescript-eslint/require-await
  return async function (fastify: FastifyInstance) {
    const route = fastify.withTypeProvider<ZodTypeProvider>();

    route.post(
      '/upload',
      {
        schema: {
          response: {
            202: UploadResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            413: ErrorResponseSchema,
          },
        },
      },
      (req, reply) => controller.handleUpload(req, reply)
    );

    route.post(
      '/upload/batch',
      {
        schema: {
          querystring: BatchNameQuery,
          response: {
            202: BatchUploadResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
          },
        },
      },
      (req, reply) => controller.handleBatchUpload(req, reply)
    );

    route.get(
      '/',
      {
        schema: {
          querystring: ListDocumentsQuery,
          response: {
            200: ListDocumentsResponseSchema,
            401: ErrorResponseSchema,
          },
        },
      },
      (req, reply) => controller.handleList(req, reply)
    );

    route.get(
      '/:id',
      {
        schema: {
          params: DocumentIdParams,
          response: {
            200: DocumentDetailResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
          },
        },
      },
      (req, reply) => controller.handleGetById(req, reply)
    );

    route.delete(
      '/:id',
      {
        schema: {
          params: DocumentIdParams,
          response: {
            204: { type: 'null' as const, description: 'No content' },
            401: ErrorResponseSchema,
            403: ErrorResponseSchema,
            404: ErrorResponseSchema,
          },
        },
      },
      (req, reply) => controller.handleDelete(req, reply)
    );

    route.get(
      '/:id/download',
      {
        schema: {
          params: DocumentIdParams,
          response: {
            200: DownloadResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
          },
        },
      },
      (req, reply) => controller.handleDownload(req, reply)
    );
  };
}
