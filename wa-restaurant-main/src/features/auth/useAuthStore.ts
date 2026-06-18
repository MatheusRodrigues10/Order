import { create } from "zustand";

const TOKEN_KEY = "wa_token";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
}

const readToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const useAuthStore = create<AuthState>((set) => ({
  token: readToken(),
  isAuthenticated: !!readToken(),

  setToken: (token) => {
    if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
    set({ token, isAuthenticated: true });
  },

  clearToken: () => {
    if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
    set({ token: null, isAuthenticated: false });
  },
}));
