import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';
import type { ObjectStorage } from '../../application/ports/ObjectStorage.port.js';

export class S3StorageAdapter implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    forcePathStyle?: boolean;
  }) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true,
    });
    this.bucket = config.bucket;
  }

  private buildS3Key(tenantId: string, documentId: string, fileName: string): string {
    return `${tenantId}/documents/${documentId}/${fileName}`;
  }

  async uploadFile(
    tenantId: string,
    documentId: string,
    fileName: string,
    body: Buffer,
    mimeType: string
  ): Promise<string> {
    const key = this.buildS3Key(tenantId, documentId, fileName);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'tenant-id': tenantId,
          'document-id': documentId,
        },
      })
    );

    return key;
  }

  async downloadFile(s3Key: string): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      })
    );

    return response.Body as Readable;
  }

  async getPresignedUploadUrl(
    tenantId: string,
    documentId: string,
    fileName: string,
    mimeType: string,
    expiresIn = 900
  ): Promise<string> {
    const key = this.buildS3Key(tenantId, documentId, fileName);

    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
      }),
      { expiresIn }
    );
  }

  async getPresignedDownloadUrl(s3Key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }),
      { expiresIn }
    );
  }

  async deleteFile(s3Key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      })
    );
  }
}
