import { useAuthStore, useUIStore } from '@/stores';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b px-6 backdrop-blur-lg transition-all duration-300"
      style={{
        backgroundColor: 'rgba(9, 9, 11, 0.8)',
        borderColor: 'var(--color-border)',
        marginLeft: collapsed ? '4rem' : '15rem',
      }}
    >
      <div />

      <div className="flex items-center gap-4">
        {/* User menu */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
          </div>
          {user && (
            <span
              className="hidden text-sm font-medium sm:block"
              style={{ color: 'var(--color-foreground)' }}
            >
              {user.name}
            </span>
          )}
          <button
            onClick={logout}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-white/10"
            style={{ color: 'var(--color-muted-foreground)' }}
            type="button"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
