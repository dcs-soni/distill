import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { logger } from '@distill/utils/src/logger.js';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailAdapter {
  private isEnabled: boolean;
  private fromEmail: string;

  constructor() {
    this.isEnabled = process.env.EMAIL_ENABLED === 'true';
    this.fromEmail = process.env.SMTP_FROM || 'noreply@distill.com';

    if (this.isEnabled) {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        logger.warn('Email is enabled but SENDGRID_API_KEY is not set');
        this.isEnabled = false;
      } else {
        sgMail.setApiKey(apiKey);
      }
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.isEnabled) {
      logger.debug({ to: options.to, subject: options.subject }, 'Email disabled, skipping send');
      return;
    }

    try {
      const message = {
        to: options.to,
        from: this.fromEmail,
        subject: options.subject,
      } as MailDataRequired;
      if (options.text) message.text = options.text;
      if (options.html) message.html = options.html;

      await sgMail.send(message);
      logger.info({ to: options.to, subject: options.subject }, 'Email sent successfully');
    } catch (error) {
      logger.error({ error, to: options.to }, 'Failed to send email');
    }
  }

  async sendDocumentFailedEmail(
    to: string,
    documentName: string,
    errorReason: string
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Document Processing Failed: ${documentName}`,
      html: `
        <h2>Document Processing Failed</h2>
        <p>The following document failed processing:</p>
        <p><strong>Document:</strong> ${documentName}</p>
        <p><strong>Reason:</strong> ${errorReason}</p>
        <br/>
        <p>Please check the Distill dashboard for more details.</p>
      `,
    });
  }
}

export const emailAdapter = new EmailAdapter();
