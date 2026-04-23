import { create } from 'zustand';
import type { User, Tenant } from '@/types';

interface AuthStore {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tenant: Tenant, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  tenant: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, tenant, token) => {
    localStorage.setItem('distill_token', token);
    localStorage.setItem('distill_user', JSON.stringify(user));
    localStorage.setItem('distill_tenant', JSON.stringify(tenant));
    set({ user, tenant, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('distill_token');
    localStorage.removeItem('distill_user');
    localStorage.removeItem('distill_tenant');
    set({ user: null, tenant: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    try {
      const token = localStorage.getItem('distill_token');
      const userStr = localStorage.getItem('distill_user');
      const tenantStr = localStorage.getItem('distill_tenant');
      if (token && userStr && tenantStr) {
        set({
          token,
          user: JSON.parse(userStr) as User,
          tenant: JSON.parse(tenantStr) as Tenant,
          isAuthenticated: true,
        });
      }
    } catch {
      set({ user: null, tenant: null, token: null, isAuthenticated: false });
    }
  },
}));

/* UI state store — sidebar, modals, etc. */
interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
