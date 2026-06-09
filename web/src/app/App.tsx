import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, ProtectedRoute } from './AuthProvider';
import { SocketProvider } from './SocketProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { DocumentsPage } from '@/pages/documents/DocumentsPage';
import { DocumentDetailPage } from '@/pages/documents/DocumentDetailPage';
import { ReviewQueuePage } from '@/pages/review/ReviewQueuePage';
import { ReviewDetailPage } from '@/pages/review/ReviewDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/documents/:id" element={<DocumentDetailPage />} />

                {/* Review Routes */}
                <Route path="/reviews" element={<ReviewQueuePage />} />
                <Route path="/reviews/:id" element={<ReviewDetailPage />} />
                <Route
                  path="/analytics"
                  element={<PlaceholderPage title="Analytics" milestone="M8" />}
                />
                <Route
                  path="/settings"
                  element={<PlaceholderPage title="Settings" milestone="M9" />}
                />
              </Route>

              {/* Catch-all — redirect to dashboard */}
              <Route path="*" element={<LoginPage />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" />
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function PlaceholderPage({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h2 className="text-xl font-bold" style={{ color: 'var(--color-foreground)' }}>
        {title}
      </h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        This page will be implemented in {milestone}.
      </p>
    </div>
  );
}
