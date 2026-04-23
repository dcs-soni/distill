import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, ProtectedRoute } from './AuthProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { DocumentsPage } from '@/pages/documents/DocumentsPage';
import { DocumentDetailPage } from '@/pages/documents/DocumentDetailPage';

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

              {/* Placeholder routes for future milestones */}
              <Route
                path="/review"
                element={<PlaceholderPage title="Review Queue" milestone="M6" />}
              />
              <Route
                path="/review/:id"
                element={<PlaceholderPage title="Review Detail" milestone="M6" />}
              />
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
