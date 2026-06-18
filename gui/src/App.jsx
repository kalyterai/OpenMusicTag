import React from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Workflow from './pages/Workflow';
import Progress from './pages/Progress';
import Dictionary from './pages/Dictionary';
import Settings from './pages/Settings';
import useAppStore from './stores/appStore';

// 页面组件映射
const pages = {
  dashboard: Dashboard,
  home: Dashboard,
  files: Home,
  scrape: Workflow,
  progress: Progress,
  tags: Dictionary,
  settings: Settings,
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
