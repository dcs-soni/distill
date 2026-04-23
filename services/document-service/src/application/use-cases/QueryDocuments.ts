import { NotFoundError } from '@distill/utils';
import type {
  DocumentRepository,
  DocumentFilter,
  PaginationOptions,
} from '../ports/DocumentRepository.port.js';
import type { ObjectStorage } from '../ports/ObjectStorage.port.js';
import type { ListDocumentsInput, GetDocumentInput } from '../dto/index.js';

export class ListDocuments {
  constructor(private readonly documentRepo: DocumentRepository) {}

  async execute(input: ListDocumentsInput) {
    const filter: DocumentFilter = {
      status: input.status,
      documentType: input.documentType,
      batchId: input.batchId,
      search: input.search,
      dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
      dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
    };

    const pagination: PaginationOptions = {
      page: input.page,
      limit: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    };

    const result = await this.documentRepo.findAll(input.tenantId, filter, pagination);

    return {
      data: result.data.map((doc) => doc.toDTO()),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}

export class GetDocument {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(input: GetDocumentInput) {
    const document = await this.documentRepo.findById(input.tenantId, input.documentId);
    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const downloadUrl = await this.storage.getPresignedDownloadUrl(document.s3Key);

    return {
      ...document.toDTO(),
      downloadUrl,
    };
  }
}

export class DeleteDocument {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(tenantId: string, documentId: string, userRole: string): Promise<void> {
    if (userRole !== 'ADMIN') {
      const { ForbiddenError } = await import('@distill/utils');
      throw new ForbiddenError('Only ADMIN users can delete documents');
    }

    const document = await this.documentRepo.findById(tenantId, documentId);
    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await this.storage.deleteFile(document.s3Key);
    await this.documentRepo.delete(tenantId, documentId);
  }
}
