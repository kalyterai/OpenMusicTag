import React, { useEffect, useMemo, useRef, useState } from 'react';
import useAppStore from '../stores/appStore';
import { useQtBridge } from '../bridge';
import { LibraryItemRow, FileDetailPanel, EmptyInspector } from '../components/LibraryInspector';

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
  Loader: () => (
    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.6A8 8 0 1120 12" />
    </svg>
  ),
  Parent: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5 5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h11a4 4 0 014 4v1" />
    </Icon>
  ),
};

const normalizePath = (value) => String(value || '').replace(/\\/g, '/').replace(/\/+$/, '');

// 路径相对根目录：去掉输出根目录前缀，只保留根目录内部的子路径
const relativeToRoot = (fullPath, root) => {
  if (!fullPath) return '';
  if (!root) return fullPath;
  const f = normalizePath(fullPath);
  const r = normalizePath(root);
  if (f === r) return '';
  if (f.startsWith(`${r}/`)) return f.slice(r.length + 1);
  return fullPath;
};

// 耗时：结束时间 - 开始时间；无结束时间返回 '-'
const formatDuration = (startIso, endIso) => {
  if (!startIso || !endIso) return '-';
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '-';
  let seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;
  if (minutes < 60) return seconds ? `${minutes}分${seconds}秒` : `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}时${mins}分` : `${hours}时`;
};

const TASK_STATUS_CN = {
  completed: '已完成',
  running: '进行中',
  processing: '处理中',
  scanning: '扫描中',
  pending: '等待中',
  idle: '准备中',
  failed: '失败',
  error: '出错',
  cancelled: '已取消',
};

const STAGE_STATUS_CN = {
  ok: '正常',
  success: '成功',
  warning: '注意',
  skipped: '跳过',
  failed: '失败',
  error: '出错',
};

const taskStatusLabel = (status) => TASK_STATUS_CN[status] || status || '未知';
const stageStatusLabel = (status) => STAGE_STATUS_CN[status] || status || '正常';

const stageStatusChipClass = (status) => (
  status === 'failed' || status === 'error' ? 'chip-red'
    : status === 'warning' ? 'chip-amber'
      : status === 'skipped' ? 'chip-amber'
        : status === 'success' || status === 'ok' ? 'chip-green' : ''
);

function StageChange({ change }) {
  const before = change.before;
  const after = change.after;
  const fmt = (value) => {
    if (value === null || value === undefined || value === '') return '(空)';
    return String(value);
  };
  return (
    <div className="log-change">
      <span className="log-change-field">{change.field}</span>
      <span className="log-change-before">{fmt(before)}</span>
      <span className="log-change-arrow">→</span>
      <span className="log-change-after">{fmt(after)}</span>
    </div>
  );
}

function StageRow({ stage, order, total }) {
  const status = stage.status || 'ok';
  const isAlert = status === 'failed' || status === 'error' || status === 'warning';
  const changes = stage.changes || [];
  return (
    <div className={`log-stage ${isAlert ? 'is-alert' : ''}`}>
      <div className="log-stage-head">
        <span className="log-stage-order" title={`第 ${order} / ${total} 步`}>{order}</span>
        <span className="log-stage-name">{stage.stage}</span>
        <span className={`chip ${stageStatusChipClass(status)}`}>{stageStatusLabel(status)}</span>
        {stage.duration_ms ? <span className="log-stage-time">{stage.duration_ms}ms</span> : null}
      </div>
      {stage.message && <div className="log-stage-message">{stage.message}</div>}
      {changes.length > 0 && (
        <div className="log-change-list">
          {changes.map((change, index) => (
            <StageChange key={`${change.field}-${index}`} change={change} />
          ))}
        </div>
      )}
      {stage.traceback && (
        <pre className="log-stage-trace">{stage.traceback}</pre>
      )}
    </div>
  );
}

function LogRecord({ record }) {
  const status = record.status || 'info';
  return (
    <article className="panel" style={{ padding: 14, boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div className="truncate-1 mono" style={{ minWidth: 0, fontSize: 12, color: 'var(--ink-soft)' }}>{record.source}</div>
        <span className={`chip ${stageStatusChipClass(status)}`}>{stageStatusLabel(status)}</span>
      </div>
      <div className="log-stage-flow">
        {(record.stages || []).map((stage, index) => (
          <StageRow
            key={`${stage.stage}-${index}`}
            stage={stage}
            order={index + 1}
            total={(record.stages || []).length}
          />
        ))}
        {(record.stages || []).length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--faint)' }}>没有记录到环节明细。</div>
        )}
      </div>
    </article>
  );
}

function SongInspectorHeader({ song, hasLog, onShowLog }) {
  const status = song?.status || 'info';
  const isFailed = status === 'failed';
  return (
    <div className="task-song-head">
      <div className="task-song-head-row">
        <span className={`chip ${stageStatusChipClass(status)}`}>{song ? stageStatusLabel(status) : '未在本任务记录'}</span>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onShowLog}
          disabled={!hasLog}
          title={hasLog ? '查看该歌曲的各环节明细' : '该歌曲没有环节日志'}
        >
          详细日志
        </button>
      </div>
      {isFailed && (song.failed_stage || song.error_message) && (
        <div className="task-song-error">
          {song.failed_stage && <span style={{ fontWeight: 800 }}>{song.failed_stage}</span>}
          {song.error_message && <span style={{ marginLeft: song.failed_stage ? 8 : 0 }}>{song.error_message}</span>}
        </div>
      )}
    </div>
  );
}

function InfoTip({ text }) {
  return (
    <span className="info-tip" data-tip={text} role="img" aria-label={text}>i</span>
  );
}

function SongInspectorPaths({ song, outputRoot }) {
  if (!song) return null;
  const outInner = relativeToRoot(song.output_path, outputRoot) || song.output_path;
  return (
    <div className="task-song-paths">
      <div className="task-song-path"><span>来源目录</span><code className="mono truncate-1" title={song.source_path}>{song.source_path || '-'}</code></div>
      <div className="task-song-path"><span>输出目录</span><code className="mono truncate-1" title={outInner}>{outInner || '-'}</code></div>
    </div>
  );
}

export default function Progress() {
  const {
    taskStatus,
    progress,
    progressText,
    totalFiles,
    processedFiles,
    successCount,
    failCount,
    setCurrentPage,
    resetTask,
    resetWorkflow,
    addHistory,
    navNonce,
  } = useAppStore();
  const { cancelTask, callQt, getMusicFileDetails } = useQtBridge();
  const [isPaused, setIsPaused] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tasksReady, setTasksReady] = useState(false);
  const [page, setPage] = useState(1); // 任务列表分页，默认第 1 页
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskSongs, setTaskSongs] = useState([]);
  const [taskLog, setTaskLog] = useState([]);
  const [confirmTask, setConfirmTask] = useState(null); // 待确认删除的任务（模态框）
  const [deletingId, setDeletingId] = useState(null);
  const [undoTask, setUndoTask] = useState(null); // 最近软删除的任务，供「撤销」找回
  const undoTimerRef = useRef(null);

  // 输出目录浏览状态（与资源库详情一致）
  const [outputPath, setOutputPath] = useState('');
  const [outSubFolders, setOutSubFolders] = useState([]);
  const [outFiles, setOutFiles] = useState([]);
  const [outLoading, setOutLoading] = useState(null);
  const [outSelectedFolder, setOutSelectedFolder] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileVisible, setFileVisible] = useState(false);
  const [rightView, setRightView] = useState('preview');

  const startTime = useRef(Date.now());
  const recordedTerminalStatus = useRef(null);

  const selectedTotal = selectedTask?.total ?? totalFiles;
  const selectedSuccess = selectedTask?.success ?? successCount;
  const selectedFailed = selectedTask?.failed ?? failCount;
  const selectedSkipped = selectedTask?.skipped ?? 0;
  const selectedProcessed = selectedSuccess + selectedFailed + selectedSkipped;
  const selectedProgress = selectedTask
    ? (selectedTask.status === 'completed' || selectedTask.status === 'cancelled'
      ? 100
      : (selectedTotal > 0 ? Math.round((selectedProcessed / selectedTotal) * 100) : 0))
    : progress;

  const handleNewScrape = () => {
    resetWorkflow();
    setCurrentPage('scrape');
  };

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
        if (!active) return;
        setTasks(list || []);
      } catch (e) {
        if (active) setTasks([]);
      } finally {
        if (active) setTasksReady(true);
      }
    })();
    return () => { active = false; };
  }, [callQt, taskStatus]);

  // 菜单导航时回到任务列表「第一页」（即使已停留在任务详情菜单）
  const navMountRef = useRef(false);
  useEffect(() => {
    if (!navMountRef.current) { navMountRef.current = true; return; }
    setSelectedTask(null);
    setPage(1);
  }, [navNonce]);

  // 进行中任务：每 3 秒轮询刷新状态/统计/歌曲/日志与输出目录
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (!selectedTask || selectedTask.status !== 'running') return undefined;
    const id = selectedTask.id;
    let active = true;
    const tick = async () => {
      if (!active) return;
      setRefreshing(true);
      try {
        const fresh = await callQt('get_task', id);
        if (active && fresh && fresh.id) {
          setSelectedTask((prev) => (prev && prev.id === id ? { ...prev, ...fresh } : prev));
        }
        const songs = await callQt('get_task_songs', id, 500, 0);
        if (active) setTaskSongs(songs || []);
        const records = await callQt('get_task_log', id, 2000);
        if (active) setTaskLog(records || []);
      } catch (e) {
        // 轮询失败忽略，等下一次
      } finally {
        if (active) setRefreshing(false);
      }
    };
    const timer = setInterval(tick, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [callQt, selectedTask?.id, selectedTask?.status]);

  const browseOutput = async (path) => {
    if (!path) return false;
    setOutLoading(path);
    setOutSelectedFolder(path);
    try {
      const result = await callQt('scan_directory_lazy', path);
      if (result?.exists === false) {
        setOutputPath(path);
        setOutSubFolders([]);
        setOutFiles([]);
        return false;
      }
      setOutputPath(result?.path || path);
      setOutSubFolders(result?.subfolders || []);
      setOutFiles(result?.files || []);
      return true;
    } catch (e) {
      setOutputPath(path);
      setOutSubFolders([]);
      setOutFiles([]);
      return false;
    } finally {
      setOutLoading(null);
    }
  };

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  useEffect(() => clearUndoTimer, []);

  const handleDeleteTask = async (task) => {
    setDeletingId(task.id);
    try {
      const ok = await callQt('delete_task', task.id);
      if (ok) {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        if (selectedTask?.id === task.id) setSelectedTask(null);
        // 弹出可撤销提示：6 秒内可一键找回
        clearUndoTimer();
        setUndoTask(task);
        undoTimerRef.current = setTimeout(() => {
          setUndoTask(null);
          undoTimerRef.current = null;
        }, 6000);
      }
    } catch (e) {
      // 忽略：删除失败时保留原列表
    } finally {
      setDeletingId(null);
      setConfirmTask(null);
    }
  };

  const handleUndoDelete = async () => {
    const task = undoTask;
    if (!task) return;
    clearUndoTimer();
    setUndoTask(null);
    try {
      const ok = await callQt('restore_task', task.id);
      if (ok) {
        // 重新插回列表并保持按 id 倒序
        setTasks((prev) => [...prev, task].sort((a, b) => b.id - a.id));
      }
    } catch (e) {
      // 找回失败则保持已删除状态
    }
  };

  const handleSelectTask = async (task) => {
    setSelectedTask(task);
    setTaskSongs([]);
    setTaskLog([]);
    setSelectedFile(null);
    setFileVisible(false);
    setRightView('preview');
    try {
      const songs = await callQt('get_task_songs', task.id, 500, 0);
      setTaskSongs(songs || []);
    } catch (e) {
      setTaskSongs([]);
    }
    try {
      const records = await callQt('get_task_log', task.id, 2000);
      setTaskLog(records || []);
    } catch (e) {
      setTaskLog([]);
    }
    browseOutput(task.output_path || task.outputPath || '');
  };

  const handleOutParent = () => {
    const current = outputPath || outSelectedFolder;
    if (!current) return;
    const normalized = current.replace(/[\\/]+$/, '');
    const idx = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
    if (idx <= 0) return;
    browseOutput(normalized.slice(0, idx));
  };

  const handleOutFileClick = async (file) => {
    setRightView('preview');
    try {
      const details = await getMusicFileDetails(file.path);
      setSelectedFile({ ...file, ...details });
    } catch (e) {
      setSelectedFile(file);
    }
    setFileVisible(true);
  };

  const matchedSong = useMemo(() => {
    if (!selectedFile) return null;
    const target = normalizePath(selectedFile.path);
    return taskSongs.find((song) => normalizePath(song.output_path) === target) || null;
  }, [selectedFile, taskSongs]);

  const matchedLog = useMemo(() => {
    if (!matchedSong) return null;
    const source = normalizePath(matchedSong.source_path);
    return taskLog.find((record) => normalizePath(record.source) === source)
      || (matchedSong.id ? taskLog.find((record) => record.song_id === matchedSong.id) : null)
      || null;
  }, [matchedSong, taskLog]);

  const handleStop = async () => {
    try {
      await cancelTask();
    } finally {
      resetTask();
    }
  };

  if (!selectedTask) {
    const pageSize = 10;
    const pageCount = Math.max(1, Math.ceil(tasks.length / pageSize));
    const safePage = Math.min(Math.max(1, page), pageCount);
    const pagedTasks = tasks.slice((safePage - 1) * pageSize, safePage * pageSize);
    return (
      <div className="page animate-fadeIn">
        <header className="page-header">
          <div>
            <h1 className="page-title">任务详情</h1>
            <p className="page-copy">先选择一个任务批次，再查看处理统计、运行配置和该任务写入的歌曲。</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={handleNewScrape}>新建刮削</button>
        </header>

        <section className="panel task-list-panel">
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
              <table className="table task-list-table">
                <thead>
                  <tr>
                    <th>任务ID</th>
                    <th>执行目录</th>
                    <th>状态</th>
                    <th><span className="th-with-tip">统计数据<InfoTip text="失败 / 成功 / 总数" /></span></th>
                    <th>执行时间</th>
                    <th>耗时</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTasks.map((task) => (
                    <tr key={task.id} onClick={() => handleSelectTask(task)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{task.id}</td>
                      <td className="mono task-cell-dirs" style={{ maxWidth: 420 }}>
                        <div className="truncate-1" title={task.input_path}>{task.input_path || '-'}</div>
                        <div className="truncate-1 task-cell-sub" title={task.output_path}>{task.output_path || '-'}</div>
                      </td>
                      <td><span className={`chip ${task.status === 'completed' ? 'chip-green' : task.status === 'running' ? 'chip-blue' : task.status === 'failed' || task.status === 'error' ? 'chip-red' : 'chip-amber'}`}>{taskStatusLabel(task.status)}</span></td>
                      <td className="task-cell-stats">
                        <b className={Number(task.failed) > 0 ? 'is-fail' : ''}>{task.failed || 0}</b>
                        <span> / </span>
                        <b>{task.success || 0}</b>
                        <span> / </span>
                        <b>{task.total || 0}</b>
                      </td>
                      <td className="task-cell-time">
                        <div>{(task.started_at || '').replace('T', ' ') || '-'}</div>
                        <div>{(task.finished_at || '').replace('T', ' ') || '-'}</div>
                      </td>
                      <td className="mono">{formatDuration(task.started_at, task.finished_at)}</td>
                      <td className="task-cell-actions" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-secondary task-delete-btn"
                          onClick={() => setConfirmTask(task)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-pagination">
                <span className="table-pagination-info">共 {tasks.length} 个任务 · 第 {safePage} / {pageCount} 页</span>
                <div className="table-pagination-controls">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage(safePage + 1)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {confirmTask && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => { if (!deletingId) setConfirmTask(null); }}
          >
            <div className="modal-card animate-slideIn" onClick={(event) => event.stopPropagation()}>
              <h3 className="modal-title">删除任务 #{confirmTask.id}？</h3>
              <p className="modal-body">
                将从任务列表中移除该任务，仍可在删除后的 6 秒内撤销找回。
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={deletingId === confirmTask.id}
                  onClick={() => setConfirmTask(null)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deletingId === confirmTask.id}
                  onClick={() => handleDeleteTask(confirmTask)}
                >
                  {deletingId === confirmTask.id ? '删除中…' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        )}

        {undoTask && (
          <div className="undo-toast animate-slideIn" role="status">
            <span className="undo-toast-text">已删除任务 #{undoTask.id}</span>
            <button type="button" className="undo-toast-btn" onClick={handleUndoDelete}>撤销</button>
            <button
              type="button"
              className="undo-toast-close"
              onClick={() => { clearUndoTimer(); setUndoTask(null); }}
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        )}
      </div>
    );
  }

  const isRunning = selectedTask.status === 'running';
  const outVisibleItems = [
    ...outSubFolders.map((folder) => ({ ...folder, kind: 'folder' })),
    ...outFiles.map((file) => ({ ...file, kind: 'audio' })),
  ];

  return (
    <div className="page library-page animate-fadeIn">
      <header className="page-header">
        <div>
          <h1 className="page-title">任务详情</h1>
          <p className="page-copy">
            浏览本次任务的输出目录，抽查每首歌的标签、封面与各环节日志。
          </p>
        </div>
        <div className="toolbar task-detail-toolbar">
          <div className="task-detail-summary" title="失败 / 成功 / 总数">
            <b className={selectedFailed > 0 ? 'is-fail' : ''}>{selectedFailed}</b>
            <span>/</span>
            <b>{selectedSuccess}</b>
            <span>/</span>
            <b>{selectedTotal}</b>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setSelectedTask(null)}>返回任务列表</button>
          {isRunning && taskStatus === 'processing' && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? <Icons.Play /> : <Icons.Pause />}
                {isPaused ? '继续' : '暂停'}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleStop}>
                <Icons.Stop />
                停止
              </button>
            </>
          )}
        </div>
      </header>

      {(outputPath || isRunning) && (
        <div className="library-root-row task-dir-rows">
          <div className="task-dir-lines">
            <div className="task-dir-line">
              <span>输出根目录</span>
              <span className="library-current-path mono" title={selectedTask.output_path}>
                {selectedTask.output_path || '尚未生成'}
              </span>
            </div>
            <div className="task-dir-line">
              <span>当前目录</span>
              <span className="library-current-path mono" title={outputPath || selectedTask.output_path}>
                {outputPath || selectedTask.output_path || '尚未生成'}
              </span>
            </div>
          </div>
          <span className="task-detail-status">
            {isRunning && <Icons.Loader />}
            {(isRunning && progressText) ? progressText : taskStatusLabel(selectedTask.status)}
          </span>
        </div>
      )}

      <section className="library-workbench">
        <div className="library-browser-column">
          <div className="library-section-head">
            <div className="library-section-lead">
              {outputPath && (
                <button
                  type="button"
                  className="btn btn-secondary library-parent-button"
                  onClick={handleOutParent}
                  aria-label="返回上一级"
                  title="返回上一级"
                >
                  <Icons.Parent />
                </button>
              )}
              <div>
                <p className="panel-subtitle">
                  {outVisibleItems.length > 0 ? `${outVisibleItems.length} 项` : '当前目录暂无可展示文件'}
                </p>
              </div>
            </div>
            <div className="library-section-actions">
              <span className="library-section-count">{outSubFolders.length} 目录</span>
              <span className="library-section-count">{outFiles.length} 音频</span>
              {outLoading && (
                <span className="chip chip-blue">
                  <Icons.Loader />
                  加载中
                </span>
              )}
            </div>
          </div>

          <div className="library-scroll-list library-unified-list">
            {outLoading ? (
              <div className="empty-state">
                <Icons.Loader />
                <div style={{ marginTop: 10 }}>正在读取目录</div>
              </div>
            ) : outVisibleItems.length > 0 ? (
              outVisibleItems.map((item, index) => (
                <LibraryItemRow
                  key={`${item.path}-${index}`}
                  item={item}
                  selected={item.kind === 'folder' ? outSelectedFolder === item.path : selectedFile?.path === item.path}
                  onOpenFolder={browseOutput}
                  onOpenFile={handleOutFileClick}
                />
              ))
            ) : (
              <div className="empty-state">
                <Icons.File />
                <div style={{ marginTop: 10, fontWeight: 850, color: 'var(--ink)' }}>
                  {isRunning ? '任务进行中，输出目录还在生成' : '当前目录为空'}
                </div>
              </div>
            )}
          </div>
        </div>

        {rightView === 'log' && selectedFile ? (
          <section className="library-inspector animate-slideIn">
            <div className="library-inspector-body">
              <button
                type="button"
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setRightView('preview')}
              >
                ← 返回预览
              </button>
              {matchedLog ? (
                <LogRecord record={matchedLog} />
              ) : (
                <div className="empty-state">
                  <Icons.File />
                  <div style={{ marginTop: 10, fontWeight: 850, color: 'var(--ink)' }}>没有环节日志</div>
                  <div style={{ marginTop: 4, fontSize: 13 }}>该歌曲可能在记录环节日志的功能上线前处理。</div>
                </div>
              )}
            </div>
          </section>
        ) : fileVisible ? (
          <FileDetailPanel
            file={selectedFile}
            headerExtra={(
              <SongInspectorHeader
                song={matchedSong}
                hasLog={Boolean(matchedLog)}
                onShowLog={() => setRightView('log')}
              />
            )}
            footerExtra={<SongInspectorPaths song={matchedSong} outputRoot={selectedTask.output_path} />}
          />
        ) : (
          <EmptyInspector
            title="选择一首输出文件查看信息"
            description="左侧是本次任务的输出目录。点击任意音频可查看封面、标签、播放，并进入它的各环节日志。"
          />
        )}
      </section>
    </div>
  );
}
