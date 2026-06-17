import React from 'react';
import type { FinancialData } from '@distill/types';
import { RotateCcw, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExtractionEditorProps {
  extraction: FinancialData;
  editedData: Partial<Record<keyof FinancialData, unknown>>;
  onFieldChange: (field: keyof FinancialData, value: unknown) => void;
  onReset: (field: keyof FinancialData) => void;
}

const FIELD_LABELS: Record<keyof FinancialData, string> = {
  companyName: 'Company Name',
  fiscalYear: 'Fiscal Year',
  revenue: 'Revenue',
  netProfit: 'Net Profit',
  ebitda: 'EBITDA',
  totalAssets: 'Total Assets',
  totalLiabilities: 'Total Liabilities',
  currency: 'Currency',
};

const FIELD_TYPES: Record<keyof FinancialData, 'text' | 'number'> = {
  companyName: 'text',
  fiscalYear: 'number',
  revenue: 'number',
  netProfit: 'number',
  ebitda: 'number',
  totalAssets: 'number',
  totalLiabilities: 'number',
  currency: 'text',
};

function getConfidenceColor(confidence: number) {
  if (confidence >= 0.9) return 'text-green-700 bg-green-100 border-green-200';
  if (confidence >= 0.7) return 'text-amber-700 bg-amber-100 border-amber-200';
  return 'text-red-700 bg-red-100 border-red-200';
}

function getConfidenceIcon(confidence: number) {
  if (confidence >= 0.9) return <CheckCircle2 className="w-3 h-3" />;
  if (confidence >= 0.7) return <AlertTriangle className="w-3 h-3" />;
  return <AlertCircle className="w-3 h-3" />;
}

export function ExtractionEditor({
  extraction,
  editedData,
  onFieldChange,
  onReset,
}: ExtractionEditorProps) {
  const fields = Object.keys(FIELD_LABELS) as Array<keyof FinancialData>;

  return (
    <div className="flex flex-col h-full bg-white border-l">
      <div className="p-4 border-b bg-slate-50 shrink-0">
        <h2 className="text-lg font-semibold text-slate-800">Extracted Data</h2>
        <p className="text-sm text-slate-500">Review and correct the extracted values below.</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {fields.map((field) => {
          const fieldData = extraction[field];
          if (!fieldData) return null; // Safe guard

          const isEdited = field in editedData;
          const currentValue = isEdited ? editedData[field] : fieldData.value;
          const confidence = fieldData.confidence;
          const type = FIELD_TYPES[field];

          return (
            <div
              key={field as string}
              className={cn(
                'p-3 rounded-lg border transition-colors',
                isEdited ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  {FIELD_LABELS[field]}
                  {isEdited && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                      Edited
                    </span>
                  )}
                </label>
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                    getConfidenceColor(confidence)
                  )}
                  title={`Confidence: ${(confidence * 100).toFixed(1)}%`}
                >
                  {getConfidenceIcon(confidence)}
                  {Math.round(confidence * 100)}%
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type={type}
                  value={
                    currentValue === null || currentValue === undefined ? '' : String(currentValue)
                  }
                  onChange={(e) => {
                    const val = type === 'number' ? Number(e.target.value) : e.target.value;
                    onFieldChange(field, val);
                  }}
                  className="flex-1 h-9 px-3 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />

                {isEdited && (
                  <button
                    onClick={() => onReset(field)}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                    title="Reset to original extracted value"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
