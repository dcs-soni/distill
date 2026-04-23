import { describe, it, expect } from 'vitest';
import { FileName, FileSize, MimeType } from '../../../src/domain/value-objects/FileProperties.js';

describe('FileName Value Object', () => {
  it('creates a valid file name', () => {
    const fn = new FileName('annual-report-2025.pdf');
    expect(fn.value).toBe('annual-report-2025.pdf');
  });

  it('sanitizes dangerous characters', () => {
    const fn = new FileName('report<test>:file.pdf');
    expect(fn.value).toBe('report_test__file.pdf');
  });

  it('sanitizes consecutive dots', () => {
    const fn = new FileName('report...pdf');
    expect(fn.value).toBe('report.pdf');
  });

  it('trims whitespace', () => {
    const fn = new FileName('  report.pdf  ');
    expect(fn.value).toBe('report.pdf');
  });

  it('throws when empty', () => {
    expect(() => new FileName('')).toThrow('cannot be empty');
  });

  it('throws when whitespace only', () => {
    expect(() => new FileName('   ')).toThrow('cannot be empty');
  });

  it('throws when exceeds 255 characters', () => {
    const longName = 'a'.repeat(256) + '.pdf';
    expect(() => new FileName(longName)).toThrow('255 characters');
  });

  it('allows exactly 255 characters', () => {
    const name = 'a'.repeat(251) + '.pdf';
    expect(() => new FileName(name)).not.toThrow();
  });

  describe('extension', () => {
    it('extracts pdf extension', () => {
      expect(new FileName('report.pdf').extension).toBe('pdf');
    });

    it('extracts extension in lowercase', () => {
      expect(new FileName('report.PDF').extension).toBe('pdf');
    });

    it('returns empty for no extension', () => {
      expect(new FileName('report').extension).toBe('');
    });

    it('returns last extension for multiple dots', () => {
      expect(new FileName('report.backup.pdf').extension).toBe('pdf');
    });
  });

  describe('equals', () => {
    it('returns true for same name', () => {
      expect(new FileName('a.pdf').equals(new FileName('a.pdf'))).toBe(true);
    });

    it('returns false for different names', () => {
      expect(new FileName('a.pdf').equals(new FileName('b.pdf'))).toBe(false);
    });
  });
});

describe('FileSize Value Object', () => {
  it('creates valid file size', () => {
    const fs = new FileSize(1024);
    expect(fs.value).toBe(1024);
  });

  it('calculates megabytes', () => {
    const fs = new FileSize(1024 * 1024);
    expect(fs.megabytes).toBe(1);
  });

  it('calculates fractional megabytes', () => {
    const fs = new FileSize(512 * 1024);
    expect(fs.megabytes).toBe(0.5);
  });

  it('throws when zero', () => {
    expect(() => new FileSize(0)).toThrow('must be positive');
  });

  it('throws when negative', () => {
    expect(() => new FileSize(-100)).toThrow('must be positive');
  });

  it('throws when exceeds 50MB', () => {
    const overLimit = 50 * 1024 * 1024 + 1;
    expect(() => new FileSize(overLimit)).toThrow('50MB');
  });

  it('allows exactly 50MB', () => {
    const exactly50MB = 50 * 1024 * 1024;
    const fs = new FileSize(exactly50MB);
    expect(fs.megabytes).toBe(50);
  });

  describe('equals', () => {
    it('returns true for same size', () => {
      expect(new FileSize(1024).equals(new FileSize(1024))).toBe(true);
    });

    it('returns false for different sizes', () => {
      expect(new FileSize(1024).equals(new FileSize(2048))).toBe(false);
    });
  });
});

describe('MimeType Value Object', () => {
  it('creates valid PDF mime type', () => {
    const mt = new MimeType('application/pdf');
    expect(mt.value).toBe('application/pdf');
  });

  it('throws for image/png', () => {
    expect(() => new MimeType('image/png')).toThrow('Invalid MIME type');
  });

  it('throws for text/plain', () => {
    expect(() => new MimeType('text/plain')).toThrow('Invalid MIME type');
  });

  it('throws for application/json', () => {
    expect(() => new MimeType('application/json')).toThrow('Invalid MIME type');
  });

  it('throws for empty string', () => {
    expect(() => new MimeType('')).toThrow('Invalid MIME type');
  });

  it('includes allowed types in error message', () => {
    try {
      new MimeType('image/jpeg');
    } catch (err: any) {
      expect(err.message).toContain('application/pdf');
    }
  });

  describe('equals', () => {
    it('returns true for same type', () => {
      expect(new MimeType('application/pdf').equals(new MimeType('application/pdf'))).toBe(true);
    });
  });
});
