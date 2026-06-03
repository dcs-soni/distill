import React, { useState, useEffect } from 'react';
import type { ReviewAction } from '@distill/types';
import { Check, Edit3, X, ArrowUpRight, Clock, Loader2 } from 'lucide-react';
import { useReviewTimer } from '../../hooks/use-review-timer';
import { cn } from '../../lib/utils';

interface ReviewActionsProps {
  reviewId: string;
  hasCorrections: boolean;
  onAction: (action: ReviewAction, notes?: string, durationMs?: number) => void;
  isSubmitting: boolean;
}

export function ReviewActions({ hasCorrections, onAction, isSubmitting }: ReviewActionsProps) {
  const { elapsedMs, formattedTime } = useReviewTimer();
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    action: 'REJECTED' | 'ESCALATED' | null;
    title: string;
  }>({ isOpen: false, action: null, title: '' });
  const [notes, setNotes] = useState('');

  const openDialog = React.useCallback((action: 'REJECTED' | 'ESCALATED') => {
    setDialogConfig({
      isOpen: true,
      action,
      title: action === 'REJECTED' ? 'Reject Document' : 'Escalate Document',
    });
    setNotes('');
  }, []);

  const closeDialog = () => {
    setDialogConfig({ isOpen: false, action: null, title: '' });
    setNotes('');
  };

  const handleConfirmAction = () => {
    if (dialogConfig.action && notes.trim().length >= 10) {
      onAction(dialogConfig.action, notes, elapsedMs);
      closeDialog();
    }
  };

  const handlePrimaryAction = React.useCallback(
    (action: 'APPROVED' | 'CORRECTED') => {
      onAction(action, undefined, elapsedMs);
    },
    [onAction, elapsedMs]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (dialogConfig.isOpen) return; // Don't trigger primary actions if dialog is open

      if (e.key === 'a' || e.key === 'A') {
        if (!hasCorrections && !isSubmitting) handlePrimaryAction('APPROVED');
      } else if (e.key === 'c' || e.key === 'C') {
        if (hasCorrections && !isSubmitting) handlePrimaryAction('CORRECTED');
      } else if (e.key === 'r' || e.key === 'R') {
        if (!isSubmitting) openDialog('REJECTED');
      } else if (e.key === 'e' || e.key === 'E') {
        if (!isSubmitting) openDialog('ESCALATED');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    hasCorrections,
    isSubmitting,
    dialogConfig.isOpen,
    elapsedMs,
    handlePrimaryAction,
    openDialog,
  ]);

  return (
    <>
      <div className="flex flex-col border-t border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-700">Review Actions</h3>
          <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium bg-slate-100 px-2 py-1 rounded-md">
            <Clock className="w-4 h-4" />
            <span className="tabular-nums">{formattedTime}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handlePrimaryAction('APPROVED')}
            disabled={hasCorrections || isSubmitting}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
          >
            {isSubmitting && !hasCorrections ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Approve
            <kbd className="hidden sm:inline-block ml-auto text-[10px] bg-green-800/30 px-1.5 py-0.5 rounded text-white/90">
              A
            </kbd>
          </button>

          <button
            onClick={() => handlePrimaryAction('CORRECTED')}
            disabled={!hasCorrections || isSubmitting}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-md font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500"
          >
            {isSubmitting && hasCorrections ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Edit3 className="w-4 h-4" />
            )}
            Correct & Approve
            <kbd className="hidden sm:inline-block ml-auto text-[10px] bg-indigo-800/30 px-1.5 py-0.5 rounded text-white/90">
              C
            </kbd>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={() => openDialog('REJECTED')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-md font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-red-200 text-red-600 hover:bg-red-50 focus:ring-red-500"
          >
            <X className="w-4 h-4" />
            Reject
            <kbd className="hidden sm:inline-block ml-auto text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
              R
            </kbd>
          </button>

          <button
            onClick={() => openDialog('ESCALATED')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-md font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 focus:ring-amber-500"
          >
            <ArrowUpRight className="w-4 h-4" />
            Escalate
            <kbd className="hidden sm:inline-block ml-auto text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
              E
            </kbd>
          </button>
        </div>
      </div>

      {/* Dialog Overlay */}
      {dialogConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">{dialogConfig.title}</h3>
              <p className="text-sm text-slate-500 mt-1">
                Please provide a reason for this action (min 10 characters).
              </p>
            </div>

            <div className="p-5">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter notes..."
                className="w-full h-32 p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                autoFocus
              />
              <div className="flex justify-between items-center mt-2">
                <span
                  className={cn('text-xs', notes.length < 10 ? 'text-red-500' : 'text-green-600')}
                >
                  {notes.length} / 10 characters min
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={closeDialog}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={notes.trim().length < 10}
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  dialogConfig.action === 'REJECTED'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                )}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
