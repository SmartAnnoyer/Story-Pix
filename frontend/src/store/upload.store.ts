import { create } from 'zustand';
import type { UploadTask } from '@/types/media.types';

interface UploadStore {
  tasks: UploadTask[];
  addTask: (task: UploadTask) => void;
  updateTask: (id: string, patch: Partial<UploadTask>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, patch) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    })),
  removeTask: (id) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
  clearCompleted: () =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== 'done' && task.status !== 'cancelled'),
    })),
}));
