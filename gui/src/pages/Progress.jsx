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

function LogRecord({ record }) {
  const status = record.status || 'info';
  const chipClass = status === 'success' ? 'chip-green' : status === 'failed' ? 'chip-red' : 'chip-amber';
  return (
    <article className="panel" style={{ padding: 14, boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div className="truncate-1 mono" style={{ minWidth: 0, fontSize: 12, color: 'var(--ink-soft)' }}>{record.source}</div>
        <span className={`chip ${chipClass}`}>{status}</span>
      </div>
      <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
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
        {(record.stages || []).length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--faint)' }}>没有记录到环节明细。</div>
        )}
      </div>
    </article>
  );
}

function SongInspectorHeader({ song, hasLog, onShowLog }) {
  const status = song?.status || 'info';
  const chipClass = status === 'success' ? 'chip-green' : status === 'failed' ? 'chip-red' : status === 'skipped' ? 'chip-amber' : '';
  const isFailed = status === 'failed';
  return (
    <div className="task-song-head">
      <div className="task-song-head-row">
        <span className={`chip ${chipClass}`}>{song ? status : '未在本任务记录'}</span>
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
      {song && (
        <div className="task-song-paths">
          <div className="task-song-path"><span>来源</span><code className="mono truncate-1" title={song.source_path}>{song.source_path || '-'}</code></div>
          <div className="task-song-path"><span>输出</span><code className="mono truncate-1" title={song.output_path}>{song.output_path || '-'}</code></div>
        </div>
      )}
      {isFailed && (song.failed_stage || song.error_message) && (
        <div className="task-song-error">
          {song.failed_stage && <span style={{ fontWeight: 800 }}>{song.failed_stage}</span>}
          {song.error_message && <span style={{ marginLeft: song.failed_stage ? 8 : 0 }}>{song.error_message}</span>}
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
    totalFiles,
    processedFiles,
    successCount,
    failCount,
    setCurrentPage,
    resetTask,
    resetWorkflow,
    addHistory,
  } = useAppStore();
  const { cancelTask, callQt, getMusicFileDetails } = useQtBridge();
  const [isPaused, setIsPaused] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tasksReady, setTasksReady] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskSongs, setTaskSongs] = useState([]);
  const [taskLog, setTaskLog] = useState([]);

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
  const successRate = processedFiles > 0 ? Math.round((successCount / processedFiles) * 100) : 0;
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
          <p className="page-kicker">Task monitor</p>
          <h1 className="page-title">任务详情</h1>
          <p className="page-copy">
            浏览本次任务的输出目录，抽查每首歌的标签、封面与各环节日志。
          </p>
        </div>
        <div className="toolbar task-detail-toolbar">
          <div className="task-detail-summary">
            <span className="task-detail-stat"><b>{selectedProgress}%</b>进度</span>
            <span className="task-detail-stat"><b>{selectedTotal}</b>文件</span>
            <span className="task-detail-stat"><b style={{ color: 'var(--ink)' }}>{selectedSuccess}</b>成功</span>
            <span className="task-detail-stat"><b style={{ color: selectedFailed > 0 ? 'var(--red)' : 'var(--ink)' }}>{selectedFailed}</b>失败</span>
            <span className="task-detail-stat"><b>{selectedRate}%</b>成功率</span>
          </div>
          <StatusBadge status={selectedTask.status === 'failed' || selectedTask.status === 'error' ? 'error' : (isRunning ? 'processing' : 'info')}>
            {selectedTask.status || statusText}
          </StatusBadge>
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
          {selectedTask.status === 'completed' && (
            <button type="button" className="btn btn-primary" onClick={() => setCurrentPage('files')}>查看资源库</button>
          )}
        </div>
      </header>

      {(outputPath || isRunning) && (
        <div className="library-root-row">
          <span>输出目录</span>
          <span className="library-current-path mono" title={outputPath || selectedTask.output_path}>
            {outputPath || selectedTask.output_path || '尚未生成'}
          </span>
          <span className="task-detail-stat" style={{ marginLeft: 'auto' }}>{progressText || statusText}</span>
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
