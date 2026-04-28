import React, { useEffect, useState } from 'react';
import useAppStore from '../stores/appStore';

// SVG Icons
const Icons = {
  Play: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Pause: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Music: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  File: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// 圆形进度组件
function CircularProgress({ value, size = 120, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E5E5"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2563EB"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-neutral-900">{value}%</span>
      </div>
    </div>
  );
}

// 状态徽章
function StatusBadge({ status, count }) {
  const statusConfig = {
    success: { color: 'bg-green-100 text-green-700', icon: <Icons.Check /> },
    error: { color: 'bg-red-100 text-red-700', icon: <Icons.X /> },
    processing: { color: 'bg-blue-100 text-blue-700', icon: <Icons.Clock /> },
    warning: { color: 'bg-yellow-100 text-yellow-700', icon: <Icons.Warning /> },
    info: { color: 'bg-gray-100 text-gray-700', icon: <Icons.Info /> },
  };

  const config = statusConfig[status] || statusConfig.info;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {count}
    </div>
  );
}

// 日志项
function LogItem({ log }) {
  const logConfig = {
    success: { color: 'text-green-600', icon: <Icons.Check /> },
    error: { color: 'text-red-600', icon: <Icons.X /> },
    warning: { color: 'text-yellow-600', icon: <Icons.Warning /> },
    info: { color: 'text-blue-600', icon: <Icons.Info /> },
  };

  const config = logConfig[log.type] || logConfig.info;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
      <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1">
        <div className="text-sm text-neutral-800">{log.message}</div>
        <div className="text-xs text-neutral-500 mt-1">
          {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
        </div>
      </div>
      {log.file && (
        <div className="flex items-center gap-1 text-xs text-neutral-500 bg-white px-2 py-1 rounded border">
          <Icons.File />
          <span className="truncate max-w-32">{log.file}</span>
        </div>
      )}
    </div>
  );
}

export default function Progress() {
  const { 
    taskStatus, 
    progress, 
    progressText, 
    progressLogs,
    totalFiles, 
    processedFiles, 
    successCount, 
    failCount,
    setCurrentPage,
    resetTask,
    addHistory
  } = useAppStore();
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('计算中...');

  // 估计剩余时间
  useEffect(() => {
    if (taskStatus === 'processing' && processedFiles > 0 && progress > 0) {
      const remainingFiles = totalFiles - processedFiles;
      const filesPerSecond = processedFiles / (Date.now() - startTime) * 1000;
      const remainingSeconds = Math.ceil(remainingFiles / filesPerSecond);
      
      if (remainingSeconds > 60) {
        setEstimatedTime(`${Math.ceil(remainingSeconds / 60)} 分钟`);
      } else {
        setEstimatedTime(`${remainingSeconds} 秒`);
      }
    }
  }, [processedFiles, totalFiles, progress, taskStatus]);

  const startTime = useRef(Date.now());

  // 自动滚动到最新的日志
  useEffect(() => {
    if (autoScroll && progressLogs.length > 0) {
      const logsContainer = document.getElementById('logs-container');
      if (logsContainer) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }
    }
  }, [progressLogs, autoScroll]);

  // 任务完成时更新历史记录
  useEffect(() => {
    if (taskStatus === 'completed' || taskStatus === 'error') {
      addHistory({
        title: '音乐整理任务',
        status: taskStatus,
        count: processedFiles,
        success: successCount,
        failed: failCount,
        total: totalFiles,
        duration: Math.floor((Date.now() - startTime.current) / 1000),
      });
    }
  }, [taskStatus, processedFiles, successCount, failCount, totalFiles]);

  const handleBackToHome = () => {
    resetTask();
    setCurrentPage('home');
  };

  const handleViewLibrary = () => {
    setCurrentPage('library');
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
    // TODO: 实现暂停/恢复功能
  };

  const handleStop = () => {
    // TODO: 实现停止功能
    resetTask();
  };

  // 计算成功率
  const successRate = processedFiles > 0 ? Math.round((successCount / processedFiles) * 100) : 0;

  return (
    <div className="p-8 animate-fadeIn max-w-6xl mx-auto">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">处理进度</h1>
        <p className="text-neutral-500">
          {taskStatus === 'processing' ? '正在整理您的音乐库...' : 
           taskStatus === 'completed' ? '处理完成！' :
           taskStatus === 'error' ? '处理出错' : '准备中'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：进度概览 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 圆形进度 */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 text-center">
            <CircularProgress value={progress} />
            <div className="mt-4">
              <div className="text-2xl font-bold text-neutral-900">{progress}%</div>
              <div className="text-sm text-neutral-500 mt-1">{progressText}</div>
            </div>
            {taskStatus === 'processing' && (
              <div className="mt-4 text-sm text-neutral-500">
                预计剩余时间：{estimatedTime}
              </div>
            )}
          </div>

          {/* 统计信息 */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">处理统计</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">总文件数</span>
                <span className="font-semibold text-neutral-900">{totalFiles}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">已处理</span>
                <span className="font-semibold text-neutral-900">{processedFiles}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">成功</span>
                <StatusBadge status="success" count={successCount} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">失败</span>
                <StatusBadge status="error" count={failCount} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">成功率</span>
                <span className="font-semibold text-green-600">{successRate}%</span>
              </div>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="space-y-3">
            {taskStatus === 'processing' && (
              <div className="flex gap-2">
                <button
                  onClick={handleTogglePause}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-medium transition-colors"
                >
                  {isPaused ? <Icons.Play /> : <Icons.Pause />}
                  {isPaused ? '继续' : '暂停'}
                </button>
                <button
                  onClick={handleStop}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  <Icons.X />
                  停止
                </button>
              </div>
            )}
            
            {taskStatus === 'completed' && (
              <div className="space-y-2">
                <button
                  onClick={handleViewLibrary}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  查看音乐库
                </button>
                <button
                  onClick={handleBackToHome}
                  className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  返回首页
                </button>
              </div>
            )}

            {taskStatus === 'error' && (
              <button
                onClick={handleBackToHome}
                className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
              >
                返回首页
              </button>
            )}
          </div>
        </div>

        {/* 右侧：实时日志 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">实时日志</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded"
                  />
                  自动滚动
                </label>
                <button
                  onClick={() => {/* TODO: 清空日志 */}}
                  className="text-sm text-neutral-500 hover:text-neutral-700"
                >
                  清空
                </button>
              </div>
            </div>
            <div
              id="logs-container"
              className="p-6 h-96 overflow-y-auto space-y-3"
            >
              {progressLogs.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                  <Icons.Clock />
                  <p className="mt-2">等待开始处理...</p>
                </div>
              ) : (
                progressLogs.map((log, index) => (
                  <LogItem key={index} log={log} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}