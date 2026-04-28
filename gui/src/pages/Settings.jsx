import React, { useState } from 'react';
import useAppStore from '../stores/appStore';

// SVG Icons
const Icons = {
  Folder: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Music: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  Language: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
  ),
  Image: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Cog: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

// 设置项组件
function SettingItem({ icon: Icon, title, description, children }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-neutral-100 last:border-0">
      <div className="p-2 bg-neutral-100 rounded-lg text-neutral-600">
        <Icon />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-neutral-900">{title}</h3>
        <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

// 开关组件
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary-600' : 'bg-neutral-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { config, updateConfig } = useAppStore();
  const [settings, setSettings] = useState({
    enableCoverDownload: true,
    enableSimplifiedChinese: true,
    enableDuplicateCheck: true,
    enableFilenameParse: true,
    enableMetadataScrape: true,
    autoOrganize: true,
    preserveOriginal: true,
    threads: 4,
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    updateConfig(settings);
    // TODO: 调用 bridge 保存配置
    alert('设置已保存');
  };

  return (
    <div className="p-8 animate-fadeIn">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">偏好设置</h1>
        <p className="text-neutral-500">自定义音乐整理工具的行为和外观</p>
      </div>

      {/* 设置分组 */}
      <div className="space-y-6">
        {/* 处理选项 */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Icons.Cog />
            处理选项
          </h2>
          
          <SettingItem
            icon={Icons.Image}
            title="自动下载封面"
            description="从 MusicBrainz 自动下载并嵌入专辑封面"
          >
            <Toggle 
              checked={settings.enableCoverDownload} 
              onChange={() => handleToggle('enableCoverDownload')} 
            />
          </SettingItem>

          <SettingItem
            icon={Icons.Language}
            title="繁简转换"
            description="将台湾/香港繁体歌词转换为大陆简体"
          >
            <Toggle 
              checked={settings.enableSimplifiedChinese} 
              onChange={() => handleToggle('enableSimplifiedChinese')} 
            />
          </SettingItem>

          <SettingItem
            icon={Icons.Cog}
            title="重复检测"
            description="检测并跳过重复文件，避免重复处理"
          >
            <Toggle 
              checked={settings.enableDuplicateCheck} 
              onChange={() => handleToggle('enableDuplicateCheck')} 
            />
          </SettingItem>

          <SettingItem
            icon={Icons.Music}
            title="文件名解析"
            description="从文件名中提取歌手和歌曲信息"
          >
            <Toggle 
              checked={settings.enableFilenameParse} 
              onChange={() => handleToggle('enableFilenameParse')} 
            />
          </SettingItem>
        </div>

        {/* 输出选项 */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Icons.Folder />
            输出选项
          </h2>

          <SettingItem
            icon={Icons.Folder}
            title="自动整理"
            description="按「歌手/专辑」结构自动整理文件"
          >
            <Toggle 
              checked={settings.autoOrganize} 
              onChange={() => handleToggle('autoOrganize')} 
            />
          </SettingItem>

          <SettingItem
            icon={Icons.Folder}
            title="保留原文件"
            description="处理时保留原始文件，不直接修改"
          >
            <Toggle 
              checked={settings.preserveOriginal} 
              onChange={() => handleToggle('preserveOriginal')} 
            />
          </SettingItem>

          <SettingItem
            icon={Icons.Cog}
            title="处理线程数"
            description="同时处理的文件数量，建议根据 CPU 核心数设置"
          >
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="16"
                value={settings.threads}
                onChange={(e) => setSettings(prev => ({ ...prev, threads: parseInt(e.target.value) }))}
                className="w-32 h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <span className="text-sm font-medium text-neutral-900 w-8">{settings.threads}</span>
            </div>
          </SettingItem>
        </div>

        {/* 支持格式 */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">支持格式</h2>
          <div className="flex flex-wrap gap-2">
            {['.mp3', '.flac', '.m4a', '.ape', '.ogg', '.wav'].map(format => (
              <span key={format} className="px-3 py-1.5 bg-neutral-100 text-neutral-700 text-sm rounded-lg">
                {format}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
        >
          保存设置
        </button>
      </div>
    </div>
  );
}