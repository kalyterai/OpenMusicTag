import { useCallback, useRef, useEffect } from 'react';
import useAppStore from './stores/appStore';

// Qt Bridge Hook - 负责前后端通信
export function useQtBridge() {
  const storeRef = useRef(null);

  // 初始化时获取 store
  useEffect(() => {
    storeRef.current = {
      addLog: useAppStore.getState().addLog,
      updateStats: useAppStore.getState().updateStats,
      setProgress: useAppStore.getState().setProgress,
      setTaskStatus: useAppStore.getState().setTaskStatus,
      setSubFolders: useAppStore.getState().setSubFolders,
      setCurrentFiles: useAppStore.getState().setCurrentFiles,
    };
  }, []);

  // 调用 Python 方法
  const callQt = useCallback(async (method, ...args) => {
    // 开发模式下返回模拟数据
    if (method === 'select_directory') {
      return args[0] || '';
    }
    if (method === 'get_default_config') {
      return {
        input_path: '',
        output_path: '',
        threads: 4,
        formats: ['.mp3', '.flac', '.m4a', '.ape', '.ogg', '.wav'],
        enableCoverDownload: true,
        enableSimplifiedChinese: true,
      };
    }
    if (method === 'get_home_path') {
      return '/Users';
    }
    if (method === 'scan_directory') {
      return { subfolders: [], files: [] };
    }
    if (method === 'get_music_file_details') {
      return {};
    }
    if (method === 'get_common_directories') {
      return ['/Users', '/Documents', '/Music', '/Downloads'];
    }
    throw new Error('开发模式');
  }, []);

  // 扫描目录获取文件夹和文件
  const scanDirectory = useCallback(async (path) => {
    try {
      const result = await callQt('scan_directory', path);
      const store = storeRef.current;
      if (store && result) {
        if (result.subfolders) {
          store.setSubFolders(result.subfolders);
        }
        if (result.files) {
          store.setCurrentFiles(result.files);
        }
      }
      return result;
    } catch (e) {
      console.error('扫描目录失败:', e);
      return { subfolders: [], files: [] };
    }
  }, [callQt]);

  // 获取常用目录列表
  const getCommonDirectories = useCallback(async () => {
    return callQt('get_common_directories');
  }, [callQt]);

  // 选择目录
  const selectDirectory = useCallback(async (currentPath) => {
    return callQt('select_directory', currentPath || '');
  }, [callQt]);

  return {
    callQt,
    scanDirectory,
    getCommonDirectories,
    selectDirectory,
  };
}
