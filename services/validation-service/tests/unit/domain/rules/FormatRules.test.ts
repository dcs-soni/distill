import { describe, it, expect } from 'vitest';
import { RevenueIsNumber } from '../../../../src/domain/rules/FormatRules';
import { Extraction } from '@distill/types';
import { TenantValidationConfig } from '../../../../src/domain/value-objects/TenantValidationConfig';

describe('FormatRules', () => {
  describe('RevenueIsNumber', () => {
    it('should pass when revenue is a valid number', () => {
      const rule = new RevenueIsNumber();
      const mockExtraction = {
        data: {
          revenue: { value: 1000000 },
          netProfit: { value: 500000 },
          companyName: { value: 'Test Corp' },
          fiscalYear: { value: '2023' },
        },
      } as unknown as Extraction;
      const result = rule.validate(mockExtraction, {} as unknown as TenantValidationConfig);

      expect(result.passed).toBe(true);
    });

    it('should pass when revenue is null', () => {
      const rule = new RevenueIsNumber();
      const mockExtraction = {
        data: {
          revenue: { value: null },
          netProfit: { value: 500000 },
          companyName: { value: 'Test Corp' },
          fiscalYear: { value: '2023' },
        },
      } as unknown as Extraction;
      const result = rule.validate(mockExtraction, {} as unknown as TenantValidationConfig);

      expect(result.passed).toBe(true);
    });
  });
});
