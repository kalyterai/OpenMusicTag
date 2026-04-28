import React from 'react';
import logo from '../assets/logo.png';

export default function About() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 关于 */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-dark-bg flex items-center justify-center overflow-hidden">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">OpenMusicTag</h1>
            <p className="text-text-secondary">极空间 NAS 音乐整理工具</p>
          </div>
        </div>

        <div className="space-y-3 text-text-secondary">
          <p>版本: 1.0.0</p>
          <p>开源协议: MIT License</p>
          <p>GitHub: github.com/JulianXG/OpenMusicTag</p>
          <p>作者: Kalyter</p>
        </div>
      </div>

      {/* 功能特性 */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">功能特性</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: '📁', title: '多格式支持', desc: 'MP3/FLAC/M4A/APE/OGG/WAV' },
            { icon: '🔄', title: '繁简转换', desc: '自动转换繁体歌词为简体' },
            { icon: '🎨', title: '封面下载', desc: '自动从 MusicBrainz 下载专辑封面' },
            { icon: '🏷️', title: '元数据刮削', desc: '自动获取歌曲信息' },
            { icon: '📋', title: '艺人标准化', desc: '智能处理艺人名称格式' },
            { icon: '🔍', title: '重复检测', desc: '自动检测并跳过重复文件' },
            { icon: '📁', title: '智能整理', desc: '自动按歌手/专辑结构整理' },
            { icon: '⚡', title: '多线程处理', desc: '支持多线程并行处理' },
          ].map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-dark-bg rounded-lg"
            >
              <span className="text-2xl">{feature.icon}</span>
              <div>
                <p className="text-white font-medium">{feature.title}</p>
                <p className="text-sm text-text-muted">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 技术栈 */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">技术栈</h2>

        <div className="space-y-4 text-text-secondary">
          <div className="flex items-center gap-3">
            <span className="text-primary font-medium w-20">Python</span>
            <span>PyQt6 + WebEngine</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-primary font-medium w-20">Frontend</span>
            <span>React 18 + Tailwind CSS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-primary font-medium w-20">构建</span>
            <span>Vite + PyInstaller</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-primary font-medium w-20">数据源</span>
            <span>MusicBrainz API</span>
          </div>
        </div>
      </div>

      {/* 致谢 */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">致谢</h2>

        <p className="text-text-secondary">
          本项目使用了以下开源库：
        </p>
        <ul className="mt-3 space-y-2 text-text-secondary">
          <li>• <span className="text-primary">mutagen</span> - 音乐元数据处理</li>
          <li>• <span className="text-primary">musicbrainzngs</span> - MusicBrainz API 客户端</li>
          <li>• <span className="text-primary">OpenCC</span> - 繁简转换</li>
          <li>• <span className="text-primary">Pillow</span> - 图像处理</li>
          <li>• <span className="text-primary">requests</span> - HTTP 请求</li>
        </ul>
      </div>
    </div>
  );
}
