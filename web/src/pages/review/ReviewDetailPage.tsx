import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ArrowLeft, GripVertical, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { FinancialData, ReviewAction, Correction } from '@distill/types';
import { useReviewDetail, useSubmitReview, usePendingReviews } from '../../hooks/use-reviews';
import { PDFViewer } from '../../components/review/PDFViewer';
import { ExtractionEditor } from '../../components/review/ExtractionEditor';
import { ConfidenceHeatmap } from '../../components/review/ConfidenceHeatmap';
import { ReviewActions } from '../../components/review/ReviewActions';
import { documentApi } from '../../services/document-api'; // For getting the presigned URL or download URL

export function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useReviewDetail(id);
  const submitMutation = useSubmitReview();
  const pendingQuery = usePendingReviews({ limit: 1 }); // Pre-fetch the next pending review

  const [editedData, setEditedData] = useState<Partial<Record<keyof FinancialData, unknown>>>({});

  const [prevId, setPrevId] = useState(id);

  if (id !== prevId) {
    setPrevId(id);
    setEditedData({});
  }

  const handleFieldChange = (field: keyof FinancialData, value: unknown) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResetField = (field: keyof FinancialData) => {
    setEditedData((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const getCorrections = (): Correction[] => {
    if (!data?.extraction?.data) return [];
    const corrections: Correction[] = [];

    for (const [key, correctedValue] of Object.entries(editedData)) {
      const field = key as keyof FinancialData;
      const originalValue = data.extraction.data[field]?.value;
      corrections.push({
        field,
        originalValue,
        correctedValue,
      });
    }

    return corrections;
  };

  const handleAction = async (action: ReviewAction, notes?: string, durationMs: number = 0) => {
    if (!id) return;

    const corrections = action === 'CORRECTED' ? getCorrections() : undefined;

    try {
      await submitMutation.mutateAsync({
        id,
        body: {
          action,
          notes,
          corrections,
          durationMs,
        },
      });

      // Auto-advance
      const nextReview = pendingQuery.data?.items[0];

      const successMessages: Record<ReviewAction, string> = {
        APPROVED: 'Document approved successfully',
        CORRECTED: 'Corrections saved and approved',
        REJECTED: 'Document rejected',
        ESCALATED: 'Document escalated for senior review',
      };
      toast.success(successMessages[action]);

      if (nextReview && nextReview.id !== id) {
        toast('Moving to next review...', { icon: '➡️' });
        void navigate(`/reviews/${nextReview.id}`);
      } else {
        toast.success('All caught up! 🎉', { duration: 4000 });
        void navigate('/reviews');
      }
    } catch (err) {
      console.error('Failed to submit review action', err);
      toast.error('Failed to submit review action. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Loading review details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-red-100 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Failed to load review</h2>
          <p className="text-sm text-slate-500 mb-6">
            The review could not be loaded. It may have already been processed.
          </p>
          <button
            onClick={() => {
              void navigate('/reviews');
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  const { review, document, extraction } = data;
  const hasCorrections = Object.keys(editedData).length > 0;
  const pdfUrl = documentApi.download(document.id);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              void navigate('/reviews');
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
            title="Back to Queue"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="h-4 w-px bg-slate-300" />

          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-slate-900 truncate max-w-md">
              {document.fileName}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>
                {document.fileSize ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
              </span>
              <span>•</span>
              <span
                className={
                  review.priority === 'ESCALATED'
                    ? 'text-red-600 font-semibold'
                    : review.priority === 'HIGH'
                      ? 'text-orange-600 font-semibold'
                      : ''
                }
              >
                {review.priority || 'NORMAL'} PRIORITY
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 overflow-hidden p-4">
        <PanelGroup
          direction="horizontal"
          className="h-full rounded-xl overflow-hidden shadow-sm border border-slate-200"
        >
          {/* Left Panel: PDF Viewer */}
          <Panel defaultSize={55} minSize={30} className="bg-white">
            <PDFViewer url={pdfUrl} className="h-full rounded-none border-none" />
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-2 bg-slate-100 hover:bg-indigo-100 active:bg-indigo-200 flex items-center justify-center transition-colors cursor-col-resize z-20 relative">
            <GripVertical className="w-4 h-4 text-slate-400 absolute" />
          </PanelResizeHandle>

          {/* Right Panel: Data & Actions */}
          <Panel minSize={30} className="bg-white flex flex-col h-full">
            <div className="flex-1 overflow-auto flex flex-col xl:flex-row">
              {/* Heatmap Section */}
              <div className="w-full xl:w-2/5 shrink-0 xl:border-r border-b xl:border-b-0 border-slate-200">
                <ConfidenceHeatmap
                  extraction={extraction.data}
                  overallConfidence={extraction.overallConfidence}
                />
              </div>

              {/* Editor Section */}
              <div className="flex-1 min-w-0">
                <ExtractionEditor
                  extraction={extraction.data}
                  editedData={editedData}
                  onFieldChange={handleFieldChange}
                  onReset={handleResetField}
                />
              </div>
            </div>

            {/* Actions Section (Sticky Bottom) */}
            <div className="shrink-0 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
              <ReviewActions
                reviewId={id}
                hasCorrections={hasCorrections}
                onAction={(a, n, d) => {
                  void handleAction(a, n, d);
                }}
                isSubmitting={submitMutation.isPending}
              />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
