import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';

export interface IUserProfile {
  id: string;
  identifier: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'mentor' | 'student';
}

interface AuthState {
  user: IUserProfile | null;
  token: string | null;
  isLoading: boolean;
  hasRestored: boolean;
  sessionTransitionText: string | null;
  setAuth: (token: string, user: IUserProfile) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  hasRestored: false,
  sessionTransitionText: null,

  setAuth: async (token: string, user: IUserProfile) => {
    // Triggers the VTU Session Transition screen with custom role status text
    set({
      sessionTransitionText: `AUTHENTICATING ${user.role.toUpperCase()} SESSION...`,
    });

    try {
      if (apiClient?.defaults?.headers) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      await SecureStore.setItemAsync('oms_jwt_token', token);
      await SecureStore.setItemAsync('oms_user', JSON.stringify(user));
    } catch (err) {
      console.warn('[setAuth Warning]:', err);
    }

    // Brief smooth pause to let the user experience the transition animation
    await new Promise((resolve) => setTimeout(resolve, 650));

    set({
      token,
      user,
      isLoading: false,
      hasRestored: true,
      sessionTransitionText: null,
    });
  },

  logout: async () => {
    // Triggers the exact VTU "CLOSING SESSION..." transition screen
    set({ sessionTransitionText: 'CLOSING SESSION...' });

    try {
      if (apiClient?.defaults?.headers?.common) {
        delete apiClient.defaults.headers.common['Authorization'];
      }
      await SecureStore.deleteItemAsync('oms_jwt_token');
      await SecureStore.deleteItemAsync('oms_user');
    } catch (err) {
      console.warn('[logout Warning]:', err);
    }

    // Brief smooth pause for the closing transition effect
    await new Promise((resolve) => setTimeout(resolve, 750));

    set({
      token: null,
      user: null,
      isLoading: false,
      hasRestored: true,
      sessionTransitionText: null,
    });
  },

  restoreSession: async () => {
    if (get().hasRestored) return;
    set({ isLoading: true });
    try {
      const storedToken = await SecureStore.getItemAsync('oms_jwt_token');
      const storedUserJson = await SecureStore.getItemAsync('oms_user');

      if (storedToken && storedUserJson) {
        const parsedUser: IUserProfile = JSON.parse(storedUserJson);
        if (apiClient?.defaults?.headers) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        set({
          token: storedToken,
          user: parsedUser,
          isLoading: false,
          hasRestored: true,
        });
        return;
      }
    } catch (err) {
      console.warn('[restoreSession Notice]:', err);
    } finally {
      set({ isLoading: false, hasRestored: true });
    }
  },
}));

export default useAuthStore;