import React from 'react';
import useAppStore from '../../stores/appStore';

// 闪电图标 - 紫色 #6366F1
const LightningIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// 导航图标
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Files: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Scrape: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Progress: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Tags: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Collapse: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
};

// 菜单配置
const menuItems = [
  { id: 'dashboard', label: '控制面板', icon: Icons.Dashboard },
  { id: 'files', label: '资源库详情', icon: Icons.Files },
  { id: 'scrape', label: '新建刮削', icon: Icons.Scrape },
  { id: 'progress', label: '任务详情', icon: Icons.Progress },
  { id: 'tags', label: '标签库', icon: Icons.Tags },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, setSidebarCollapsed } = useAppStore();

  return (
    <aside
      style={{
        width: sidebarCollapsed ? '64px' : '220px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#FFFFFF',
        borderRight: '1px solid #E5E5E5',
        transition: 'width 0.3s ease',
      }}
    >
      {/* Logo 区域 */}
      <div style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        padding: sidebarCollapsed ? '0' : '0 16px',
        gap: '10px',
      }}>
        <LightningIcon />
        {!sidebarCollapsed && (
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#333' }}>
            MusicFlow
          </span>
        )}
      </div>

      {/* 导航菜单 */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                gap: '10px',
                padding: sidebarCollapsed ? '12px' : '10px 12px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? '#F0F2FF' : 'transparent',
                color: isActive ? '#6366F1' : '#6B7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.2s ease',
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* 底部设置和收起按钮 */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid #E5E5E5' }}>
        {/* 系统设置 */}
        <button
          onClick={() => setCurrentPage('settings')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: '10px',
            padding: sidebarCollapsed ? '12px' : '10px 12px',
            borderRadius: '10px',
            border: 'none',
            background: currentPage === 'settings' ? '#F0F2FF' : 'transparent',
            color: currentPage === 'settings' ? '#6366F1' : '#6B7280',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: currentPage === 'settings' ? 500 : 400,
            marginBottom: sidebarCollapsed ? '0' : '8px',
            transition: 'all 0.2s ease',
          }}
          title={sidebarCollapsed ? '系统设置' : undefined}
        >
          <Icons.Settings />
          {!sidebarCollapsed && <span>系统设置</span>}
        </button>

        {/* 收起按钮 */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            border: 'none',
            background: '#F5F5F5',
            color: '#6B7280',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
        >
          <Icons.Collapse />
          {!sidebarCollapsed && <span>收起</span>}
        </button>
      </div>
    </aside>
  );
}