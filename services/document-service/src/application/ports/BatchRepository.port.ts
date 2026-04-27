import type { Batch } from '../../domain/entities/Batch.js';

export interface BatchRepository {
  save(batch: Batch): Promise<void>;
  findById(tenantId: string, id: string): Promise<Batch | null>;
}
