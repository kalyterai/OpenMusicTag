import React, { useState } from 'react';
import { APP_INFO } from '../utils/constants';

const Icon = ({ children }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const Icons = {
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
  Info: () => (
    <Icon>
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v5M12 8h.01" />
    </Icon>
  ),
  GitHub: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19c-4 1.2-4-2-5.5-2.5M14 22v-3.9c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.3 4.3 0 00-.1-3.2s-1-.3-3.3 1.2a11.3 11.3 0 00-6 0C6 3.4 5 3.7 5 3.7a4.3 4.3 0 00-.1 3.2A4.6 4.6 0 003.5 10c0 4.6 2.8 5.7 5.5 6-.5.5-.8 1.1-.8 2.2V22" />
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
            <p className="panel-subtitle">只保留跨任务生效的软件偏好</p>
          </div>
        </div>
        <div style={{ padding: '0 18px' }}>
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

      <section className="panel" style={{ overflow: 'hidden', marginTop: 16 }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">关于软件</h2>
            <p className="panel-subtitle">版本、版权和开源仓库</p>
          </div>
        </div>
        <div style={{ padding: '0 18px' }}>
          <SettingRow icon={Icons.Info} title="当前版本号" description={APP_INFO.description}>
            <span className="chip chip-blue">v{APP_INFO.version}</span>
          </SettingRow>
          <SettingRow icon={Icons.Info} title="版权信息" description={APP_INFO.copyright}>
            <span className="chip">{APP_INFO.license}</span>
          </SettingRow>
          <SettingRow icon={Icons.GitHub} title="GitHub" description="查看源码、提交 issue 或跟进发布记录">
            <a className="btn btn-secondary" href={APP_INFO.github} target="_blank" rel="noreferrer">
              打开仓库
            </a>
          </SettingRow>
        </div>
      </section>
    </div>
  );
}
