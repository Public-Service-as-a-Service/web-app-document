'use client';

import type { User } from '@interfaces/user.interface';
import { emptyUser, getMe as getMeService } from '@services/user-service';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  user: User;
  setUser: (user: User) => void;
  getMe: () => Promise<User>;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    (set) => ({
      user: emptyUser,
      setUser: (user) => set({ user }),
      getMe: async () => {
        try {
          const user = await getMeService();
          set({ user });
          return user;
        } catch (error) {
          console.error('Failed to fetch user:', error);
          return emptyUser;
        }
      },
      reset: () => set({ user: emptyUser }),
    }),
    { name: 'user-store' }
  )
);
