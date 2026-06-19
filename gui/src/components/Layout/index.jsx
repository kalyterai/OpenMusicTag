import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F9FAFB' }}>
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区（纵向可滚动，内容超出视口时不再被裁切） */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
