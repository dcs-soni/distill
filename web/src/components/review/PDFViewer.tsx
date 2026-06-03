import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, RotateCw } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { cn } from '../../lib/utils';

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  initialPage?: number;
  className?: string;
}

export function PDFViewer({ url, initialPage = 1, className }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [prevUrl, setPrevUrl] = useState(url);

  if (url !== prevUrl) {
    setPrevUrl(url);
    setPageNumber(initialPage);
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  const changePage = React.useCallback(
    (offset: number) => {
      setPageNumber((prevPageNumber) => {
        const newPage = prevPageNumber + offset;
        if (numPages && (newPage < 1 || newPage > numPages)) {
          return prevPageNumber;
        }
        return newPage;
      });
    },
    [numPages]
  );

  const previousPage = React.useCallback(() => {
    changePage(-1);
  }, [changePage]);

  const nextPage = React.useCallback(() => {
    changePage(1);
  }, [changePage]);

  const zoomIn = React.useCallback(() => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3.0));
  }, []);

  const zoomOut = React.useCallback(() => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
  }, []);

  function rotate() {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  }

  function resetZoom() {
    setScale(1.0);
    setRotation(0);
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') previousPage();
      else if (e.key === 'ArrowRight') nextPage();
      else if (e.key === '=' || e.key === '+') zoomIn();
      else if (e.key === '-') zoomOut();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, previousPage, nextPage, zoomIn, zoomOut]);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-slate-100 overflow-hidden rounded-md border',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1 || isLoading}
            title="Previous Page (Left Arrow)"
            className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium tabular-nums min-w-[80px] text-center">
            {isLoading ? '...' : `${pageNumber} of ${numPages || '--'}`}
          </span>
          <button
            onClick={nextPage}
            disabled={!numPages || pageNumber >= numPages || isLoading}
            title="Next Page (Right Arrow)"
            className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            title="Zoom Out (-)"
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-slate-100"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium tabular-nums w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            title="Zoom In (+)"
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-slate-100"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-slate-300 mx-1" />
          <button
            onClick={rotate}
            title="Rotate"
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-slate-100"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={resetZoom}
            title="Reset View"
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-slate-100"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 overflow-auto relative flex justify-center p-4 bg-slate-200/50">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-full w-full">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-96 w-72 bg-slate-300 rounded shadow-sm mb-4"></div>
                <span className="text-sm text-slate-500">Loading PDF...</span>
              </div>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-red-100">
                <p className="text-red-500 font-medium mb-2">Failed to load PDF</p>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  The document might be missing or you may not have permission to view it.
                </p>
              </div>
            </div>
          }
          className="flex flex-col items-center"
        >
          {!isLoading && (
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderAnnotationLayer={true}
              renderTextLayer={true}
              className="shadow-md bg-white transition-transform duration-200"
            />
          )}
        </Document>
      </div>
    </div>
  );
}
