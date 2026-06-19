import React, { useState } from 'react';

const Icon = ({ children }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const Icons = {
  Globe: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18M4.5 7.5h15M4.5 16.5h15" />
    </Icon>
  ),
  Palette: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a9 9 0 00-9 9 7 7 0 007 7h1.2a1.8 1.8 0 001.2-3.15 1.4 1.4 0 01.9-2.45H15a6 6 0 000-12h-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 10h.01M9.5 6.8h.01M14 6.8h.01M16.5 10h.01" />
    </Icon>
  ),
  Layout: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16v14H4zM9 5v14M4 10h5" />
    </Icon>
  ),
  Startup: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
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
      aria-pressed={checked}
      style={{
        width: 44,
        height: 24,
        border: 'none',
        borderRadius: 999,
        padding: 3,
        background: checked ? 'var(--groove)' : 'var(--line)',
        cursor: 'pointer',
      }}
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
    <div style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) auto', gap: 12, alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
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

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    language: 'zh-CN',
    theme: 'groove',
    density: 'comfortable',
    openLastWorkspace: true,
    enableAnimations: true,
  });

  const updatePref = (key, value) => {
    setSaved(false);
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="page page-narrow animate-fadeIn">
      <header className="page-header">
        <div>
          <p className="page-kicker">Application settings</p>
          <h1 className="page-title">系统设置</h1>
          <p className="page-copy">
            这里只放整个软件级别的偏好。刮削线程、封面、查重、MusicBrainz 等运行配置请在「新建刮削」中为每个任务单独设置。
          </p>
        </div>
        <div className="toolbar">
          {saved && <span className="chip chip-green"><Icons.Check /> 已保存</span>}
          <button type="button" className="btn btn-primary" onClick={() => setSaved(true)}>保存设置</button>
        </div>
      </header>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">界面与启动</h2>
            <p className="panel-subtitle">语言、颜色、密度和启动行为</p>
          </div>
        </div>
        <div style={{ padding: '0 18px' }}>
          <SettingRow icon={Icons.Globe} title="界面语言" description="控制菜单、页面标题和提示文本语言">
            <select className="input" value={prefs.language} onChange={(e) => updatePref('language', e.target.value)} style={{ width: 150 }}>
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁体中文</option>
              <option value="en-US">English</option>
            </select>
          </SettingRow>
          <SettingRow icon={Icons.Palette} title="颜色主题" description="选择软件整体视觉主题">
            <select className="input" value={prefs.theme} onChange={(e) => updatePref('theme', e.target.value)} style={{ width: 150 }}>
              <option value="groove">声纹纸面</option>
              <option value="system">跟随系统</option>
              <option value="contrast">高对比</option>
            </select>
          </SettingRow>
          <SettingRow icon={Icons.Layout} title="界面密度" description="控制列表行高和面板间距">
            <select className="input" value={prefs.density} onChange={(e) => updatePref('density', e.target.value)} style={{ width: 150 }}>
              <option value="comfortable">舒展</option>
              <option value="compact">紧凑</option>
            </select>
          </SettingRow>
          <SettingRow icon={Icons.Startup} title="启动时打开上次位置" description="再次启动软件时恢复最后浏览的目录">
            <Toggle checked={prefs.openLastWorkspace} onChange={(value) => updatePref('openLastWorkspace', value)} />
          </SettingRow>
          <SettingRow icon={Icons.Layout} title="启用界面动画" description="保留轻量过渡；关闭后减少动态效果">
            <Toggle checked={prefs.enableAnimations} onChange={(value) => updatePref('enableAnimations', value)} />
          </SettingRow>
        </div>
      </section>
    </div>
  );
}
