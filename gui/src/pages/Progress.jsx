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
  const { cancelTask, callQt } = useQtBridge();
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tasksReady, setTasksReady] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskSongs, setTaskSongs] = useState([]);
  const [taskSongsReady, setTaskSongsReady] = useState(false);
  const startTime = useRef(Date.now());
  const recordedTerminalStatus = useRef(null);

  const successRate = processedFiles > 0 ? Math.round((successCount / processedFiles) * 100) : 0;
  const selectedTotal = selectedTask?.total ?? totalFiles;
  const selectedSuccess = selectedTask?.success ?? successCount;
  const selectedFailed = selectedTask?.failed ?? failCount;
  const selectedSkipped = selectedTask?.skipped ?? 0;
  const selectedProcessed = selectedSuccess + selectedFailed + selectedSkipped;
  const selectedRate = selectedProcessed > 0 ? Math.round((selectedSuccess / selectedProcessed) * 100) : successRate;
  const selectedProgress = selectedTask
    ? (selectedTask.status === 'completed' || selectedTask.status === 'cancelled'
      ? 100
      : (selectedTotal > 0 ? Math.round((selectedProcessed / selectedTotal) * 100) : 0))
    : progress;
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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await callQt('get_recent_tasks', 50);
        if (active) setTasks(list || []);
      } catch (e) {
        if (active) setTasks([]);
      } finally {
        if (active) setTasksReady(true);
      }
    })();
    return () => { active = false; };
  }, [callQt, taskStatus]);

  const handleSelectTask = async (task) => {
    setSelectedTask(task);
    setTaskSongs([]);
    setTaskSongsReady(false);
    try {
      const songs = await callQt('get_task_songs', task.id, 80, 0);
      setTaskSongs(songs || []);
    } catch (e) {
      setTaskSongs([]);
    } finally {
      setTaskSongsReady(true);
    }
  };

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

  if (!selectedTask) {
    return (
      <div className="page animate-fadeIn">
        <header className="page-header">
          <div>
            <p className="page-kicker">Task history</p>
            <h1 className="page-title">任务详情</h1>
            <p className="page-copy">先选择一个任务批次，再查看处理统计、运行配置和该任务写入的歌曲。</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setCurrentPage('scrape')}>新建刮削</button>
        </header>

        <section className="panel task-list-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">任务列表</h2>
              <p className="panel-subtitle">最近 50 个批处理任务</p>
            </div>
            <span className="chip chip-blue">{tasks.length} 个任务</span>
          </div>
          {!tasksReady ? (
            <div className="task-list-skeleton">
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="table-skeleton-row">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ padding: 18 }}>
              <div className="empty-state">
                <Icons.Clock />
                <div style={{ marginTop: 10, fontWeight: 850, color: 'var(--ink)' }}>还没有任务记录</div>
                <div style={{ marginTop: 4, fontSize: 13 }}>从「新建刮削」启动一次任务后，这里会出现历史批次。</div>
              </div>
            </div>
          ) : (
            <div className="stable-table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>输入目录</th>
                    <th>状态</th>
                    <th>文件</th>
                    <th>成功</th>
                    <th>失败</th>
                    <th>开始时间</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} onClick={() => handleSelectTask(task)} style={{ cursor: 'pointer' }}>
                      <td className="mono" style={{ maxWidth: 360 }}>
                        <div className="truncate-1">{task.input_path}</div>
                      </td>
                      <td><span className={`chip ${task.status === 'completed' ? 'chip-green' : task.status === 'running' ? 'chip-blue' : 'chip-amber'}`}>{task.status}</span></td>
                      <td>{task.total || 0}</td>
                      <td>{task.success || 0}</td>
                      <td>{task.failed || 0}</td>
                      <td>{(task.started_at || '').replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

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
        <div className="toolbar">
          <button type="button" className="btn btn-secondary" onClick={() => setSelectedTask(null)}>返回任务列表</button>
          <StatusBadge status={selectedTask.status === 'failed' || selectedTask.status === 'error' ? 'error' : (selectedTask.status === 'running' ? 'processing' : 'info')}>
            {selectedTask.status || statusText}
          </StatusBadge>
        </div>
      </header>

      <section className="progress-grid">
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ProgressDial value={selectedProgress} />
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
                ['总文件数', selectedTotal],
                ['已处理', selectedProcessed],
                ['成功', selectedSuccess],
                ['失败', selectedFailed],
                ['成功率', `${selectedRate}%`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--muted)' }}>
                  <span>{label}</span>
                  <strong style={{ color: label === '失败' && failCount > 0 ? 'var(--red)' : 'var(--ink)' }}>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <div style={{ display: 'grid', gap: 8 }}>
            {selectedTask.status === 'running' && taskStatus === 'processing' && (
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
            {selectedTask.status === 'completed' && (
              <>
                <button type="button" className="btn btn-primary" onClick={() => setCurrentPage('files')}>查看资源库</button>
                <button type="button" className="btn btn-secondary" onClick={() => { resetTask(); setCurrentPage('dashboard'); }}>返回控制面板</button>
              </>
            )}
            {(selectedTask.status === 'error' || selectedTask.status === 'failed') && (
              <button type="button" className="btn btn-secondary" onClick={() => { resetTask(); setCurrentPage('dashboard'); }}>返回控制面板</button>
            )}
          </div>
        </div>

        <section className="panel task-detail-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{selectedTask.status === 'running' ? '实时日志' : '任务歌曲'}</h2>
              <p className="panel-subtitle">{selectedTask.status === 'running' ? 'Pipeline 输出的处理事件' : '该任务写入数据库的单曲结果'}</p>
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

          <div id="logs-container" className="task-detail-scroll">
            {selectedTask.status !== 'running' ? (
              !taskSongsReady ? (
                <div className="task-song-skeleton">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <div key={item} className="dashboard-task-skeleton">
                      <span />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              ) : taskSongs.length === 0 ? (
                <div className="empty-state">
                  <Icons.File />
                  <div style={{ marginTop: 10, fontWeight: 850, color: 'var(--ink)' }}>没有歌曲记录</div>
                </div>
              ) : (
                taskSongs.map((song) => (
                  <article key={song.id} className="panel" style={{ padding: 12, boxShadow: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate-1" style={{ fontWeight: 850, color: 'var(--ink)' }}>{song.title || song.source_path}</div>
                        <div className="truncate-1" style={{ marginTop: 4, color: 'var(--muted)', fontSize: 12 }}>
                          {song.artist || '未知艺人'} / {song.album || '未知专辑'}
                        </div>
                      </div>
                      <span className={`chip ${song.status === 'success' ? 'chip-green' : song.status === 'failed' ? 'chip-red' : 'chip-amber'}`}>{song.status}</span>
                    </div>
                  </article>
                ))
              )
            ) : progressLogs.length === 0 ? (
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
