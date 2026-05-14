"use client";

import { create } from "zustand";
import { QuoteStore, UploadedFile, QuoteItem } from "@/types";
import { DEFAULT_MARKUP } from "@/lib/utils";

export const useQuoteStore = create<QuoteStore>((set) => ({
  projectName: "",
  files: [],
  markupSettings: { ...DEFAULT_MARKUP },

  setProjectName: (name) => set({ projectName: name }),

  addFile: (file) =>
    set((state) => ({ files: [...state.files, file] })),

  updateFile: (id, updates) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),

  removeFile: (id) =>
    set((state) => ({ files: state.files.filter((f) => f.id !== id) })),

  updateItem: (fileId, itemId, updates) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId
          ? {
              ...f,
              items: f.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }
          : f
      ),
    })),

  removeItem: (fileId, itemId) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId
          ? { ...f, items: f.items.filter((item) => item.id !== itemId) }
          : f
      ),
    })),

  setMarkup: (tradeType, rate) =>
    set((state) => ({
      markupSettings: { ...state.markupSettings, [tradeType]: rate },
    })),

  reset: () =>
    set({ projectName: "", files: [], markupSettings: { ...DEFAULT_MARKUP } }),
}));
