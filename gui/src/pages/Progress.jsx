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

function StageStats({ rows, title, subtitle }) {
  return (
    <section className="panel" style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <h2 className="panel-title">{title}</h2>
        {subtitle && <p className="panel-subtitle" style={{ marginTop: 4 }}>{subtitle}</p>}
      </div>
      {rows.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 120 }}>
          <Icons.Info />
          <div style={{ marginTop: 8, fontSize: 13 }}>暂无环节数据</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((row) => {
            const total = row.total || 0;
            const failed = row.failed || 0;
            const failRate = total > 0 ? Math.round((failed / total) * 100) : 0;
            return (
              <div key={row.stage} style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                  <span style={{ fontWeight: 750, color: 'var(--ink)' }} className="truncate-1">{row.stage}</span>
                  <span style={{ color: failed > 0 ? 'var(--red)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {failed > 0 ? `${failed} 失败 / ${total}` : `${total}`}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', background: 'rgba(222, 212, 195, 0.72)' }}>
                  <div style={{ width: `${failRate}%`, height: '100%', background: 'var(--red)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SongResultRow({ song }) {
  const isFailed = song.status === 'failed';
  const chipClass = song.status === 'success' ? 'chip-green' : isFailed ? 'chip-red' : 'chip-amber';
  return (
    <article className="panel" style={{ padding: 12, boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="truncate-1" style={{ fontWeight: 850, color: 'var(--ink)' }}>{song.title || song.source_path}</div>
          <div className="truncate-1" style={{ marginTop: 4, color: 'var(--muted)', fontSize: 12 }}>
            {song.artist || '未知艺人'} / {song.album || '未知专辑'}
          </div>
        </div>
        <span className={`chip ${chipClass}`}>{song.status}</span>
      </div>
      {isFailed && (song.failed_stage || song.error_message) && (
        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--red-soft)', color: 'var(--red)', fontSize: 12 }}>
          {song.failed_stage && <span style={{ fontWeight: 800 }}>{song.failed_stage}</span>}
          {song.error_message && <span style={{ marginLeft: song.failed_stage ? 8 : 0 }}>{song.error_message}</span>}
        </div>
      )}
    </article>
  );
}

function LogSongRow({ record, onClick }) {
  const status = record.status || 'info';
  const chipClass = status === 'success' ? 'chip-green' : status === 'failed' ? 'chip-red' : 'chip-amber';
  const name = String(record.source || '').split(/[\\/]/).pop() || record.source;
  return (
    <button type="button" onClick={onClick} className="log-song-row" title={record.source}>
      <div style={{ minWidth: 0 }}>
        <div className="truncate-1" style={{ fontWeight: 800, color: 'var(--ink)' }}>{name}</div>
        {record.failed_stage && (
          <div className="truncate-1" style={{ marginTop: 3, color: 'var(--red)', fontSize: 12 }}>失败于 {record.failed_stage}</div>
        )}
      </div>
      <span className={`chip ${chipClass}`}>{status}</span>
    </button>
  );
}

function LogRecord({ record }) {
  const status = record.status || 'info';
  const chipClass = status === 'success' ? 'chip-green' : status === 'failed' ? 'chip-red' : 'chip-amber';
  return (
    <article className="panel" style={{ padding: 12, boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div className="truncate-1 mono" style={{ minWidth: 0, fontSize: 12, color: 'var(--ink-soft)' }}>{record.source}</div>
        <span className={`chip ${chipClass}`}>{status}</span>
      </div>
      <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
        {(record.stages || []).map((stage, index) => (
          <div key={`${stage.stage}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
            <span className="truncate-1" style={{ color: stage.status === 'failed' ? 'var(--red)' : 'var(--muted)' }}>
              {stage.stage}{stage.message ? ` · ${stage.message}` : ''}
            </span>
            <span style={{ flex: '0 0 auto', color: stage.status === 'failed' ? 'var(--red)' : 'var(--faint)', fontVariantNumeric: 'tabular-nums' }}>
              {stage.status}{stage.duration_ms ? ` ${stage.duration_ms}ms` : ''}
            </span>
          </div>
        ))}
      </div>
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
    resetWorkflow,
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
  const [globalStageStats, setGlobalStageStats] = useState([]);
  const [stageStats, setStageStats] = useState([]);
  const [detailView, setDetailView] = useState('songs');
  const [taskLog, setTaskLog] = useState([]);
  const [logReady, setLogReady] = useState(false);
  const [selectedLogRecord, setSelectedLogRecord] = useState(null);
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
  const handleNewScrape = () => {
    resetWorkflow();
    setCurrentPage('scrape');
  };
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
        const [list, stats] = await Promise.all([
          callQt('get_recent_tasks', 50),
          callQt('get_stage_failure_stats', 0),
        ]);
        if (!active) return;
        setTasks(list || []);
        setGlobalStageStats(stats || []);
      } catch (e) {
        if (active) { setTasks([]); setGlobalStageStats([]); }
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
    setDetailView('songs');
    setTaskLog([]);
    setLogReady(false);
    setSelectedLogRecord(null);
    setStageStats([]);
    try {
      const [songs, stats] = await Promise.all([
        callQt('get_task_songs', task.id, 80, 0),
        callQt('get_stage_failure_stats', task.id),
      ]);
      setTaskSongs(songs || []);
      setStageStats(stats || []);
    } catch (e) {
      setTaskSongs([]);
      setStageStats([]);
    } finally {
      setTaskSongsReady(true);
    }
  };

  const handleShowLog = async () => {
    setDetailView('log');
    setSelectedLogRecord(null);
    if (logReady || !selectedTask) return;
    try {
      const records = await callQt('get_task_log', selectedTask.id, 1000);
      setTaskLog(records || []);
    } catch (e) {
      setTaskLog([]);
    } finally {
      setLogReady(true);
    }
  };

  const handleOpenLog = () => {
    if (selectedTask) callQt('open_task_log', selectedTask.id).catch(() => {});
  };

  const handleExportLog = () => {
    if (selectedTask) callQt('export_task_log', selectedTask.id).catch(() => {});
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
          <button type="button" className="btn btn-secondary" onClick={handleNewScrape}>新建刮削</button>
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
                    <th>任务ID</th>
                    <th>输入目录</th>
                    <th>状态</th>
                    <th>文件</th>
                    <th>成功</th>
                    <th>失败</th>
                    <th>开始时间</th>
                    <th>结束时间</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} onClick={() => handleSelectTask(task)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{task.id}</td>
                      <td className="mono" style={{ maxWidth: 360 }}>
                        <div className="truncate-1">{task.input_path}</div>
                      </td>
                      <td><span className={`chip ${task.status === 'completed' ? 'chip-green' : task.status === 'running' ? 'chip-blue' : 'chip-amber'}`}>{task.status}</span></td>
                      <td>{task.total || 0}</td>
                      <td>{task.success || 0}</td>
                      <td>{task.failed || 0}</td>
                      <td>{(task.started_at || '').replace('T', ' ') || '-'}</td>
                      <td>{(task.finished_at || '').replace('T', ' ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div style={{ marginTop: 16 }}>
          <StageStats
            rows={globalStageStats}
            title="环节失败统计"
            subtitle="跨所有任务，哪个环节最容易出问题"
          />
        </div>
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
          <button type="button" className="btn btn-secondary" onClick={handleNewScrape}>再建一个任务</button>
          <StatusBadge status={selectedTask.status === 'failed' || selectedTask.status === 'error' ? 'error' : (selectedTask.status === 'running' ? 'processing' : 'info')}>
            {selectedTask.status || statusText}
          </StatusBadge>
        </div>
      </header>

      <section className="progress-grid">
        <div style={{ display: 'grid', gap: 0 }}>
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

          {stageStats.length > 0 && (
            <StageStats rows={stageStats} title="环节统计" subtitle="本任务各环节的成功/失败" />
          )}

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
              <h2 className="panel-title">
                {selectedTask.status === 'running'
                  ? '实时日志'
                  : (detailView === 'log'
                    ? (selectedLogRecord ? '单曲环节明细' : '详细日志')
                    : '歌曲结果')}
              </h2>
              <p className="panel-subtitle">
                {selectedTask.status === 'running'
                  ? 'Pipeline 输出的处理事件'
                  : (detailView === 'log'
                    ? (selectedLogRecord ? '该歌曲每个环节的状态、耗时与错误' : '点击歌曲查看其各环节明细')
                    : '该任务写入数据库的单曲结果')}
              </p>
            </div>
            {selectedTask.status === 'running' ? (
              <label className="chip" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  style={{ accentColor: 'var(--groove)' }}
                />
                自动滚动
              </label>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  className={detailView === 'songs' ? 'btn btn-primary' : 'btn btn-secondary'}
                  onClick={() => { setDetailView('songs'); setSelectedLogRecord(null); }}
                >
                  歌曲结果
                </button>
                <button
                  type="button"
                  className={detailView === 'log' ? 'btn btn-primary' : 'btn btn-secondary'}
                  onClick={handleShowLog}
                >
                  详细日志
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleOpenLog}>打开</button>
                <button type="button" className="btn btn-secondary" onClick={handleExportLog}>导出</button>
              </div>
            )}
          </div>

          <div id="logs-container" className="task-detail-scroll">
            {selectedTask.status !== 'running' ? (
              detailView === 'log' ? (
                !logReady ? (
                  <div className="task-song-skeleton">
                    {[0, 1, 2, 3, 4].map((item) => (
                      <div key={item} className="dashboard-task-skeleton"><span /><span /><span /></div>
                    ))}
                  </div>
                ) : taskLog.length === 0 ? (
                  <div className="empty-state">
                    <Icons.File />
                    <div style={{ marginTop: 10, fontWeight: 850, color: 'var(--ink)' }}>没有日志记录</div>
                    <div style={{ marginTop: 4, fontSize: 13 }}>该任务可能在记录环节日志的功能上线前运行。</div>
                  </div>
                ) : selectedLogRecord ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() => setSelectedLogRecord(null)}
                    >
                      ← 返回日志列表
                    </button>
                    <LogRecord record={selectedLogRecord} />
                  </>
                ) : (
                  taskLog.map((record, index) => (
                    <LogSongRow
                      key={`${record.song_id || record.source}-${index}`}
                      record={record}
                      onClick={() => setSelectedLogRecord(record)}
                    />
                  ))
                )
              ) : !taskSongsReady ? (
                <div className="task-song-skeleton">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <div key={item} className="dashboard-task-skeleton"><span /><span /><span /></div>
                  ))}
                </div>
              ) : taskSongs.length === 0 ? (
                <div className="empty-state">
                  <Icons.File />
                  <div style={{ marginTop: 10, fontWeight: 850, color: 'var(--ink)' }}>没有歌曲记录</div>
                </div>
              ) : (
                taskSongs.map((song) => (
                  <SongResultRow key={song.id} song={song} />
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
