import React, { useEffect, useState } from 'react';
import useAppStore, { useStats } from '../stores/appStore';
import { useQtBridge } from '../bridge';

// SVG Icons
const Icons = {
  Music: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  Folder: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  File: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Image: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Tag: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Loading: () => (
    <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

// 统计卡片组件
function StatCard({ icon: Icon, label, value, subtext, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-100',
  };

  return (
    <div className={`rounded-2xl p-5 border ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-neutral-600 mb-2">
            <Icon />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <div className="text-3xl font-bold text-neutral-900">
            {value}
          </div>
          {subtext && (
            <div className="text-xs text-neutral-500 mt-1">{subtext}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// 文件夹卡片组件
function FolderCard({ name, path, fileCount, onClick, isSelected }) {
  return (
    <button
      onClick={() => onClick(path)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
        isSelected 
          ? 'bg-blue-50 border-2 border-blue-200' 
          : 'bg-white border-2 border-transparent hover:bg-neutral-50'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        isSelected ? 'bg-blue-100' : 'bg-purple-100'
      }`}>
        <Icons.Folder />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-neutral-900 truncate">{name}</div>
        <div className="text-sm text-neutral-500">{fileCount} 个文件</div>
      </div>
      <Icons.ChevronRight />
    </button>
  );
}

// 音乐文件卡片组件
function MusicFileCard({ file, onClick, isSelected }) {
  const formatIcon = (ext) => {
    const colors = {
      '.mp3': 'bg-blue-100 text-blue-600',
      '.flac': 'bg-green-100 text-green-600',
      '.m4a': 'bg-purple-100 text-purple-600',
      '.ape': 'bg-orange-100 text-orange-600',
      '.ogg': 'bg-pink-100 text-pink-600',
      '.wav': 'bg-gray-100 text-gray-600',
    };
    return colors[ext] || 'bg-gray-100 text-gray-600';
  };

  return (
    <button
      onClick={() => onClick(file)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
        isSelected 
          ? 'bg-blue-50 border-2 border-blue-200' 
          : 'bg-white border-2 border-transparent hover:bg-neutral-50'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formatIcon(file.ext)}`}>
        <Icons.Music />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-neutral-900 truncate">{file.name}</div>
        <div className="text-sm text-neutral-500">
          {file.artist || '未知艺人'} - {file.title || '未知标题'}
        </div>
      </div>
      <span className={`px-2 py-1 rounded text-xs font-medium ${formatIcon(file.ext)}`}>
        {file.ext.toUpperCase()}
      </span>
    </button>
  );
}

// 文件详情面板组件
function FileDetailPanel({ file, onClose }) {
  if (!file) return null;

  const formatIcon = (ext) => {
    const colors = {
      '.mp3': 'bg-blue-100 text-blue-600',
      '.flac': 'bg-green-100 text-green-600',
      '.m4a': 'bg-purple-100 text-purple-600',
      '.ape': 'bg-orange-100 text-orange-600',
      '.ogg': 'bg-pink-100 text-pink-600',
      '.wav': 'bg-gray-100 text-gray-600',
    };
    return colors[ext] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="w-80 bg-white border-l border-neutral-100 flex flex-col shrink-0 animate-slideIn">
      {/* 头部 */}
      <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
        <h3 className="font-semibold text-neutral-900">文件详情</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 文件信息 */}
      <div className="p-4 border-b border-neutral-100">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${formatIcon(file.ext)}`}>
            <Icons.Music />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-neutral-900 truncate">{file.name}</div>
            <div className="text-sm text-neutral-500">{file.ext.toUpperCase()} 格式</div>
          </div>
        </div>
      </div>

      {/* 标签信息 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 标题 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500 font-medium">标题</label>
          <div className="text-sm text-neutral-900 bg-neutral-50 px-3 py-2 rounded-lg">
            {file.title || '-'}
          </div>
        </div>

        {/* 艺人 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500 font-medium">艺人</label>
          <div className="text-sm text-neutral-900 bg-neutral-50 px-3 py-2 rounded-lg">
            {file.artist || '-'}
          </div>
        </div>

        {/* 专辑 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500 font-medium">专辑</label>
          <div className="text-sm text-neutral-900 bg-neutral-50 px-3 py-2 rounded-lg">
            {file.album || '-'}
          </div>
        </div>

        {/* 年份 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500 font-medium">年份</label>
          <div className="text-sm text-neutral-900 bg-neutral-50 px-3 py-2 rounded-lg">
            {file.year || '-'}
          </div>
        </div>

        {/* 流派 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500 font-medium">流派</label>
          <div className="text-sm text-neutral-900 bg-neutral-50 px-3 py-2 rounded-lg">
            {file.genre || '-'}
          </div>
        </div>

        {/* 轨道号 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500 font-medium">轨道号</label>
          <div className="text-sm text-neutral-900 bg-neutral-50 px-3 py-2 rounded-lg">
            {file.track || '-'}
          </div>
        </div>

        {/* 时长 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500 font-medium">时长</label>
          <div className="text-sm text-neutral-900 bg-neutral-50 px-3 py-2 rounded-lg">
            {file.duration || '-'}
          </div>
        </div>

        {/* 文件路径 */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-500 font-medium">文件路径</label>
          <div className="text-xs text-neutral-600 bg-neutral-50 px-3 py-2 rounded-lg break-all">
            {file.path || '-'}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="p-4 border-t border-neutral-100 space-y-2">
        <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
          <Icons.Play />
          播放预览
        </button>
        <button className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-medium transition-colors">
          查看元数据
        </button>
      </div>
    </div>
  );
}

export default function Home({ bridgeReady }) {
  const { 
    totalFiles, processedFiles, successCount, failCount,
    updateStats 
  } = useStats();
  const store = useAppStore();
  const { scanDirectory, getMusicFileDetails } = useQtBridge();
  const [loadingPath, setLoadingPath] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // 加载统计数据
  useEffect(() => {
    updateStats({
      totalFiles: 156,
      processedFiles: 142,
      successCount: 138,
      failCount: 4,
    });
  }, [updateStats]);

  // 处理文件夹点击
  const handleFolderClick = async (path) => {
    setLoadingPath(path);
    setSelectedFolder(path);
    try {
      const result = await scanDirectory(path);
      store.setSubFolders(result.subfolders || []);
      store.setCurrentFiles(result.files || []);
    } catch (e) {
      console.error('扫描文件夹失败:', e);
      store.setSubFolders([]);
      store.setCurrentFiles([]);
    }
    setLoadingPath(null);
  };

  // 处理文件点击
  const handleFileClick = async (file) => {
    try {
      const details = await getMusicFileDetails(file.path);
      store.selectFile({ ...file, ...details });
    } catch (e) {
      store.selectFile(file);
    }
  };

  // 关闭详情面板
  const handleCloseDetail = () => {
    store.closeFileDetail();
  };

  // 计算文件夹中的文件总数
  const getFolderStats = (folderPath) => {
    // 这里可以从之前扫描的结果中获取
    return { files: Math.floor(Math.random() * 50) + 5 };
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      {/* 统计信息区域 */}
      <div className="p-6 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Icons.Music}
            label="已处理歌曲"
            value={processedFiles.toLocaleString()}
            subtext="首"
            color="blue"
          />
          <StatCard
            icon={Icons.Folder}
            label="音乐文件"
            value={totalFiles.toLocaleString()}
            subtext="个文件"
            color="purple"
          />
          <StatCard
            icon={Icons.Check}
            label="成功率"
            value={`${processedFiles > 0 ? Math.round((successCount / processedFiles) * 100) : 0}%`}
            subtext="处理成功率"
            color="green"
          />
          <StatCard
            icon={Icons.Clock}
            label="失败歌曲"
            value={failCount.toLocaleString()}
            subtext="首"
            color="orange"
          />
        </div>
      </div>

      {/* 主内容区域 - 文件浏览器 */}
      <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-4">
        {/* 左侧 - 子文件夹列表 */}
        <div className="w-64 shrink-0 flex flex-col">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
            <Icons.Folder />
            子文件夹
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {store.subFolders.length > 0 ? (
              store.subFolders.map((folder) => {
                const stats = getFolderStats(folder.path);
                const isLoading = loadingPath === folder.path;
                return (
                  <FolderCard
                    key={folder.path}
                    name={folder.name}
                    path={folder.path}
                    fileCount={stats.files}
                    onClick={handleFolderClick}
                    isSelected={selectedFolder === folder.path}
                  />
                );
              })
            ) : (
              <div className="text-center py-8 text-neutral-400">
                <Icons.Folder />
                <p className="mt-2 text-sm">暂无子文件夹</p>
              </div>
            )}
          </div>
        </div>

        {/* 中间 - 音乐文件列表 */}
        <div className="flex-1 flex flex-col min-w-0">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
            <Icons.Music />
            音乐文件
            {store.currentFiles.length > 0 && (
              <span className="text-xs text-neutral-400">({store.currentFiles.length} 首)</span>
            )}
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {store.isLoadingFiles ? (
              <div className="flex items-center justify-center py-12">
                <Icons.Loading />
                <span className="ml-2 text-neutral-500">加载中...</span>
              </div>
            ) : store.currentFiles.length > 0 ? (
              store.currentFiles.map((file, index) => (
                <MusicFileCard
                  key={`${file.path}-${index}`}
                  file={file}
                  onClick={handleFileClick}
                  isSelected={store.selectedFile?.path === file.path}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <Icons.Music />
                <p className="mt-2">选择文件夹查看音乐文件</p>
                <p className="text-sm">支持 MP3、FLAC、M4A、APE、OGG、WAV 格式</p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧 - 文件详情面板 */}
        {store.fileDetailVisible && (
          <FileDetailPanel
            file={store.selectedFile}
            onClose={handleCloseDetail}
          />
        )}
      </div>
    </div>
  );
}
