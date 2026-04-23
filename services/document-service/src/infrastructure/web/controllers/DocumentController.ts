import type { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationError } from '@distill/utils';
import { UploadDocument } from '../../../application/use-cases/UploadDocument.js';
import { UploadBatch } from '../../../application/use-cases/UploadBatch.js';
import {
  ListDocuments,
  GetDocument,
  DeleteDocument,
} from '../../../application/use-cases/QueryDocuments.js';

export class DocumentController {
  constructor(
    private readonly uploadDocument: UploadDocument,
    private readonly uploadBatch: UploadBatch,
    private readonly listDocuments: ListDocuments,
    private readonly getDocument: GetDocument,
    private readonly deleteDocument: DeleteDocument
  ) {}

  async handleUpload(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return reply
        .status(401)
        .send({ error: 'UNAUTHORIZED', message: 'Missing tenant or user context' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'No file provided' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk as Buffer);
    }
    const fileBuffer = Buffer.concat(chunks);

    if (data.file.truncated) {
      return reply
        .status(413)
        .send({ error: 'PAYLOAD_TOO_LARGE', message: 'File exceeds maximum size of 50MB' });
    }

    try {
      const result = await this.uploadDocument.execute(
        {
          tenantId,
          uploadedById: userId,
          fileName: data.filename,
          mimeType: data.mimetype,
          fileSize: fileBuffer.length,
        },
        fileBuffer
      );

      return reply.status(202).send({
        data: result,
        message: 'Document queued for processing',
      });
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: err.message });
      }
      throw err;
    }
  }

  async handleBatchUpload(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return reply
        .status(401)
        .send({ error: 'UNAUTHORIZED', message: 'Missing tenant or user context' });
    }

    const parts = request.files();
    const files: Array<{ fileName: string; mimeType: string; fileSize: number; buffer: Buffer }> =
      [];

    for await (const part of parts) {
      const chunks: Buffer[] = [];
      for await (const chunk of part.file) {
        chunks.push(chunk as Buffer);
      }
      const buffer = Buffer.concat(chunks);
      files.push({
        fileName: part.filename,
        mimeType: part.mimetype,
        fileSize: buffer.length,
        buffer,
      });
    }

    if (files.length === 0) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'No files provided' });
    }

    const batchName =
      (request.query as Record<string, string>).name || `Batch ${new Date().toISOString()}`;

    try {
      const result = await this.uploadBatch.execute(
        { tenantId, uploadedById: userId, batchName },
        files
      );

      return reply.status(202).send({ data: result });
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: err.message });
      }
      throw err;
    }
  }

  async handleList(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing tenant context' });
    }

    const query = request.query as Record<string, string>;

    const result = await this.listDocuments.execute({
      tenantId,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      sortBy: query.sortBy as 'createdAt' | 'fileName' | 'status' | 'fileSize' | undefined,
      sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
      status: query.status,
      documentType: query.documentType,
      batchId: query.batchId,
      search: query.search,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    return reply.send({
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  }

  async handleGetById(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.headers['x-tenant-id'] as string;
    const { id } = request.params as { id: string };

    if (!tenantId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing tenant context' });
    }

    const result = await this.getDocument.execute({ tenantId, documentId: id });
    return reply.send({ data: result });
  }

  async handleDelete(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userRole = request.headers['x-user-role'] as string;
    const { id } = request.params as { id: string };

    if (!tenantId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing tenant context' });
    }

    await this.deleteDocument.execute(tenantId, id, userRole);
    return reply.status(204).send();
  }

  async handleDownload(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = request.headers['x-tenant-id'] as string;
    const { id } = request.params as { id: string };

    if (!tenantId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing tenant context' });
    }

    const result = await this.getDocument.execute({ tenantId, documentId: id });
    return reply.status(302).redirect(result.downloadUrl);
  }
}
