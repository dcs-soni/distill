declare const brand: unique symbol;

export type Branded<T, B> = T & { [brand]: B };

export type TenantId = Branded<string, 'TenantId'>;
export type DocumentId = Branded<string, 'DocumentId'>;
export type UserId = Branded<string, 'UserId'>;
export type ExtractionId = Branded<string, 'ExtractionId'>;
export type ValidationId = Branded<string, 'ValidationId'>;
export type ReviewId = Branded<string, 'ReviewId'>;
export type BatchId = Branded<string, 'BatchId'>;
