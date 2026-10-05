import { create } from 'zustand';
import { RowData } from '@/types';
import { remarkSnapshot } from '@/lib/remarks';

const STORAGE_KEY = 'sheet-remark-read-v1';

interface RemarkReadStore {
  snapshots: Record<string, string>;
  hydrated: boolean;
  hydrate: () => void;
  markRead: (row: RowData) => void;
}

function readSnapshots(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export const useRemarkReadStore = create<RemarkReadStore>((set, get) => ({
  snapshots: {},
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({ snapshots: readSnapshots(), hydrated: true });
  },

  markRead: (row) => {
    const snapshots = { ...get().snapshots, [row.id]: remarkSnapshot(row) };
    set({ snapshots });
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  },
}));

export function useRemarkUnread(row: RowData | undefined): boolean {
  const hydrated = useRemarkReadStore((state) => state.hydrated);
  const snapshots = useRemarkReadStore((state) => state.snapshots);
  if (!hydrated || !row) return false;
  const snapshot = remarkSnapshot(row);
  if (snapshot.trim() === '') return false;
  return snapshots[row.id] !== snapshot;
}
