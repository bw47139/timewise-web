import { create } from "zustand";

interface User {
  id: number;
  name: string;
  email: string;
  organizationId: number;
}

interface UserState {
  user: User | null;
  setUser: (u: User | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
}));
