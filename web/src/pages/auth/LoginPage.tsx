import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { Zap } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = () => {
    /* In production, this redirects to the OIDC provider via the gateway.
       For local dev, we set a mock session to bypass auth. */
    const mockUser = {
      id: 'user-dev-1',
      email: 'dev@distill.io',
      name: 'Dev User',
      isActive: true,
    };
    const mockTenant = {
      id: 'tenant-dev-1',
      name: 'Development Org',
      slug: 'dev-org',
      plan: 'ENTERPRISE',
    };
    setAuth(mockUser, mockTenant, 'dev-jwt-token');
    void navigate('/');
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div
        className="w-full max-w-sm space-y-8 rounded-2xl border p-8 animate-fade-in"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-card)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), #818cf8)' }}
          >
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-foreground)' }}
          >
            Distill
          </h1>
          <p className="text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Enterprise Financial Data Extraction Platform
          </p>
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), #818cf8)',
            color: '#fff',
          }}
          type="button"
          id="login-btn"
        >
          Sign in with SSO
        </button>

        <p className="text-center text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          Protected by enterprise-grade OIDC authentication
        </p>
      </div>
    </div>
  );
}
