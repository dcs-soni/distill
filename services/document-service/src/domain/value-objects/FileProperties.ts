import { ValidationError } from '@distill/utils';

const ALLOWED_MIME_TYPES = ['application/pdf'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export class FileName {
  private readonly name: string;

  constructor(value: string) {
    if (!value || value.trim() === '') {
      throw new ValidationError('File name cannot be empty');
    }
    const sanitized = value
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\.{2,}/g, '.')
      .trim();
    if (sanitized.length > 255) {
      throw new ValidationError('File name exceeds 255 characters');
    }
    this.name = sanitized;
  }

  get value(): string {
    return this.name;
  }

  get extension(): string {
    const idx = this.name.lastIndexOf('.');
    return idx > 0 ? this.name.slice(idx + 1).toLowerCase() : '';
  }

  equals(other: FileName): boolean {
    return this.name === other.value;
  }
}

export class FileSize {
  private readonly bytes: number;

  constructor(value: number) {
    if (value <= 0) {
      throw new ValidationError('File size must be positive');
    }
    if (value > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `File size exceeds maximum of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`
      );
    }
    this.bytes = value;
  }

  get value(): number {
    return this.bytes;
  }

  get megabytes(): number {
    return this.bytes / (1024 * 1024);
  }

  equals(other: FileSize): boolean {
    return this.bytes === other.value;
  }
}

export class MimeType {
  private readonly type: string;

  constructor(value: string) {
    if (!ALLOWED_MIME_TYPES.includes(value)) {
      throw new ValidationError(
        `Invalid MIME type: ${value}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }
    this.type = value;
  }

  get value(): string {
    return this.type;
  }

  equals(other: MimeType): boolean {
    return this.type === other.value;
  }
}
