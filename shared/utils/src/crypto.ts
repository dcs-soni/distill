import { init } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';

const cuid = init({
  length: 24,
});

export const generateId = (): string => cuid();

export const hashValue = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

export const sanitizeInput = (input: string): string => {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
};
