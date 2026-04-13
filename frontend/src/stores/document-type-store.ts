'use client';

import { create } from 'zustand';
import { apiService, ApiResponse } from '@services/api-service';
import type { DocumentType } from '@interfaces/document.interface';

interface DocumentTypeState {
  types: DocumentType[];
  loading: boolean;
  error: string | null;

  fetchTypes: () => Promise<void>;
  createType: (data: { type: string; displayName: string; createdBy: string }) => Promise<void>;
  updateType: (type: string, data: { displayName?: string; updatedBy: string }) => Promise<void>;
  deleteType: (type: string) => Promise<void>;
  getDisplayName: (type: string) => string;
}

export const useDocumentTypeStore = create<DocumentTypeState>((set, get) => ({
  types: [],
  loading: false,
  error: null,

  fetchTypes: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiService.get<ApiResponse<DocumentType[]>>('admin/documenttypes');
      set({ types: res.data.data || [], loading: false });
    } catch {
      set({ loading: false, error: 'Failed to fetch document types' });
    }
  },

  createType: async (data) => {
    await apiService.post('admin/documenttypes', data);
    await get().fetchTypes();
  },

  updateType: async (type, data) => {
    await apiService.patch(`admin/documenttypes/${type}`, data);
    await get().fetchTypes();
  },

  getDisplayName: (type: string) => {
    const found = get().types.find((t) => t.type === type);
    return found?.displayName || type;
  },

  deleteType: async (type) => {
    await apiService.del(`admin/documenttypes/${type}`);
    await get().fetchTypes();
  },
}));
