import React from 'react';
import type { FinancialData } from '@distill/types';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfidenceHeatmapProps {
  extraction: FinancialData;
  overallConfidence: number;
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

function getConfidenceColor(confidence: number, type: 'bg' | 'text' | 'border' | 'fill' = 'bg') {
  if (confidence >= 0.9) {
    if (type === 'bg') return 'bg-green-500';
    if (type === 'text') return 'text-green-600';
    if (type === 'border') return 'border-green-200';
    if (type === 'fill') return 'fill-green-500';
  }
  if (confidence >= 0.7) {
    if (type === 'bg') return 'bg-amber-500';
    if (type === 'text') return 'text-amber-600';
    if (type === 'border') return 'border-amber-200';
    if (type === 'fill') return 'fill-amber-500';
  }
  if (type === 'bg') return 'bg-red-500';
  if (type === 'text') return 'text-red-600';
  if (type === 'border') return 'border-red-200';
  if (type === 'fill') return 'fill-red-500';
  return '';
}

function CircularProgress({ value }: { value: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - value * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90 w-24 h-24">
        {/* Background circle */}
        <circle
          className="text-slate-200"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="48"
          cy="48"
        />
        {/* Progress circle */}
        <circle
          className={getConfidenceColor(value, 'text')}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="48"
          cy="48"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={cn('text-xl font-bold', getConfidenceColor(value, 'text'))}>
          {Math.round(value * 100)}%
        </span>
      </div>
    </div>
  );
}

export function ConfidenceHeatmap({ extraction, overallConfidence }: ConfidenceHeatmapProps) {
  const fields = Object.keys(FIELD_LABELS) as Array<keyof FinancialData>;

  // Sort fields by confidence (lowest first)
  const sortedFields = fields
    .filter((f) => extraction[f] !== undefined)
    .sort((a, b) => extraction[a].confidence - extraction[b].confidence);

  return (
    <div className="flex flex-col h-full bg-white border-l border-t border-slate-200">
      <div className="p-4 border-b bg-slate-50 shrink-0 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-slate-500" />
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Confidence Analysis</h2>
          <p className="text-sm text-slate-500">AI extraction confidence metrics.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Overall Confidence</h3>
          <CircularProgress value={overallConfidence} />
          <p className="text-xs text-slate-400 mt-2 text-center">
            Weighted average of all extracted fields.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">Field Breakdown</h3>
          <div className="space-y-3">
            {sortedFields.map((field) => {
              const fieldData = extraction[field];
              const conf = fieldData.confidence;

              return (
                <div key={field as string} className="group">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      {conf < 0.7 ? <AlertCircle className="w-3 h-3 text-red-500" /> : null}
                      {FIELD_LABELS[field]}
                    </span>
                    <span className={cn('text-xs font-semibold', getConfidenceColor(conf, 'text'))}>
                      {Math.round(conf * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-500',
                        getConfidenceColor(conf, 'bg')
                      )}
                      style={{ width: `${conf * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
