import { create } from 'zustand';

/**
 * Short notices shown over the 3D view (user request 1 Oct 2026): automatic adjustments, forced choices
 * and later rule conflicts. Each notice closes after `durationMs` or on the close button.
 */
export type Notice = { id: number; title: string; message: string; durationMs: number };

type NoticeState = {
  notices: Notice[];
  push: (notice: { title: string; message: string; durationMs?: number }) => number;
  dismiss: (id: number) => void;
};

let nextId = 1;
export const useNoticeStore = create<NoticeState>((set) => ({
  notices: [],
  push: ({ title, message, durationMs = 6000 }) => {
    const id = nextId++;
    set((state) => ({ notices: [...state.notices.filter((entry) => entry.message !== message), { id, title, message, durationMs }] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ notices: state.notices.filter((entry) => entry.id !== id) })),
}));
