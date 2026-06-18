import { useCallback, useEffect } from 'react';
import useAppStore from './stores/appStore';

let bridgePromise = null;
let signalsConnected = false;

const voidMethods = new Set([
  'start_scan',
  'start_process',
  'update_config',
  'cancel_task',
]);

function isQtAvailable() {
  return Boolean(window.qt?.webChannelTransport && window.QWebChannel);
}

function getMockResult(method, args) {
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
  if (voidMethods.has(method)) {
    return true;
  }
  throw new Error(`未实现的开发模式方法: ${method}`);
}

function getQtBridge() {
  if (!isQtAvailable()) {
    return Promise.resolve(null);
  }

  if (!bridgePromise) {
    bridgePromise = new Promise((resolve, reject) => {
      try {
        new window.QWebChannel(window.qt.webChannelTransport, (channel) => {
          if (!channel.objects.bridge) {
            reject(new Error('Qt WebChannel 未注册 bridge 对象'));
            return;
          }
          resolve(channel.objects.bridge);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  return bridgePromise;
}

function connectSignals(bridge) {
  if (!bridge || signalsConnected) return;
  signalsConnected = true;

  const getStore = () => useAppStore.getState();

  bridge.started?.connect((data) => {
    const store = getStore();
    store.setTaskStatus(data?.status || 'processing');
    store.addLog({
      type: 'info',
      message: data?.status === 'scanning' ? '开始扫描目录' : '开始处理任务',
    });
  });

  bridge.progress?.connect((data) => {
    const store = getStore();
    if (data?.type === 'progress') {
      store.setTaskStatus('processing');
      store.setProgress(data.percent || 0, data.file || '');
      store.updateStats({
        totalFiles: data.total,
        processedFiles: data.current,
      });
      store.addProgressLog({
        type: 'info',
        message: `处理中: ${data.file || ''}`,
        file: data.file,
      });
      return;
    }

    if (data?.type === 'success') {
      useAppStore.setState((state) => ({
        successCount: state.successCount + 1,
      }));
      store.addProgressLog({
        type: 'success',
        message: `处理成功: ${data.file?.title || data.file?.file || ''}`,
      });
    }
  });

  bridge.log?.connect((data) => {
    const store = getStore();
    const log = {
      type: data?.level || data?.type || 'info',
      level: data?.level || data?.type || 'info',
      message: data?.message || '',
    };
    store.addLog(log);
    store.addProgressLog(log);
  });

  bridge.error?.connect((data) => {
    const store = getStore();
    const message = data?.message || String(data || '未知错误');
    store.setTaskStatus('error');
    store.addLog({ type: 'error', message });
    store.addProgressLog({ type: 'error', message });
  });

  bridge.finished?.connect((data) => {
    const store = getStore();
    if (data?.cancelled) {
      store.setTaskStatus('cancelled');
    } else if (data?.success) {
      store.setProgress(100, '处理完成');
      store.setTaskStatus('completed');
    } else {
      store.setTaskStatus('error');
    }
    store.addLog({
      type: data?.cancelled ? 'warning' : (data?.success ? 'success' : 'error'),
      message: data?.cancelled ? '任务已取消' : (data?.success ? '处理完成' : `处理失败: ${data?.error || ''}`),
    });
  });
}

async function invokeQt(method, ...args) {
  const bridge = await getQtBridge();
  if (!bridge) {
    return getMockResult(method, args);
  }

  connectSignals(bridge);

  if (typeof bridge[method] !== 'function') {
    throw new Error(`Qt bridge 方法不存在: ${method}`);
  }

  if (voidMethods.has(method)) {
    bridge[method](...args);
    return true;
  }

  return new Promise((resolve, reject) => {
    try {
      bridge[method](...args, (result) => resolve(result));
    } catch (error) {
      reject(error);
    }
  });
}

export function useQtBridge() {
  useEffect(() => {
    getQtBridge()
      .then(connectSignals)
      .catch((error) => {
        useAppStore.getState().addLog({
          type: 'warning',
          message: `Qt bridge 初始化失败，使用开发模式: ${error.message}`,
        });
      });
  }, []);

  const callQt = useCallback(async (method, ...args) => invokeQt(method, ...args), []);

  const scanDirectory = useCallback(async (path) => {
    const store = useAppStore.getState();
    store.setIsLoadingFiles(true);
    try {
      const result = await callQt('scan_directory', path);
      store.setCurrentPath(path);
      store.setSubFolders(result?.subfolders || []);
      store.setCurrentFiles(result?.files || []);
      return result || { subfolders: [], files: [] };
    } catch (error) {
      store.addLog({ type: 'error', message: `扫描目录失败: ${error.message}` });
      return { subfolders: [], files: [] };
    } finally {
      store.setIsLoadingFiles(false);
    }
  }, [callQt]);

  const getCommonDirectories = useCallback(async () => (
    callQt('get_common_directories')
  ), [callQt]);

  const selectDirectory = useCallback(async (currentPath) => (
    callQt('select_directory', currentPath || '')
  ), [callQt]);

  const getMusicFileDetails = useCallback(async (filePath) => (
    callQt('get_music_file_details', filePath)
  ), [callQt]);

  const startProcess = useCallback(async (inputPath, outputPath, threads = 4, options = {}) => (
    callQt('start_process', {
      input_path: inputPath,
      output_path: outputPath,
      threads,
      ...options,
    })
  ), [callQt]);

  const cancelTask = useCallback(async () => callQt('cancel_task'), [callQt]);

  const updateConfig = useCallback(async (config) => (
    callQt('update_config', config)
  ), [callQt]);

  return {
    callQt,
    scanDirectory,
    getCommonDirectories,
    selectDirectory,
    getMusicFileDetails,
    startProcess,
    cancelTask,
    updateConfig,
  };
}
