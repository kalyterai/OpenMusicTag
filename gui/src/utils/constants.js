/**
 * 常量定义
 */

// 支持的文件格式
export const SUPPORTED_FORMATS = [
  '.mp3',
  '.flac',
  '.m4a',
  '.ape',
  '.ogg',
  '.wav'
];

// 默认配置
export const DEFAULT_CONFIG = {
  threads: 4,
  formats: SUPPORTED_FORMATS,
  enableCoverDownload: true,
  enableSimplifiedChinese: true,
};

// 线程数范围
export const THREADS_RANGE = {
  min: 1,
  max: 16,
  default: 4
};

// 日志级别
export const LOG_LEVELS = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

// 任务状态
export const TASK_STATUS = {
  IDLE: 'idle',
  SCANNING: 'scanning',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// 页面路由
export const PAGES = {
  DASHBOARD: 'dashboard',
  FILES: 'files',
  SETTINGS: 'settings',
  LOGS: 'logs',
  ABOUT: 'about'
};

// 应用信息
export const APP_INFO = {
  name: 'OpenMusicTag',
  version: '1.0.0',
  description: '极空间 NAS 音乐整理工具'
};

// 主题色
export const THEME = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  bgDark: '#0F172A',
  bgCard: '#1E293B',
  bgHover: '#334155'
};
