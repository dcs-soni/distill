export const servicesConfig = {
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  documentServiceUrl: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3002',
  extractionServiceUrl: process.env.EXTRACTION_SERVICE_URL || 'http://localhost:3003',
  validationServiceUrl: process.env.VALIDATION_SERVICE_URL || 'http://localhost:3004',
  reviewServiceUrl: process.env.REVIEW_SERVICE_URL || 'http://localhost:3005',
  analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
};
