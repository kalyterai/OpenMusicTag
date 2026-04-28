import React from 'react';

// SVG Icons
const Icons = {
  Music: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Disc: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Hash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  ),
  File: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  MusicNote: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  Tag: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

// 标签项组件
function TagItem({ label, value, icon: Icon, highlight = false }) {
  if (!value) return null;
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg ${highlight ? 'bg-primary-50' : 'bg-neutral-50'}`}>
      <div className={`mt-0.5 ${highlight ? 'text-primary-600' : 'text-neutral-400'}`}>
        <Icon />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-neutral-500">{label}</div>
        <div className={`text-sm font-medium truncate ${highlight ? 'text-primary-900' : 'text-neutral-900'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

// 状态标签
function StatusBadge({ status, text }) {
  const styles = {
    success: 'bg-green-50 text-green-600 border-green-200',
    warning: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    error: 'bg-red-50 text-red-600 border-red-200',
    info: 'bg-blue-50 text-blue-600 border-blue-200',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border ${styles[status]}`}>
      {status === 'success' && <Icons.Check />}
      {status === 'warning' && <Icons.Alert />}
      {text}
    </span>
  );
}

export default function SongDetail({ song }) {
  if (!song) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-8">
        <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4">
          <Icons.Music />
        </div>
        <p className="text-sm">选择一首歌曲查看详情</p>
      </div>
    );
  }

  // 模拟完整的歌曲信息
  const songInfo = {
    ...song,
    year: '2003',
    genre: '流行',
    trackNumber: '1/11',
    composer: '周杰伦',
    lyrics: '已包含',
    bitrate: '320 kbps',
    sampleRate: '44.1 kHz',
    channels: '立体声',
  };

  return (
    <div className="h-full flex flex-col">
      {/* 封面区域 */}
      <div className="p-6 border-b border-neutral-100">
        <div className="flex gap-4">
          <div className="w-28 h-28 bg-gradient-to-br from-neutral-200 to-neutral-300 rounded-xl flex items-center justify-center text-neutral-400 shadow-inner flex-shrink-0">
            <Icons.Music />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-neutral-900 truncate">{songInfo.title}</h3>
            <p className="text-neutral-600 mt-1 flex items-center gap-1">
              <Icons.User />
              <span className="truncate">{songInfo.artist}</span>
            </p>
            <p className="text-sm text-neutral-500 mt-1 flex items-center gap-1">
              <Icons.Disc />
              <span className="truncate">{songInfo.album}</span>
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <StatusBadge status="success" text="Tag 完整" />
              <StatusBadge status="info" text={songInfo.format.toUpperCase()} />
              <StatusBadge status="warning" text="需下载封面" />
            </div>
          </div>
        </div>
      </div>

      {/* 文件信息 */}
      <div className="p-4 border-b border-neutral-100">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">文件信息</h4>
        <div className="grid grid-cols-2 gap-2">
          <TagItem label="格式" value={songInfo.format.toUpperCase()} icon={Icons.File} />
          <TagItem label="大小" value={songInfo.size} icon={Icons.Hash} />
          <TagItem label="时长" value={songInfo.duration} icon={Icons.Disc} />
          <TagItem label="比特率" value={songInfo.bitrate} icon={Icons.MusicNote} />
        </div>
      </div>

      {/* 元数据标签 */}
      <div className="p-4 border-b border-neutral-100 flex-1 overflow-y-auto">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">元数据标签</h4>
        <div className="space-y-2">
          <TagItem label="标题" value={songInfo.title} icon={Icons.Tag} highlight />
          <TagItem label="艺人" value={songInfo.artist} icon={Icons.User} highlight />
          <TagItem label="专辑" value={songInfo.album} icon={Icons.Disc} />
          <TagItem label="年份" value={songInfo.year} icon={Icons.Calendar} />
          <TagItem label="流派" value={songInfo.genre} icon={Icons.MusicNote} />
          <TagItem label=" track" value={songInfo.trackNumber} icon={Icons.Hash} />
          <TagItem label="作曲" value={songInfo.composer} icon={Icons.User} />
          <TagItem label="歌词" value={songInfo.lyrics} icon={Icons.File} />
        </div>
      </div>

      {/* 文件路径 */}
      <div className="p-4 bg-neutral-50">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">文件路径</h4>
        <p className="text-xs text-neutral-600 break-all font-mono bg-white p-2 rounded-lg border border-neutral-200">
          {songInfo.path}
        </p>
      </div>
    </div>
  );
}
