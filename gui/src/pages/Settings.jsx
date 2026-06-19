import React, { useEffect, useState } from 'react';
import useAppStore from '../stores/appStore';
import { useQtBridge } from '../bridge';

const Icon = ({ children }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const Icons = {
  Folder: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.5 7.5A2.5 2.5 0 016 5h4l2 2h6a2.5 2.5 0 012.5 2.5v7A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5v-9z" />
    </Icon>
  ),
  Music: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2zm12-3c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2zM9 10l12-3" />
    </Icon>
  ),
  Text: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h12M8 4v2m2 10c-2.2-1.6-3.8-3.6-4.8-6M18 20l-3-7-3 7M13 17h4" />
    </Icon>
  ),
  Cover: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15l2.6-2.6a1.5 1.5 0 012.1 0L16 15M15 9h.01" />
    </Icon>
  ),
  Database: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
    </Icon>
  ),
  Check: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </Icon>
  ),
};

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        border: 'none',
        borderRadius: 999,
        padding: 3,
        background: checked ? 'var(--groove)' : 'var(--line)',
        cursor: 'pointer',
      }}
      aria-pressed={checked}
    >
      <span
        style={{
          display: 'block',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fffdf7',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 160ms ease',
        }}
      />
    </button>
  );
}

function SettingRow({ icon: IconComponent, title, description, children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '34px minmax(0, 1fr) auto',
        gap: 12,
        alignItems: 'center',
        padding: '15px 0',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <span className="chip chip-blue" style={{ width: 34, height: 34, padding: 0, justifyContent: 'center' }}>
        <IconComponent />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 850, color: 'var(--ink)' }}>{title}</div>
        <div style={{ marginTop: 3, color: 'var(--muted)', fontSize: 12 }}>{description}</div>
      </div>
      {children}
    </div>
  );
}

function SettingsGroup({ title, description, children }) {
  return (
    <section className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{title}</h2>
          <p className="panel-subtitle">{description}</p>
        </div>
      </div>
      <div style={{ padding: '0 18px' }}>
        {children}
      </div>
    </section>
  );
}

export default function Settings() {
  const { config, updateConfig } = useAppStore();
  const { updateConfig: updateQtConfig } = useQtBridge();
  const [settings, setSettings] = useState(config);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(config);
  }, [config]);

  const handleToggle = (key) => {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleThreads = (value) => {
    setSaved(false);
    setSettings((prev) => ({ ...prev, threads: parseInt(value, 10) }));
  };

  const handleSave = async () => {
    updateConfig(settings);
    await updateQtConfig(settings);
    setSaved(true);
  };

  return (
    <div className="page page-narrow animate-fadeIn">
      <header className="page-header">
        <div>
          <p className="page-kicker">Preferences</p>
          <h1 className="page-title">系统设置</h1>
          <p className="page-copy">
            设置默认处理规则和输出策略；新建刮削任务时会沿用这里的偏好。
          </p>
        </div>
        <div className="toolbar">
          {saved && <span className="chip chip-green"><Icons.Check /> 已保存</span>}
          <button type="button" onClick={handleSave} className="btn btn-primary">保存设置</button>
        </div>
      </header>

      <div className="settings-grid">
        <div style={{ display: 'grid', gap: 16 }}>
          <SettingsGroup title="处理偏好" description="决定默认启用哪些清洗和刮削动作">
            <SettingRow icon={Icons.Cover} title="自动下载封面" description="从可用来源获取专辑封面并写入文件">
              <Toggle checked={settings.enableCoverDownload} onChange={() => handleToggle('enableCoverDownload')} />
            </SettingRow>
            <SettingRow icon={Icons.Text} title="繁简转换" description="将台湾/香港繁体歌词转换为大陆简体">
              <Toggle checked={settings.enableSimplifiedChinese} onChange={() => handleToggle('enableSimplifiedChinese')} />
            </SettingRow>
            <SettingRow icon={Icons.Database} title="元数据刮削" description="从 MusicBrainz 补全歌曲、专辑和年份">
              <Toggle checked={settings.enableMetadataScrape} onChange={() => handleToggle('enableMetadataScrape')} />
            </SettingRow>
            <SettingRow icon={Icons.Music} title="文件名解析" description="从文件名提取艺人和歌曲标题">
              <Toggle checked={settings.enableFilenameParse} onChange={() => handleToggle('enableFilenameParse')} />
            </SettingRow>
          </SettingsGroup>

          <SettingsGroup title="输出策略" description="决定文件如何复制、保留和组织">
            <SettingRow icon={Icons.Database} title="重复检测" description="跳过已处理的相同文件">
              <Toggle checked={settings.enableDuplicateCheck} onChange={() => handleToggle('enableDuplicateCheck')} />
            </SettingRow>
            <SettingRow icon={Icons.Folder} title="自动整理" description="按「歌手/专辑」结构保存输出文件">
              <Toggle checked={settings.autoOrganize} onChange={() => handleToggle('autoOrganize')} />
            </SettingRow>
            <SettingRow icon={Icons.Folder} title="保留原文件" description="处理时复制文件，不直接覆盖来源目录">
              <Toggle checked={settings.preserveOriginal} onChange={() => handleToggle('preserveOriginal')} />
            </SettingRow>
          </SettingsGroup>
        </div>

        <aside className="panel" style={{ padding: 18 }}>
          <h2 className="panel-title" style={{ marginBottom: 14 }}>任务性能</h2>
          <div className="waveform" style={{ marginBottom: 18 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--muted)', fontWeight: 800 }}>默认线程数</span>
            <span className="chip chip-amber">{settings.threads}</span>
          </div>
          <input
            type="range"
            min="1"
            max="16"
            value={settings.threads}
            onChange={(e) => handleThreads(e.target.value)}
            style={{ width: '100%', accentColor: 'var(--groove)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 12, marginTop: 5 }}>
            <span>1</span>
            <span>8</span>
            <span>16</span>
          </div>

          <div style={{ marginTop: 22 }}>
            <h3 className="panel-title" style={{ marginBottom: 10 }}>支持格式</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['.mp3', '.flac', '.m4a', '.ape', '.ogg', '.wav'].map((format) => (
                <span key={format} className="chip">{format}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
