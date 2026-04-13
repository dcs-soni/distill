import { ValidationError } from '@distill/utils';

export class Email {
  private readonly address: string;

  constructor(address: string) {
    if (!address) {
      throw new ValidationError('Email address cannot be empty');
    }
    const sanitized = address.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      throw new ValidationError(`Invalid email address format: ${address}`);
    }
    this.address = sanitized;
  }

  get value(): string {
    return this.address;
  }

  equals(other: Email): boolean {
    return this.address === other.value;
  }
}
