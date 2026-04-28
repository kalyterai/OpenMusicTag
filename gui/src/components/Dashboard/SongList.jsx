import React, { useState, useEffect } from 'react';

// SVG Icons
const Icons = {
  Music: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

// 模拟歌曲数据
const mockSongs = [
  { id: 1, title: '晴天', artist: '周杰伦', album: '叶惠美', duration: '4:29', format: 'mp3', size: '8.5 MB', path: '/音乐/周杰伦/叶惠美/晴天.mp3' },
  { id: 2, title: '七里香', artist: '周杰伦', album: '七里香', duration: '4:59', format: 'flac', size: '24.3 MB', path: '/音乐/周杰伦/七里香/七里香.flac' },
  { id: 3, title: '告白气球', artist: '周杰伦', album: '周杰伦的床边故事', duration: '3:35', format: 'mp3', size: '7.2 MB', path: '/音乐/周杰伦/床边故事/告白气球.mp3' },
  { id: 4, title: '演员', artist: '薛之谦', album: '初学者', duration: '4:20', format: 'mp3', size: '8.1 MB', path: '/音乐/薛之谦/初学者/演员.mp3' },
  { id: 5, title: '泡沫', artist: '邓紫棋', album: 'Xposed', duration: '4:18', format: 'flac', size: '26.7 MB', path: '/音乐/邓紫棋/Xposed/泡沫.flac' },
  { id: 6, title: '光年之外', artist: '邓紫棋', album: '光年之外', duration: '3:55', format: 'mp3', size: '7.8 MB', path: '/音乐/邓紫棋/光年之外/光年之外.mp3' },
  { id: 7, title: '十年', artist: '陈奕迅', album: '黑·白·灰', duration: '3:25', format: 'mp3', size: '6.9 MB', path: '/音乐/陈奕迅/黑白灰/十年.mp3' },
  { id: 8, title: '富士山下', artist: '陈奕迅', album: 'What\'s Going On...?', duration: '4:20', format: 'flac', size: '28.1 MB', path: '/音乐/陈奕迅/WhatsGoingOn/富士山下.flac' },
];

export default function SongList({ selectedPath, onSelectSong, selectedSong }) {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('');

  // 模拟加载歌曲列表
  useEffect(() => {
    if (selectedPath) {
      setIsLoading(true);
      // 模拟 API 调用延迟
      setTimeout(() => {
        setSongs(mockSongs);
        setIsLoading(false);
      }, 500);
    }
  }, [selectedPath]);

  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(filter.toLowerCase()) ||
    song.artist.toLowerCase().includes(filter.toLowerCase()) ||
    song.album.toLowerCase().includes(filter.toLowerCase())
  );

  if (!selectedPath) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-8">
        <Icons.Music />
        <p className="mt-2 text-sm">请先选择输入目录</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-8">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm">正在扫描音乐文件...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 搜索和统计 */}
      <div className="p-4 border-b border-neutral-100">
        <div className="relative">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="搜索歌曲、艺人或专辑..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary-300"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="mt-2 text-xs text-neutral-500">
          共找到 {filteredSongs.length} 首歌曲
        </div>
      </div>

      {/* 歌曲列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredSongs.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">
            未找到匹配的歌曲
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {filteredSongs.map((song) => (
              <button
                key={song.id}
                onClick={() => onSelectSong(song)}
                className={`w-full text-left p-3 hover:bg-neutral-50 transition-colors ${
                  selectedSong?.id === song.id ? 'bg-primary-50 border-l-2 border-primary-600' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedSong?.id === song.id ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-400'
                  }`}>
                    <Icons.Music />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-900 truncate">{song.title}</div>
                    <div className="text-sm text-neutral-500 truncate flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Icons.User />
                        {song.artist}
                      </span>
                      <span>·</span>
                      <span>{song.album}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-neutral-400">
                    <div className="flex items-center gap-1">
                      <Icons.Clock />
                      {song.duration}
                    </div>
                    <div className="mt-1 uppercase">{song.format}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}