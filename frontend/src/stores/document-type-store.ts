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
    } catch (error) {
      set({ loading: false, error: 'Failed to fetch document types' });
    }
  },

  createType: async (data) => {
    try {
      await apiService.post('admin/documenttypes', data);
      await get().fetchTypes();
    } catch (error) {
      set({ error: 'Failed to create document type' });
      throw error;
    }
  },

  updateType: async (type, data) => {
    try {
      await apiService.patch(`admin/documenttypes/${type}`, data);
      await get().fetchTypes();
    } catch (error) {
      set({ error: 'Failed to update document type' });
      throw error;
    }
  },

  getDisplayName: (type: string) => {
    const found = get().types.find((t) => t.type === type);
    return found?.displayName || type;
  },

  deleteType: async (type) => {
    try {
      await apiService.del(`admin/documenttypes/${type}`);
      await get().fetchTypes();
    } catch (error) {
      set({ error: 'Failed to delete document type' });
      throw error;
    }
  },
}));
