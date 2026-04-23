import { NavLink, useLocation } from 'react-router-dom';
import {
  FileText,
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/review', icon: ClipboardCheck, label: 'Review' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{
        backgroundColor: 'var(--color-sidebar)',
        borderColor: 'var(--color-sidebar-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex h-16 items-center gap-3 border-b px-4"
        style={{ borderColor: 'var(--color-sidebar-border)' }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), #818cf8)' }}
        >
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: 'var(--color-foreground)' }}
          >
            Distill
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                collapsed && 'justify-center px-2'
              )}
              style={{
                color: isActive
                  ? 'var(--color-sidebar-accent-foreground)'
                  : 'var(--color-sidebar-foreground)',
                backgroundColor: isActive ? 'var(--color-sidebar-accent)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--color-sidebar-accent)';
                  e.currentTarget.style.color = 'var(--color-foreground)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-sidebar-foreground)';
                }
              }}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex h-12 items-center justify-center border-t transition-colors duration-200 hover:bg-white/5"
        style={{
          borderColor: 'var(--color-sidebar-border)',
          color: 'var(--color-sidebar-foreground)',
        }}
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
