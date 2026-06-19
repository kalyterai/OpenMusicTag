import React, { useEffect, useRef, useState } from 'react';
import useAppStore from '../stores/appStore';
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

function FolderRow({ folder, selected, onClick }) {
  const count = folder.fileCount ?? -1;

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
          {count < 0 ? '文件夹 / 展开查看' : `${count} 个当前层音乐文件`}
        </span>
      </span>
      <Icons.Arrow />
    </button>
  );
}

function FileRow({ file, selected, onClick }) {
  const ext = file.ext || '';

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
      </span>
    </button>
  );
}

function DetailField({ label, value, mono = false }) {
  return (
    <div className="library-info-field">
      <div className="library-info-label">{label}</div>
      <div
        className={mono ? 'mono' : undefined}
        style={{ color: value ? 'var(--ink)' : 'var(--faint)' }}
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
    <section className="library-inspector animate-slideIn">
      <div className="library-inspector-head">
        <div style={{ minWidth: 0 }}>
          <p className="page-kicker">Selected audio</p>
          <h2 className="library-inspector-title truncate-1">文件信息</h2>
          <p className="panel-subtitle truncate-1">{file.name}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="关闭详情">
          <Icons.Close />
        </button>
      </div>

      <div className="library-inspector-body">
        <div className="library-inspector-summary">
          <span className={`chip ${extTone(file.ext)}`}>{(file.ext || 'file').toUpperCase()}</span>
          <span className={score >= 70 ? 'chip chip-green' : 'chip chip-amber'}>
            <Icons.Check />
            标签完整度 {score}%
          </span>
          <span className="chip chip-blue">{file.bytes ? formatFileSize(file.bytes) : '大小未知'}</span>
        </div>

        <div className="detail-grid">
          <DetailField label="标题" value={file.title || tags.title} />
          <DetailField label="艺人" value={file.artist || tags.artist} />
          <DetailField label="专辑" value={file.album || tags.album} />
          <DetailField label="年份" value={file.year || tags.year} />
          <DetailField label="流派" value={file.genre || tags.genre} />
          <DetailField label="音轨" value={file.track || tags.track} />
          <DetailField label="时长" value={file.duration} />
          <DetailField label="大小" value={file.bytes ? formatFileSize(file.bytes) : ''} />
        </div>

        <div className="library-path-block">
          <div className="library-info-label">文件路径</div>
          <div className="mono">{file.path || '-'}</div>
        </div>

        {extraTags.length > 0 && (
          <div className="library-extra-tags">
            <h3 className="panel-title">其他标签字段</h3>
            <div className="library-extra-grid">
              {extraTags.map(([key, value]) => (
                <DetailField key={key} label={key} value={Array.isArray(value) ? value.join(', ') : String(value ?? '')} mono />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyInspector() {
  return (
    <section className="library-inspector library-inspector-empty">
      <Icons.Music />
      <div>
        <h2 className="library-inspector-title">选择一首文件查看信息</h2>
        <p className="panel-subtitle">
          这里会展示标题、艺人、专辑、年份、流派、音轨、文件路径和原始标签字段。文件队列只负责选择，真正的检查工作在这里完成。
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  const store = useAppStore();
  const {
    getMusicFileDetails,
    selectDirectory,
    callQt,
  } = useQtBridge();
  const [loadingPath, setLoadingPath] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const restoreRunRef = useRef(false);
  const lastLibraryPathKey = 'openmusictag:last-library-path';

  useEffect(() => {
    if (useAppStore.getState().subFolders.length > 0) return undefined;
    if (restoreRunRef.current) return undefined;
    restoreRunRef.current = true;

    const lastPath = window.localStorage?.getItem(lastLibraryPathKey);
    if (lastPath) {
      handleFolderClick(lastPath);
    }
    return undefined;
  }, []);

  const handleFolderClick = async (path) => {
    setLoadingPath(path);
    setSelectedFolder(path);
    try {
      const result = await callQt('scan_directory_lazy', path);
      store.setCurrentPath(path);
      store.setSubFolders(result?.subfolders || []);
      store.setCurrentFiles(result?.files || []);
      store.closeFileDetail();
      window.localStorage?.setItem(lastLibraryPathKey, path);
    } catch (e) {
      console.error('扫描文件夹失败:', e);
      store.setSubFolders([]);
      store.setCurrentFiles([]);
    } finally {
      setLoadingPath(null);
    }
  };

  const handleChooseRoot = async () => {
    const selected = await selectDirectory(store.currentPath || selectedFolder || '');
    if (selected) {
      handleFolderClick(selected);
    }
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

  const hasLibraryRoot = Boolean(store.currentPath || store.subFolders.length > 0 || store.currentFiles.length > 0);

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
          {store.currentPath && (
            <span className="chip mono chip-blue" title={store.currentPath}>
              {store.currentPath.split(/[\\/]/).filter(Boolean).pop() || store.currentPath}
            </span>
          )}
          <button type="button" className="btn btn-primary" onClick={handleChooseRoot}>
            选择文件夹
          </button>
        </div>
      </header>

      {!hasLibraryRoot && (
        <section className="panel library-start-panel">
          <div className="empty-state" style={{ minHeight: 220 }}>
            <Icons.Folder />
            <div style={{ marginTop: 10, fontWeight: 850, color: 'var(--ink)' }}>选择一个音乐根目录</div>
            <div style={{ marginTop: 4, maxWidth: 520, fontSize: 13 }}>
              资源库不会默认扫描主目录、磁盘或网络卷。选择一个目录后，会记住它，下次进入资源库只恢复这个目录。
            </div>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleChooseRoot}>
              选择文件夹
            </button>
          </div>
        </section>
      )}

      {hasLibraryRoot && (
        <section className="library-workbench">
          <div className="library-browser-column">
            <div className="library-browser-strip">
              <div>
                <span className="library-browser-label">当前目录</span>
                <div className="mono truncate-1" title={store.currentPath || ''}>
                  {store.currentPath || '未选择目录'}
                </div>
              </div>
              <div className="library-browser-actions">
                {store.currentPath && (
                  <button type="button" className="btn btn-secondary" onClick={handleParentClick}>
                    返回上一级
                  </button>
                )}
                <button type="button" className="btn btn-ghost" onClick={handleChooseRoot}>
                  {store.currentPath ? '切换根目录' : '选择文件夹'}
                </button>
              </div>
            </div>

            <div className="library-browser-sections">
              <div className="library-browser-section library-directory-panel">
                <div className="library-section-head">
                  <div>
                    <h2 className="panel-title">目录结构</h2>
                    <p className="panel-subtitle">只展开当前层级</p>
                  </div>
                  <span className="chip">{store.subFolders.length}</span>
                </div>
                <div className="library-scroll-list">
                  {store.subFolders.length > 0 ? (
                    store.subFolders.map((folder) => (
                      <FolderRow
                        key={folder.path}
                        folder={folder}
                        selected={selectedFolder === folder.path}
                        onClick={handleFolderClick}
                      />
                    ))
                  ) : (
                    <div className="empty-state">
                      <Icons.Folder />
                      <div style={{ marginTop: 10 }}>{store.currentPath ? '当前目录没有子目录' : '请选择音乐根目录'}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="library-browser-section library-files-panel">
                <div className="library-section-head">
                  <div>
                    <h2 className="panel-title">待处理文件</h2>
                    <p className="panel-subtitle">
                      {store.currentFiles.length > 0 ? '仅当前目录下的音乐文件' : '选择目录后显示当前层文件'}
                    </p>
                  </div>
                  {loadingPath ? <span className="chip chip-blue"><Icons.Loader /> 加载中</span> : <span className="chip">{store.currentFiles.length}</span>}
                </div>

                <div className="library-scroll-list">
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
            </div>
          </div>

          {store.fileDetailVisible ? (
            <FileDetailPanel
              file={store.selectedFile}
              onClose={() => store.closeFileDetail()}
            />
          ) : (
            <EmptyInspector />
          )}
        </section>
      )}
    </div>
  );
}
