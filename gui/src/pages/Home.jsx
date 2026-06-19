import React, { useEffect, useState } from 'react';
import useAppStore, { useStats } from '../stores/appStore';
import { useQtBridge } from '../bridge';
import { formatFileSize } from '../utils/format';

const Icon = ({ children, size = 'w-5 h-5' }) => (
  <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const Icons = {
  Music: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2zm12-3c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2zM9 10l12-3" />
    </Icon>
  ),
  Folder: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.5 7.5A2.5 2.5 0 016 5h4l2 2h6a2.5 2.5 0 012.5 2.5v7A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5v-9z" />
    </Icon>
  ),
  File: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h6l4 4v12H7V4z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 4v5h5M9 14h6M9 17h4" />
    </Icon>
  ),
  Loader: () => (
    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.6A8 8 0 1120 12" />
    </svg>
  ),
  Arrow: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Check: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </Icon>
  ),
};

function extTone(ext = '') {
  const value = ext.toLowerCase();
  if (value === '.flac' || value === '.wav') return 'chip-green';
  if (value === '.m4a' || value === '.ape') return 'chip-amber';
  if (value === '.ogg') return 'chip-blue';
  return 'chip-blue';
}

function metadataScore(file) {
  if (!file) return 0;
  const fields = ['title', 'artist', 'album', 'year', 'genre', 'track'];
  const filled = fields.filter((field) => Boolean(file[field] || file.tags?.[field])).length;
  return Math.round((filled / fields.length) * 100);
}

function StatStrip({ totalFiles, processedFiles, successCount, failCount }) {
  const successRate = processedFiles > 0 ? Math.round((successCount / processedFiles) * 100) : 0;
  const items = [
    ['已处理', processedFiles.toLocaleString(), '首'],
    ['库内文件', totalFiles.toLocaleString(), '个'],
    ['成功率', `${successRate}%`, '写入标签'],
    ['待复核', failCount.toLocaleString(), '首'],
  ];

  return (
    <div className="metric-grid" style={{ marginBottom: 16 }}>
      {items.map(([label, value, note]) => (
        <section key={label} className="metric-card" style={{ minHeight: 100 }}>
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ fontSize: 28 }}>{value}</div>
          <div className="metric-note">{note}</div>
        </section>
      ))}
    </div>
  );
}

function FolderRow({ folder, selected, onClick }) {
  const count = folder.fileCount ?? 0;

  return (
    <button
      type="button"
      onClick={() => onClick(folder.path)}
      className="panel"
      style={{
        width: '100%',
        padding: 12,
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        cursor: 'pointer',
        background: selected ? 'var(--groove-soft)' : 'var(--panel)',
        borderColor: selected ? 'rgba(31, 95, 99, 0.38)' : 'var(--line)',
      }}
    >
      <span className="chip chip-amber" style={{ width: 34, height: 34, padding: 0, justifyContent: 'center' }}>
        <Icons.Folder />
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="truncate-1" style={{ display: 'block', fontWeight: 850, color: 'var(--ink)' }}>{folder.name}</span>
        <span style={{ display: 'block', marginTop: 3, color: 'var(--muted)', fontSize: 12 }}>
          {count < 0 ? '统计中...' : `${count} 个文件（含子目录音乐）`}
        </span>
      </span>
      <Icons.Arrow />
    </button>
  );
}

function FileRow({ file, selected, onClick }) {
  const ext = file.ext || '';
  const score = metadataScore(file);

  return (
    <button
      type="button"
      onClick={() => onClick(file)}
      className="panel"
      style={{
        width: '100%',
        padding: 12,
        boxShadow: 'none',
        display: 'grid',
        gridTemplateColumns: '34px minmax(0, 1fr) auto',
        gap: 12,
        alignItems: 'center',
        textAlign: 'left',
        cursor: 'pointer',
        background: selected ? 'var(--groove-soft)' : 'var(--panel)',
        borderColor: selected ? 'rgba(31, 95, 99, 0.38)' : 'var(--line)',
      }}
    >
      <span className={`chip ${extTone(ext)}`} style={{ width: 34, height: 34, padding: 0, justifyContent: 'center' }}>
        <Icons.Music />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="truncate-1" style={{ display: 'block', fontWeight: 850, color: 'var(--ink)' }}>{file.name}</span>
        <span className="truncate-1" style={{ display: 'block', marginTop: 3, color: 'var(--muted)', fontSize: 12 }}>
          {file.artist || '未知艺人'} / {file.title || '未知标题'}
        </span>
      </span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span className={`chip ${extTone(ext)}`}>{ext ? ext.toUpperCase() : 'FILE'}</span>
        <span className={score >= 70 ? 'chip chip-green' : 'chip chip-amber'}>{score}%</span>
      </span>
    </button>
  );
}

function DetailField({ label, value, mono = false }) {
  return (
    <div>
      <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div
        className={mono ? 'mono' : undefined}
        style={{
          minHeight: 36,
          padding: '8px 10px',
          border: '1px solid var(--line)',
          borderRadius: 8,
          background: 'rgba(247, 242, 232, 0.62)',
          color: value ? 'var(--ink)' : 'var(--faint)',
          fontSize: mono ? 12 : 13,
          overflowWrap: 'anywhere',
        }}
      >
        {value || '-'}
      </div>
    </div>
  );
}

function FileDetailPanel({ file, onClose }) {
  if (!file) return null;

  const score = metadataScore(file);
  const tags = file.tags && typeof file.tags === 'object' ? file.tags : {};
  const extraTags = Object.entries(tags).filter(([key]) => !['title', 'artist', 'album', 'year', 'genre', 'track'].includes(key));

  return (
    <aside className="panel animate-slideIn library-detail" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="panel-header">
        <div style={{ minWidth: 0 }}>
          <h2 className="panel-title truncate-1">元数据检查</h2>
          <p className="panel-subtitle truncate-1">{file.name}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="关闭详情">
          <Icons.Close />
        </button>
      </div>

      <div style={{ padding: 16, overflowY: 'auto' }}>
        <div className="waveform" style={{ height: 96, marginBottom: 14 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span className={score >= 70 ? 'chip chip-green' : 'chip chip-amber'}>
            <Icons.Check />
            标签完整度 {score}%
          </span>
          <span className={`chip ${extTone(file.ext)}`}>{(file.ext || 'file').toUpperCase()}</span>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <DetailField label="标题" value={file.title || tags.title} />
          <DetailField label="艺人" value={file.artist || tags.artist} />
          <DetailField label="专辑" value={file.album || tags.album} />
          <DetailField label="年份" value={file.year || tags.year} />
          <DetailField label="流派" value={file.genre || tags.genre} />
          <DetailField label="音轨" value={file.track || tags.track} />
          <DetailField label="时长" value={file.duration} />
          <DetailField label="大小" value={file.bytes ? formatFileSize(file.bytes) : ''} />
          <DetailField label="文件路径" value={file.path} mono />
        </div>

        {extraTags.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 className="panel-title" style={{ marginBottom: 10 }}>刮削字段</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {extraTags.map(([key, value]) => (
                <DetailField key={key} label={key} value={Array.isArray(value) ? value.join(', ') : String(value ?? '')} mono />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function Home() {
  const { totalFiles, processedFiles, successCount, failCount } = useStats();
  const store = useAppStore();
  const {
    scanDirectory,
    getMusicFileDetails,
    getCommonDirectories,
    callQt,
  } = useQtBridge();
  const [loadingPath, setLoadingPath] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderCounts, setFolderCounts] = useState({});

  useEffect(() => {
    if (useAppStore.getState().subFolders.length > 0) return undefined;

    let active = true;
    (async () => {
      try {
        const dirs = await getCommonDirectories();
        if (active) {
          useAppStore.getState().setCommonDirectories(dirs || []);
          hydrateFolderCounts((dirs || []).map((path) => ({ path, fileCount: -1 })));
        }
      } catch (e) {
        if (active) useAppStore.getState().setCommonDirectories([]);
      }
    })();
    return () => { active = false; };
  }, [getCommonDirectories]);

  const handleFolderClick = async (path) => {
    setLoadingPath(path);
    setSelectedFolder(path);
    try {
      let result;
      try {
        result = await callQt('scan_directory_lazy', path);
      } catch (lazyError) {
        result = await scanDirectory(path);
      }
      store.setCurrentPath(path);
      store.setSubFolders(result?.subfolders || []);
      store.setCurrentFiles(result?.files || []);
      store.closeFileDetail();
      hydrateFolderCounts(result?.subfolders || []);
    } catch (e) {
      console.error('扫描文件夹失败:', e);
      store.setSubFolders([]);
      store.setCurrentFiles([]);
    } finally {
      setLoadingPath(null);
    }
  };

  const hydrateFolderCounts = async (folders) => {
    const pending = folders.filter((folder) => folder?.path && (folder.fileCount == null || folder.fileCount < 0));
    pending.slice(0, 24).forEach(async (folder) => {
      try {
        const count = await callQt('count_folder_files', folder.path);
        setFolderCounts((prev) => ({ ...prev, [folder.path]: count }));
      } catch (e) {
        setFolderCounts((prev) => ({ ...prev, [folder.path]: 0 }));
      }
    });
  };

  const handleParentClick = () => {
    const current = store.currentPath || selectedFolder;
    if (!current) return;
    const normalized = current.replace(/[\\/]+$/, '');
    const idx = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
    if (idx <= 0) return;
    handleFolderClick(normalized.slice(0, idx));
  };

  const handleFileClick = async (file) => {
    try {
      const details = await getMusicFileDetails(file.path);
      store.selectFile({ ...file, ...details });
    } catch (e) {
      store.selectFile(file);
    }
  };

  return (
    <div className="page animate-fadeIn">
      <header className="page-header">
        <div>
          <p className="page-kicker">Library inspector</p>
          <h1 className="page-title">资源库详情</h1>
          <p className="page-copy">
            浏览目录、抽查音频标签，并在处理前确认文件名、艺人、专辑和刮削字段是否可信。
          </p>
        </div>
        <div className="toolbar">
          <span className="chip chip-blue">MP3</span>
          <span className="chip chip-green">FLAC</span>
          <span className="chip chip-amber">M4A</span>
          <span className="chip">APE / OGG / WAV</span>
        </div>
      </header>

      <StatStrip
        totalFiles={totalFiles}
        processedFiles={processedFiles}
        successCount={successCount}
        failCount={failCount}
      />

      <section className={`library-grid ${store.fileDetailVisible ? 'has-detail' : ''}`}>
        <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">目录结构</h2>
              <p className="panel-subtitle">逐层选择歌手、专辑或文件夹</p>
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
            <div className="mono truncate-1" style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
              {store.currentPath || '常用位置'}
            </div>
            {store.currentPath && (
              <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={handleParentClick}>
                返回上一级
              </button>
            )}
          </div>
          <div style={{ padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {store.subFolders.length > 0 ? (
              store.subFolders.map((folder) => (
                <FolderRow
                  key={folder.path}
                  folder={{
                    ...folder,
                    fileCount: folderCounts[folder.path] ?? folder.fileCount,
                  }}
                  selected={selectedFolder === folder.path}
                  onClick={handleFolderClick}
                />
              ))
            ) : (
              <>
                {store.commonDirectories.slice(0, 6).map((path) => (
                  <FolderRow
                    key={path}
                    folder={{
                      name: path.split(/[\\/]/).filter(Boolean).pop() || path,
                      path,
                      fileCount: folderCounts[path] ?? -1,
                    }}
                    selected={selectedFolder === path}
                    onClick={handleFolderClick}
                  />
                ))}
                {store.commonDirectories.length === 0 && (
                  <div className="empty-state">
                    <Icons.Folder />
                    <div style={{ marginTop: 10 }}>还没有目录</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">待处理文件</h2>
              <p className="panel-subtitle">
                {store.currentFiles.length > 0 ? `${store.currentFiles.length} 首位于当前目录` : '选择目录后显示当前层文件'}
              </p>
            </div>
            {loadingPath && <span className="chip chip-blue"><Icons.Loader /> 加载中</span>}
          </div>

          <div style={{ padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {store.isLoadingFiles ? (
              <div className="empty-state">
                <Icons.Loader />
                <div style={{ marginTop: 10 }}>正在读取目录</div>
              </div>
            ) : store.currentFiles.length > 0 ? (
              store.currentFiles.map((file, index) => (
                <FileRow
                  key={`${file.path}-${index}`}
                  file={file}
                  selected={store.selectedFile?.path === file.path}
                  onClick={handleFileClick}
                />
              ))
            ) : (
              <div className="empty-state">
                <Icons.File />
                <div style={{ marginTop: 10, fontWeight: 850, color: 'var(--ink)' }}>没有可展示的音乐文件</div>
                <div style={{ marginTop: 4, fontSize: 13 }}>支持 MP3、FLAC、M4A、APE、OGG、WAV。</div>
              </div>
            )}
          </div>
        </div>

        {store.fileDetailVisible && (
          <FileDetailPanel
            file={store.selectedFile}
            onClose={() => store.closeFileDetail()}
          />
        )}
      </section>
    </div>
  );
}
