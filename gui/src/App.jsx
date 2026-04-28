import React from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FilesPage from './pages/Files';
import useAppStore from './stores/appStore';

// 页面组件映射
const pages = {
  dashboard: Dashboard,
  home: Dashboard,
  files: FilesPage,
  scrape: () => <div style={{ padding: '24px' }}>新建刮削页面开发中...</div>,
  progress: () => <div style={{ padding: '24px' }}>任务详情页面开发中...</div>,
  tags: () => <div style={{ padding: '24px' }}>标签库页面开发中...</div>,
  settings: () => <div style={{ padding: '24px' }}>系统设置页面开发中...</div>,
};

export default function App() {
  const { currentPage } = useAppStore();
  const PageComponent = pages[currentPage] || pages.dashboard;

  return (
    <Layout>
      <PageComponent />
    </Layout>
  );
}
