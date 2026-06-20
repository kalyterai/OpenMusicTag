import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';
import useAppStore from '../../stores/appStore';
import { APP_INFO } from '../../utils/constants';

// Logo / 品牌对齐测试：侧边栏必须与全局品牌一致（OpenMusicTag + logo.png），
// 不得再出现历史遗留的 "MusicFlow" 占位品牌或临时闪电图标。
describe('Sidebar 品牌/Logo 对齐', () => {
  beforeEach(() => {
    useAppStore.setState({ currentPage: 'dashboard', sidebarCollapsed: false });
  });

  it('展示统一品牌名 OpenMusicTag（来自 constants.APP_INFO）', () => {
    render(<Sidebar />);
    expect(screen.getByText(APP_INFO.name)).toBeInTheDocument();
    expect(APP_INFO.name).toBe('OpenMusicTag');
  });

  it('不再出现遗留的 MusicFlow 品牌', () => {
    render(<Sidebar />);
    expect(screen.queryByText('MusicFlow')).not.toBeInTheDocument();
  });

  it('使用真实 logo 图片资源而非内联占位图标', () => {
    render(<Sidebar />);
    const img = screen.getByRole('img', { name: APP_INFO.name });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src') || '').toMatch(/logo/i);
  });

  it('渲染主导航项并能切换当前页', () => {
    render(<Sidebar />);
    expect(screen.getByText('控制面板')).toBeInTheDocument();
    expect(screen.getByText('资源库详情')).toBeInTheDocument();
    expect(screen.queryByText('任务编排')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('资源库详情'));
    expect(useAppStore.getState().currentPage).toBe('files');
  });

  it('把新建刮削作为固定主操作而非普通导航项', () => {
    useAppStore.setState({ currentPage: 'files', workflowStep: 3 });
    render(<Sidebar />);

    fireEvent.click(screen.getByText('+ 新建刮削'));

    expect(useAppStore.getState().currentPage).toBe('scrape');
    expect(useAppStore.getState().workflowStep).toBe(1);
  });
});
