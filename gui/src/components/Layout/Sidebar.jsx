import React from 'react';
import useAppStore from '../../stores/appStore';
import { APP_INFO } from '../../utils/constants';
import logo from '../../assets/logo.png';

const Icon = ({ children }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const Icons = {
  Dashboard: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5.5A1.5 1.5 0 015.5 4h4A1.5 1.5 0 0111 5.5v4A1.5 1.5 0 019.5 11h-4A1.5 1.5 0 014 9.5v-4zM13 5.5A1.5 1.5 0 0114.5 4h4A1.5 1.5 0 0120 5.5v2A1.5 1.5 0 0118.5 9h-4A1.5 1.5 0 0113 7.5v-2zM13 13.5a1.5 1.5 0 011.5-1.5h4a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5h-4a1.5 1.5 0 01-1.5-1.5v-5zM4 15.5A1.5 1.5 0 015.5 14h4a1.5 1.5 0 011.5 1.5v3A1.5 1.5 0 019.5 20h-4A1.5 1.5 0 014 18.5v-3z" />
    </Icon>
  ),
  Files: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.5 7.5A2.5 2.5 0 016 5h4l2 2h6A2.5 2.5 0 0120.5 9.5v7A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5v-9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13h10" />
    </Icon>
  ),
  Scrape: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12c2.2-4.2 5.5-4.2 7.8 0 2.2 4.2 5.5 4.2 7.2 0" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17c2.2-4.2 5.5-4.2 7.8 0 2.2 4.2 5.5 4.2 7.2 0M5 7c2.2-4.2 5.5-4.2 7.8 0 2.2 4.2 5.5 4.2 7.2 0" />
    </Icon>
  ),
  Progress: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V9m5 10V5m5 14v-7m5 7V8" />
    </Icon>
  ),
  Tags: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13.5l-6.6 6.6a2 2 0 01-2.8 0L4 13.5V5h8.5L20 12.5v1z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h.01" />
    </Icon>
  ),
  Settings: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.4 15a1.8 1.8 0 00.36 1.98l.04.04a2.1 2.1 0 01-2.97 2.97l-.04-.04a1.8 1.8 0 00-1.98-.36 1.8 1.8 0 00-1.1 1.66V21a2.1 2.1 0 01-4.2 0v-.06a1.8 1.8 0 00-1.1-1.66 1.8 1.8 0 00-1.98.36l-.04.04a2.1 2.1 0 01-2.97-2.97l.04-.04A1.8 1.8 0 003.8 15a1.8 1.8 0 00-1.66-1.1H2.1a2.1 2.1 0 010-4.2h.06a1.8 1.8 0 001.66-1.1 1.8 1.8 0 00-.36-1.98l-.04-.04a2.1 2.1 0 012.97-2.97l.04.04a1.8 1.8 0 001.98.36 1.8 1.8 0 001.1-1.66V2.1a2.1 2.1 0 014.2 0v.06a1.8 1.8 0 001.1 1.66 1.8 1.8 0 001.98-.36l.04-.04a2.1 2.1 0 012.97 2.97l-.04.04a1.8 1.8 0 00-.36 1.98 1.8 1.8 0 001.66 1.1h.06a2.1 2.1 0 010 4.2h-.06a1.8 1.8 0 00-1.66 1.1z" />
    </Icon>
  ),
  Collapse: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 6l-6 6 6 6" />
    </Icon>
  ),
};

const menuItems = [
  { id: 'dashboard', label: '控制面板', description: '总览', icon: Icons.Dashboard },
  { id: 'files', label: '资源库详情', description: '文件与标签', icon: Icons.Files },
  { id: 'scrape', label: '新建刮削', description: '任务编排', icon: Icons.Scrape },
  { id: 'progress', label: '任务详情', description: '进度与日志', icon: Icons.Progress },
  { id: 'tags', label: '标签库', description: '映射规则', icon: Icons.Tags },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, setSidebarCollapsed } = useAppStore();

  return (
    <aside
      className="shrink-0"
      style={{
        width: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(22, 20, 19, 0.95)',
        color: '#fffdf7',
        borderRight: '1px solid rgba(255, 253, 247, 0.10)',
        transition: 'width 180ms ease',
      }}
    >
      <div
        style={{
          minHeight: 78,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          gap: 12,
          padding: sidebarCollapsed ? 0 : '0 16px',
          borderBottom: '1px solid rgba(255, 253, 247, 0.10)',
        }}
      >
        <img
          src={logo}
          alt={APP_INFO.name}
          width={34}
          height={34}
          style={{ borderRadius: 8, objectFit: 'contain', background: '#fffdf7' }}
        />
        {!sidebarCollapsed && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 850, lineHeight: 1 }}>{APP_INFO.name}</div>
            <div style={{ marginTop: 5, color: 'rgba(255, 253, 247, 0.58)', fontSize: 12 }}>
              通用音乐刮削台
            </div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {menuItems.map((item) => {
          const ItemIcon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentPage(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                gap: 11,
                minHeight: 46,
                padding: sidebarCollapsed ? 0 : '8px 10px',
                border: '1px solid',
                borderColor: isActive ? 'rgba(217, 177, 96, 0.42)' : 'transparent',
                borderRadius: 8,
                background: isActive ? 'rgba(255, 253, 247, 0.10)' : 'transparent',
                color: isActive ? '#fffdf7' : 'rgba(255, 253, 247, 0.66)',
                cursor: 'pointer',
                transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
              }}
            >
              <span style={{ color: isActive ? '#d9b160' : 'currentColor' }}>
                <ItemIcon />
              </span>
              {!sidebarCollapsed && (
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 780 }}>{item.label}</span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'rgba(255, 253, 247, 0.42)' }}>
                    {item.description}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: 10, borderTop: '1px solid rgba(255, 253, 247, 0.10)' }}>
        <button
          type="button"
          onClick={() => setCurrentPage('settings')}
          title={sidebarCollapsed ? '系统设置' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: 11,
            minHeight: 44,
            padding: sidebarCollapsed ? 0 : '8px 10px',
            border: '1px solid',
            borderColor: currentPage === 'settings' ? 'rgba(217, 177, 96, 0.42)' : 'transparent',
            borderRadius: 8,
            background: currentPage === 'settings' ? 'rgba(255, 253, 247, 0.10)' : 'transparent',
            color: currentPage === 'settings' ? '#fffdf7' : 'rgba(255, 253, 247, 0.66)',
            cursor: 'pointer',
            marginBottom: 8,
          }}
        >
          <span style={{ color: currentPage === 'settings' ? '#d9b160' : 'currentColor' }}>
            <Icons.Settings />
          </span>
          {!sidebarCollapsed && <span style={{ fontSize: 14, fontWeight: 780 }}>系统设置</span>}
        </button>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? '展开侧边栏' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 40,
            border: '1px solid rgba(255, 253, 247, 0.12)',
            borderRadius: 8,
            background: 'rgba(255, 253, 247, 0.06)',
            color: 'rgba(255, 253, 247, 0.62)',
            cursor: 'pointer',
          }}
        >
          <span style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease' }}>
            <Icons.Collapse />
          </span>
          {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 750 }}>收起</span>}
        </button>
      </div>
    </aside>
  );
}
