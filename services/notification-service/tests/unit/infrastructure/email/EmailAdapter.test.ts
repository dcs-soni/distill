import { describe, it, expect, vi, beforeEach } from 'vitest';
import sgMail from '@sendgrid/mail';
import { EmailAdapter } from '../../../../src/infrastructure/email/EmailAdapter.js';

vi.mock('@sendgrid/mail', () => {
  return {
    default: {
      setApiKey: vi.fn(),
      send: vi.fn(),
    },
  };
});

describe('EmailAdapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.EMAIL_ENABLED = 'true';
    process.env.SENDGRID_API_KEY = 'test-api-key';
    process.env.SMTP_FROM = 'test@distill.local';
  });

  it('should initialize successfully when enabled and API key is present', () => {
    new EmailAdapter();
    expect(sgMail.setApiKey).toHaveBeenCalledWith('test-api-key');
  });

  it('should disable itself if API key is missing', () => {
    delete process.env.SENDGRID_API_KEY;
    const adapter = new EmailAdapter();
    // Use type assertion to access private property for testing
    expect((adapter as any).isEnabled).toBe(false);
  });

  it('should send email if enabled', async () => {
    const adapter = new EmailAdapter();
    await adapter.sendEmail({
      to: 'recipient@test.com',
      subject: 'Test Subject',
      text: 'Test Body',
    });

    expect(sgMail.send).toHaveBeenCalledWith({
      to: 'recipient@test.com',
      from: 'test@distill.local',
      subject: 'Test Subject',
      text: 'Test Body',
    });
  });

  it('should format failure email correctly', async () => {
    const adapter = new EmailAdapter();
    await adapter.sendDocumentFailedEmail('admin@test.com', 'test.pdf', 'Timeout');

    expect(sgMail.send).toHaveBeenCalled();
    const callArg = vi.mocked(sgMail.send).mock.calls[0][0] as any;
    expect(callArg.subject).toContain('Document Processing Failed: test.pdf');
    expect(callArg.html).toContain('test.pdf');
    expect(callArg.html).toContain('Timeout');
  });
});
