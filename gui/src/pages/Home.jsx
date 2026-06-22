import React, { useEffect, useRef, useState } from 'react';
import useAppStore from '../stores/appStore';
import { useQtBridge } from '../bridge';
import { deriveOutputPath } from '../utils/paths';
import { LibraryItemRow, FileDetailPanel, EmptyInspector } from '../components/LibraryInspector';

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
  Parent: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5 5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h11a4 4 0 014 4v1" />
    </Icon>
  ),
  Check: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </Icon>
  ),
  Play: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14l11-7L8 5z" />
    </Icon>
  ),
  Pause: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14M16 5v14" />
    </Icon>
  ),
  Disc: () => (
    <Icon size="w-12 h-12">
      <circle cx="12" cy="12" r="8" strokeWidth={1.8} />
      <circle cx="12" cy="12" r="2.4" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v3M12 17v3M4 12h3M17 12h3" />
    </Icon>
  ),
};

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

  const handleFolderClick = async (path, options = {}) => {
    if (!path) return false;
    const { persist = true } = options;
    setLoadingPath(path);
    setSelectedFolder(path);
    try {
      const result = await callQt('scan_directory_lazy', path);
      if (result?.exists === false) {
        return false;
      }
      const resolvedPath = result?.path || path;
      store.setCurrentPath(resolvedPath);
      store.setSubFolders(result?.subfolders || []);
      store.setCurrentFiles(result?.files || []);
      store.closeFileDetail();
      if (persist) {
        window.localStorage?.setItem(lastLibraryPathKey, resolvedPath);
        callQt('set_last_library_path', resolvedPath).catch((error) => {
          console.warn('保存上次资源库目录失败:', error);
        });
      }
      return true;
    } catch (e) {
      console.error('扫描文件夹失败:', e);
      store.setSubFolders([]);
      store.setCurrentFiles([]);
      return false;
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

  const handleCreateScrapeFromCurrentPath = () => {
    const inputPath = store.currentPath || selectedFolder;
    if (!inputPath) return;

    store.resetWorkflow();
    store.updateWorkflowConfig({
      inputPath,
      outputPath: deriveOutputPath(inputPath),
    });
    store.setWorkflowStep(1);
    store.setCurrentPage('scrape');
  };

  const handleFileClick = async (file) => {
    try {
      const details = await getMusicFileDetails(file.path);
      store.selectFile({ ...file, ...details });
    } catch (e) {
      store.selectFile(file);
    }
  };

  // 菜单导航时回到资源库的「第一页」：收起已打开的文件详情，回到纯浏览态
  const navMountRef = useRef(false);
  useEffect(() => {
    if (!navMountRef.current) { navMountRef.current = true; return; }
    setSelectedFolder(null);
    useAppStore.getState().closeFileDetail();
  }, [store.navNonce]);

  useEffect(() => {
    const fileName = store.fileDetailVisible && store.selectedFile?.name ? store.selectedFile.name : '';
    document.title = fileName ? `OpenMusicTag - ${fileName}` : 'OpenMusicTag - 音乐整理工具';
    callQt('set_window_title', fileName).catch(() => {});
  }, [callQt, store.fileDetailVisible, store.selectedFile?.name]);

  useEffect(() => {
    if (useAppStore.getState().currentPath) return undefined;
    if (restoreRunRef.current) return undefined;
    restoreRunRef.current = true;

    let cancelled = false;
    const restoreLibraryPath = async () => {
      const candidates = [];
      try {
        const savedPath = await callQt('get_last_library_path');
        if (savedPath) candidates.push(savedPath);
      } catch (error) {
        console.warn('读取上次资源库目录失败:', error);
      }

      const localPath = window.localStorage?.getItem(lastLibraryPathKey);
      if (localPath) candidates.push(localPath);

      try {
        const homePath = await callQt('get_home_path');
        if (homePath) candidates.push(homePath);
      } catch (error) {
        console.warn('读取用户目录失败:', error);
      }

      const uniqueCandidates = [...new Set(candidates.filter(Boolean))];
      for (const candidate of uniqueCandidates) {
        if (cancelled) return;
        const opened = await handleFolderClick(candidate, { persist: true });
        if (opened) return;
      }
    };

    restoreLibraryPath();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasLibraryRoot = Boolean(store.currentPath || store.subFolders.length > 0 || store.currentFiles.length > 0);
  const visibleItems = [
    ...store.subFolders.map((folder) => ({ ...folder, kind: 'folder' })),
    ...store.currentFiles.map((file) => ({ ...file, kind: 'audio' })),
  ];

  return (
    <div className="page library-page animate-fadeIn">
      <header className="page-header">
        <div>
          <h1 className="page-title">资源库详情</h1>
          <p className="page-copy">
            浏览目录、抽查音频标签，并在处理前确认文件名、艺人、专辑和刮削字段是否可信。
          </p>
        </div>
        <div className="toolbar">
          {store.currentPath && (
            <button type="button" className="btn btn-primary" onClick={handleCreateScrapeFromCurrentPath}>
              用当前目录新建刮削
            </button>
          )}
        </div>
      </header>

      {store.currentPath && (
        <div className="library-root-row">
          <span>当前目录</span>
          <span className="library-current-path mono" title={store.currentPath}>
            {store.currentPath}
          </span>
          <button type="button" className="btn btn-secondary" onClick={handleChooseRoot}>
            切换根目录
          </button>
        </div>
      )}

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
            <div className="library-section-head">
              <div className="library-section-lead">
                {store.currentPath && (
                  <button
                    type="button"
                    className="btn btn-secondary library-parent-button"
                    onClick={handleParentClick}
                    aria-label="返回上一级"
                    title="返回上一级"
                  >
                    <Icons.Parent />
                  </button>
                )}
                <div>
                  <p className="panel-subtitle">
                    {visibleItems.length > 0 ? `${visibleItems.length} 项` : '当前目录暂无可展示文件'}
                  </p>
                </div>
              </div>
              <div className="library-section-actions">
                <span className="library-section-count">{store.subFolders.length} 目录</span>
                <span className="library-section-count">{store.currentFiles.length} 音频</span>
                {loadingPath && (
                  <span className="chip chip-blue">
                    <Icons.Loader />
                    加载中
                  </span>
                )}
              </div>
            </div>

            <div className="library-scroll-list library-unified-list">
              {store.isLoadingFiles ? (
                <div className="empty-state">
                  <Icons.Loader />
                  <div style={{ marginTop: 10 }}>正在读取目录</div>
                </div>
              ) : visibleItems.length > 0 ? (
                visibleItems.map((item, index) => (
                  <LibraryItemRow
                    key={`${item.path}-${index}`}
                    item={item}
                    selected={item.kind === 'folder' ? selectedFolder === item.path : store.selectedFile?.path === item.path}
                    onOpenFolder={handleFolderClick}
                    onOpenFile={handleFileClick}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <Icons.File />
                  <div style={{ marginTop: 10, fontWeight: 850, color: 'var(--ink)' }}>当前目录为空</div>
                </div>
              )}
            </div>
          </div>

          {store.fileDetailVisible ? (
            <FileDetailPanel
              file={store.selectedFile}
            />
          ) : (
            <EmptyInspector />
          )}
        </section>
      )}
    </div>
  );
}
