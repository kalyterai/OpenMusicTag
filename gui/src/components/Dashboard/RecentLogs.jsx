import React, { useRef, useEffect } from 'react';
import { useLogs } from '../../stores/appStore';

// SVG Icons
const Icons = {
  success: () => (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: () => (
    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: () => (
    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: () => (
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  default: () => (
    <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

export default function RecentLogs() {
  const logs = useLogs();
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogIcon = (type) => {
    const Icon = Icons[type] || Icons.default;
    return <Icon />;
  };

  const getLogType = (message) => {
    if (message.includes('✅') || message.includes('成功')) return 'success';
    if (message.includes('❌') || message.includes('失败') || message.includes('错误')) return 'error';
    if (message.includes('⚠️') || message.includes('警告')) return 'warning';
    if (message.includes('ℹ️') || message.includes('🚀') || message.includes('📁')) return 'info';
    return 'default';
  };

  return (
    <div className="h-64 overflow-y-auto pr-2 space-y-2">
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-neutral-400">
          <Icons.default />
          <p className="mt-2 text-sm">暂无日志</p>
        </div>
      ) : (
        <>
          {logs.slice(-50).map((log, index) => (
            <div
              key={index}
              className="flex items-start gap-3 text-sm py-2 px-3 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <span className="mt-0.5">{getLogIcon(getLogType(log.message))}</span>
              <span className="text-neutral-700 flex-1">
                {log.message}
              </span>
              {log.timestamp && (
                <span className="text-neutral-400 text-xs whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          ))}
          <div ref={logEndRef} />
        </>
      )}
    </div>
  );
}