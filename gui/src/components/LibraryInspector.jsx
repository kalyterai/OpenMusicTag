import React, { useEffect, useRef, useState } from 'react';
import { formatFileSize } from '../utils/format';
import logo from '../assets/logo.png';

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

export function MiddleEllipsis({ text }) {
  const value = String(text || '');
  const tailLength = Math.min(18, Math.max(8, Math.floor(value.length * 0.42)));
  const head = value.length > tailLength ? value.slice(0, value.length - tailLength) : value;
  const tail = value.length > tailLength ? value.slice(-tailLength) : '';

  return (
    <span className="middle-ellipsis">
      <span className="middle-ellipsis-start">{head}</span>
      {tail && <span className="middle-ellipsis-end">{tail}</span>}
    </span>
  );
}

export function LibraryItemRow({ item, selected, onOpenFolder, onOpenFile }) {
  const isFolder = item.kind === 'folder';
  const displayName = isFolder ? `${item.name}/` : item.name;

  return (
    <button
      type="button"
      onClick={() => (isFolder ? onOpenFolder(item.path) : onOpenFile(item))}
      className={`library-file-row ${selected ? 'is-selected' : ''}`}
      title={displayName}
    >
      <MiddleEllipsis text={displayName} />
    </button>
  );
}

export function DetailField({ label, value, mono = false }) {
  return (
    <div className="library-info-field">
      <div className="library-info-label">{label}：</div>
      <div
        className={mono ? 'mono' : undefined}
        style={{ color: value ? 'var(--ink)' : 'var(--faint)' }}
      >
        {value || '-'}
      </div>
    </div>
  );
}

function ArtworkFrame({ file }) {
  const cover = file.coverDataUrl || file.cover_data_url || file.artwork || file.picture;

  return (
    <div className="library-artwork">
      {cover ? (
        <img src={cover} alt={`${file.name || '音频'}封面`} />
      ) : (
        <div className="library-artwork-empty">
          <Icons.Disc />
          <span>未读取到封面</span>
        </div>
      )}
    </div>
  );
}

function toLocalAudioSrc(path) {
  if (!path) return '';
  if (/^(blob|data|https?|file):/i.test(path)) return path;
  const normalized = String(path).replace(/\\/g, '/');
  return encodeURI(normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`);
}

function formatAudioTime(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function AudioPlayer({ file }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const source = toLocalAudioSrc(file?.path);
  const progress = duration > 0 ? (currentTime / duration) * 1000 : 0;
  const cover = file?.coverDataUrl || file?.cover_data_url || file?.artwork || file?.picture || logo;
  const mediaTitle = file?.name || file?.title || 'OpenMusicTag';

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError('');
  }, [source]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') return;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: mediaTitle,
      artist: file?.artist || file?.tags?.artist || '',
      album: file?.album || file?.tags?.album || '',
      artwork: [
        { src: cover, sizes: '512x512', type: cover.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png' },
      ],
    });
  }, [cover, file?.album, file?.artist, file?.tags?.album, file?.tags?.artist, mediaTitle]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !source) return;
    try {
      if (audio.paused) {
        await audio.play();
        setPlaying(true);
      } else {
        audio.pause();
        setPlaying(false);
      }
      setError('');
    } catch (playError) {
      setPlaying(false);
      setError('当前文件无法播放');
    }
  };

  const handleSeek = (value) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const nextTime = (Number(value) / 1000) * duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div className="library-audio-player">
      <audio
        ref={audioRef}
        src={source}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        onError={() => setError('当前文件无法播放')}
      />
      <button
        type="button"
        className="btn btn-primary library-play-button"
        onClick={togglePlayback}
        disabled={!source}
        aria-label={playing ? '暂停' : '播放'}
        title={playing ? '暂停' : '播放'}
      >
        {playing ? <Icons.Pause /> : <Icons.Play />}
      </button>
      <div className="library-player-progress">
        <input
          type="range"
          min="0"
          max="1000"
          step="1"
          value={progress}
          onChange={(event) => handleSeek(event.target.value)}
          disabled={!source || duration <= 0}
          aria-label="播放进度"
        />
        <div className="library-player-time">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>
      {error && <span className="library-player-error">{error}</span>}
    </div>
  );
}

export function FileDetailPanel({ file, headerExtra }) {
  if (!file) return null;

  const tags = file.tags && typeof file.tags === 'object' ? file.tags : {};
  const extraTags = Object.entries(tags).filter(([key]) => !['title', 'artist', 'album', 'year', 'genre', 'track'].includes(key));

  return (
    <section className="library-inspector animate-slideIn">
      <div className="library-inspector-body">
        {headerExtra}
        <div className="library-detail-overview">
          <ArtworkFrame file={file} />
          <div className="library-detail-side">
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
          </div>
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
      <AudioPlayer file={file} />
    </section>
  );
}

export function EmptyInspector({ title = '选择一首文件查看信息', description }) {
  return (
    <section className="library-inspector library-inspector-empty">
      <Icons.Music />
      <div>
        <h2 className="library-inspector-title">{title}</h2>
        <p className="panel-subtitle">
          {description || '这里会展示封面、标题、艺人、专辑、年份、流派、音轨和原始标签字段。文件队列只负责选择，真正的检查工作在这里完成。'}
        </p>
      </div>
    </section>
  );
}
