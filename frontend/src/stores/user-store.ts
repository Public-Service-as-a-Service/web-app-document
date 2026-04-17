'use client';

import type { UserDto } from '@data-contracts/backend/data-contracts';
import { emptyUser, getMe as getMeService } from '@services/user-service';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UserState {
  user: UserDto;
  setUser: (user: UserDto) => void;
  getMe: () => Promise<UserDto>;
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
