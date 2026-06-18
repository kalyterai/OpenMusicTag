import { create } from 'zustand';

const defaultWorkflowConfig = {
  inputPath: '',
  outputPath: '',
  threads: 4,
  enableCoverDownload: true,
  enableSimplifiedChinese: true,
  enableDuplicateCheck: true,
  enableFilenameParse: true,
  enableMetadataScrape: true,
};

const defaultSettings = {
  enableCoverDownload: true,
  enableSimplifiedChinese: true,
  enableDuplicateCheck: true,
  enableFilenameParse: true,
  enableMetadataScrape: true,
  autoOrganize: true,
  preserveOriginal: true,
  threads: 4,
};

const appendLog = (logs, log) => [
  ...logs.slice(-999),
  {
    type: log.type || log.level || 'info',
    level: log.level || log.type || 'info',
    message: log.message || '',
    file: log.file,
    timestamp: log.timestamp || new Date().toISOString(),
  },
];

const useAppStore = create((set) => ({
  // UI 状态
  currentPage: 'dashboard',
  sidebarCollapsed: false,

  // 任务状态
  taskStatus: 'idle',
  progress: 0,
  progressText: '',
  progressLogs: [],

  // 文件统计
  totalFiles: 0,
  processedFiles: 0,
  successCount: 0,
  failCount: 0,

  // 工作流和设置
  workflowStep: 1,
  workflowConfig: defaultWorkflowConfig,
  config: defaultSettings,
  history: [],

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

  // UI Actions
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Task Actions
  setTaskStatus: (status) => set({ taskStatus: status }),
  setProgress: (progress, text = '') => set({
    progress: Math.max(0, Math.min(100, Math.round(progress || 0))),
    progressText: text,
  }),
  updateStats: (stats) => set((state) => ({
    totalFiles: stats.totalFiles ?? state.totalFiles,
    processedFiles: stats.processedFiles ?? state.processedFiles,
    successCount: stats.successCount ?? state.successCount,
    failCount: stats.failCount ?? state.failCount,
  })),
  addProgressLog: (log) => set((state) => ({
    progressLogs: appendLog(state.progressLogs, log),
  })),
  resetTask: () => set({
    taskStatus: 'idle',
    progress: 0,
    progressText: '',
    progressLogs: [],
    totalFiles: 0,
    processedFiles: 0,
    successCount: 0,
    failCount: 0,
  }),

  // Workflow Actions
  setWorkflowStep: (step) => set({ workflowStep: step }),
  updateWorkflowConfig: (config) => set((state) => ({
    workflowConfig: { ...state.workflowConfig, ...config },
  })),
  resetWorkflow: () => set({
    workflowStep: 1,
    workflowConfig: defaultWorkflowConfig,
  }),

  // Settings Actions
  updateConfig: (config) => set((state) => ({
    config: { ...state.config, ...config },
    workflowConfig: {
      ...state.workflowConfig,
      threads: config.threads ?? state.workflowConfig.threads,
      enableCoverDownload: config.enableCoverDownload ?? state.workflowConfig.enableCoverDownload,
      enableSimplifiedChinese: config.enableSimplifiedChinese ?? state.workflowConfig.enableSimplifiedChinese,
      enableDuplicateCheck: config.enableDuplicateCheck ?? state.workflowConfig.enableDuplicateCheck,
      enableFilenameParse: config.enableFilenameParse ?? state.workflowConfig.enableFilenameParse,
      enableMetadataScrape: config.enableMetadataScrape ?? state.workflowConfig.enableMetadataScrape,
    },
  })),
  addHistory: (entry) => set((state) => ({
    history: [
      {
        ...entry,
        id: entry.id || `${Date.now()}-${state.history.length}`,
        createdAt: entry.createdAt || new Date().toISOString(),
      },
      ...state.history,
    ].slice(0, 100),
  })),

  // File browser Actions
  setCurrentPath: (path) => set({ currentPath: path }),
  setSubFolders: (folders) => set({ subFolders: folders }),
  setCurrentFiles: (files) => set({ currentFiles: files }),
  selectFile: (file) => set({ selectedFile: file, fileDetailVisible: true }),
  closeFileDetail: () => set({ fileDetailVisible: false, selectedFile: null }),
  setIsLoadingFiles: (loading) => set({ isLoadingFiles: loading }),
  setCommonDirectories: (dirs) => set({ commonDirectories: dirs }),

  // Log Actions
  addLog: (log) => set((state) => ({
    logs: appendLog(state.logs, log),
  })),
  clearLogs: () => set({ logs: [], progressLogs: [] }),
}));

export default useAppStore;

export const useStats = () => useAppStore((state) => ({
  totalFiles: state.totalFiles,
  processedFiles: state.processedFiles,
  successCount: state.successCount,
  failCount: state.failCount,
  updateStats: state.updateStats,
}));

export const useLogs = () => useAppStore((state) => state.logs);

export const useWorkflowConfig = () => useAppStore((state) => state.workflowConfig);
