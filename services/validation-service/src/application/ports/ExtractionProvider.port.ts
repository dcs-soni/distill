import { Extraction } from '@distill/types';

export interface ExtractionProvider {
  getExtraction(tenantId: string, extractionId: string): Promise<Extraction>;
}
