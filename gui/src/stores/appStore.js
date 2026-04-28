import { create } from 'zustand';

// 简化版 store
const useAppStore = create((set, get) => ({
  // UI 状态
  currentPage: 'dashboard',
  sidebarCollapsed: false,

  // 任务状态
  taskStatus: 'idle',
  progress: 0,
  progressText: '',

  // 文件统计
  totalFiles: 0,
  processedFiles: 0,
  successCount: 0,
  failCount: 0,

  // 文件浏览器
  currentPath: '',
  subFolders: [],
  currentFiles: [],
  selectedFile: null,
  fileDetailVisible: false,
  isLoadingFiles: false,
  commonDirectories: [],

  // 日志
  logs: [],

  // Actions
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setTaskStatus: (status) => set({ taskStatus: status }),
  setProgress: (progress, text) => set({ progress, progressText: text }),

  updateStats: (stats) => set((state) => ({
    totalFiles: stats.totalFiles ?? state.totalFiles,
    processedFiles: stats.processedFiles ?? state.processedFiles,
    successCount: stats.successCount ?? state.successCount,
    failCount: stats.failCount ?? state.failCount,
  })),

  setCurrentPath: (path) => set({ currentPath: path }),
  setSubFolders: (folders) => set({ subFolders: folders }),
  setCurrentFiles: (files) => set({ currentFiles: files }),
  selectFile: (file) => set({ selectedFile: file, fileDetailVisible: true }),
  closeFileDetail: () => set({ fileDetailVisible: false, selectedFile: null }),
  setIsLoadingFiles: (loading) => set({ isLoadingFiles: loading }),
  setCommonDirectories: (dirs) => set({ commonDirectories: dirs }),

  addLog: (log) => set((state) => ({
    logs: [...state.logs.slice(-1000), { ...log, timestamp: new Date().toISOString() }]
  })),
}));

export default useAppStore;

export const useStats = () => {
  const s = useAppStore.getState();
  return {
    totalFiles: s.totalFiles,
    processedFiles: s.processedFiles,
    successCount: s.successCount,
    failCount: s.failCount,
  };
};

export const useLogs = () => useAppStore.getState().logs;