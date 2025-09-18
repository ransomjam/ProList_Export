// Authentication store using Zustand

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockApi } from '@/mocks/api';
import type { User } from '@/mocks/seeds';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, role?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { user, token } = await mockApi.login(email, role);
          set({ user, token, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await mockApi.logout();
          set({ user: null, token: null, isLoading: false, error: null });
        } catch (error) {
          console.error('Logout error:', error);
          // Force logout on error
          set({ user: null, token: null, isLoading: false, error: null });
        }
      },

      checkAuth: async () => {
        // Don't show loading for auth checks
        try {
          const user = await mockApi.getCurrentUser();
          const token = mockApi.getAuthToken();
          
          if (user && token) {
            set({ user, token });
          } else {
            set({ user: null, token: null });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({ user: null, token: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'prolist-auth',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token 
      }),
    }
  )
);