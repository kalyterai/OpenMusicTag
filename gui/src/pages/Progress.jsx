import React, { useEffect, useMemo, useRef, useState } from 'react';
import useAppStore from '../stores/appStore';
import { useQtBridge } from '../bridge';

const Icon = ({ children }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const Icons = {
  Play: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14l11-7L8 5z" />
    </Icon>
  ),
  Pause: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5v14M15 5v14" />
    </Icon>
  ),
  Stop: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10H7z" />
    </Icon>
  ),
  Check: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </Icon>
  ),
  Error: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </Icon>
  ),
  Clock: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Icon>
  ),
  File: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h6l4 4v12H7V4zM13 4v5h5" />
    </svg>
  ),
  Info: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

function formatRemaining(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '计算中';
  if (seconds < 60) return `${Math.ceil(seconds)} 秒`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} 分钟`;
  return `${Math.ceil(seconds / 3600)} 小时`;
}

function StatusBadge({ status, children }) {
  const cls = {
    success: 'chip-green',
    error: 'chip-red',
    processing: 'chip-blue',
    warning: 'chip-amber',
    info: '',
  }[status] || '';

  return <span className={`chip ${cls}`}>{children}</span>;
}

function ProgressDial({ value }) {
  const clamped = Math.max(0, Math.min(100, value || 0));
  const radius = 58;
  const circumference = radius * 2 * Math.PI;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: 148, height: 148 }}>
      <svg viewBox="0 0 148 148" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="74" cy="74" r={radius} stroke="rgba(222, 212, 195, 0.8)" strokeWidth="10" fill="none" />
        <circle
          cx="74"
          cy="74"
          r={radius}
          stroke="var(--groove)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 220ms ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <strong style={{ fontSize: 34, lineHeight: 1, color: 'var(--ink)' }}>{clamped}%</strong>
        <span style={{ marginTop: 6, color: 'var(--muted)', fontSize: 12 }}>完成度</span>
      </div>
    </div>
  );
}

function LogItem({ log }) {
  const type = log.type || log.level || 'info';
  const icon = {
    success: <Icons.Check />,
    error: <Icons.Error />,
    warning: <Icons.Info />,
    info: <Icons.Info />,
  }[type] || <Icons.Info />;
  const chipClass = {
    success: 'chip-green',
    error: 'chip-red',
    warning: 'chip-amber',
    info: 'chip-blue',
  }[type] || 'chip-blue';

  return (
    <article className="panel" style={{ padding: 12, boxShadow: 'none', display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr) auto', gap: 10, alignItems: 'start' }}>
      <span className={`chip ${chipClass}`} style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: 'var(--ink)', fontWeight: 750 }}>{log.message || '空日志'}</div>
        <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 12 }}>
          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('zh-CN') : '--'}
        </div>
      </div>
      {log.file && (
        <span className="chip">
          <Icons.File />
          <span className="truncate-1" style={{ maxWidth: 160 }}>{log.file}</span>
        </span>
      )}
    </article>
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
    addHistory,
  } = useAppStore();
  const { cancelTask } = useQtBridge();
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const startTime = useRef(Date.now());
  const recordedTerminalStatus = useRef(null);

  const successRate = processedFiles > 0 ? Math.round((successCount / processedFiles) * 100) : 0;
  const remaining = useMemo(() => {
    if (taskStatus !== 'processing' || processedFiles <= 0 || progress <= 0) return '计算中';
    const elapsedSeconds = Math.max((Date.now() - startTime.current) / 1000, 1);
    const filesPerSecond = processedFiles / elapsedSeconds;
    const remainingFiles = Math.max(totalFiles - processedFiles, 0);
    return formatRemaining(remainingFiles / filesPerSecond);
  }, [processedFiles, progress, taskStatus, totalFiles]);

  useEffect(() => {
    if (autoScroll && progressLogs.length > 0) {
      const logsContainer = document.getElementById('logs-container');
      if (logsContainer) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }
    }
  }, [progressLogs, autoScroll]);

  useEffect(() => {
    if ((taskStatus === 'completed' || taskStatus === 'error') && recordedTerminalStatus.current !== taskStatus) {
      recordedTerminalStatus.current = taskStatus;
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
  }, [taskStatus, processedFiles, successCount, failCount, totalFiles, addHistory]);

  const handleStop = async () => {
    try {
      await cancelTask();
    } finally {
      resetTask();
    }
  };

  const statusText = {
    idle: '准备中',
    scanning: '扫描目录',
    processing: '处理中',
    completed: '已完成',
    error: '出错',
    cancelled: '已取消',
  }[taskStatus] || taskStatus;

  return (
    <div className="page page-narrow animate-fadeIn">
      <header className="page-header">
        <div>
          <p className="page-kicker">Task monitor</p>
          <h1 className="page-title">任务详情</h1>
          <p className="page-copy">
            跟踪当前批次的处理进度、成功率和实时日志，完成后可直接回到资源库检查结果。
          </p>
        </div>
        <StatusBadge status={taskStatus === 'error' ? 'error' : (taskStatus === 'processing' ? 'processing' : 'info')}>
          {statusText}
        </StatusBadge>
      </header>

      <section className="progress-grid">
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ProgressDial value={progress} />
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <div style={{ color: 'var(--ink)', fontWeight: 850 }}>{progressText || statusText}</div>
              {taskStatus === 'processing' && (
                <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 13 }}>
                  预计剩余 {remaining}
                </div>
              )}
            </div>
          </section>

          <section className="panel" style={{ padding: 16 }}>
            <h2 className="panel-title" style={{ marginBottom: 14 }}>处理统计</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['总文件数', totalFiles],
                ['已处理', processedFiles],
                ['成功', successCount],
                ['失败', failCount],
                ['成功率', `${successRate}%`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--muted)' }}>
                  <span>{label}</span>
                  <strong style={{ color: label === '失败' && failCount > 0 ? 'var(--red)' : 'var(--ink)' }}>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <div style={{ display: 'grid', gap: 8 }}>
            {taskStatus === 'processing' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPaused(!isPaused)}>
                  {isPaused ? <Icons.Play /> : <Icons.Pause />}
                  {isPaused ? '继续' : '暂停'}
                </button>
                <button type="button" className="btn btn-danger" onClick={handleStop}>
                  <Icons.Stop />
                  停止
                </button>
              </div>
            )}
            {taskStatus === 'completed' && (
              <>
                <button type="button" className="btn btn-primary" onClick={() => setCurrentPage('files')}>查看资源库</button>
                <button type="button" className="btn btn-secondary" onClick={() => { resetTask(); setCurrentPage('dashboard'); }}>返回控制面板</button>
              </>
            )}
            {taskStatus === 'error' && (
              <button type="button" className="btn btn-secondary" onClick={() => { resetTask(); setCurrentPage('dashboard'); }}>返回控制面板</button>
            )}
          </div>
        </div>

        <section className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 560 }}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">实时日志</h2>
              <p className="panel-subtitle">Pipeline 输出的处理事件</p>
            </div>
            <label className="chip" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                style={{ accentColor: 'var(--groove)' }}
              />
              自动滚动
            </label>
          </div>

          <div id="logs-container" style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {progressLogs.length === 0 ? (
              <div className="empty-state">
                <Icons.Clock />
                <div style={{ marginTop: 10, fontWeight: 850, color: 'var(--ink)' }}>等待日志</div>
                <div style={{ marginTop: 4, fontSize: 13 }}>任务开始后会显示扫描、刮削、写入和错误信息。</div>
              </div>
            ) : (
              progressLogs.map((log, index) => (
                <LogItem key={`${log.timestamp || index}-${index}`} log={log} />
              ))
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
