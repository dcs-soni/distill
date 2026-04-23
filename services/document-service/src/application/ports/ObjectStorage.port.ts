import type { Readable } from 'node:stream';

export interface ObjectStorage {
  uploadFile(
    tenantId: string,
    documentId: string,
    fileName: string,
    body: Buffer,
    mimeType: string
  ): Promise<string>;

  downloadFile(s3Key: string): Promise<Readable>;

  getPresignedUploadUrl(
    tenantId: string,
    documentId: string,
    fileName: string,
    mimeType: string,
    expiresIn?: number
  ): Promise<string>;

  getPresignedDownloadUrl(s3Key: string, expiresIn?: number): Promise<string>;

  deleteFile(s3Key: string): Promise<void>;
}
