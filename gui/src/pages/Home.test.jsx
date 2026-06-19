import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './Home';
import useAppStore from '../stores/appStore';

// Home（资源库详情页）真实数据接线测试：
// 1) 列表来自 store（真实 scan_directory 的结果），而非组件内 mock；
// 2) 子文件夹文件数使用真实 folder.fileCount，而非随机数；
// 3) 进入页面不再注入假统计（已移除硬编码 156/142/138/4 的 useEffect）。
describe('Home 资源库详情 - 真实数据', () => {
  beforeEach(() => {
    useAppStore.setState({
      totalFiles: 0,
      processedFiles: 0,
      successCount: 0,
      failCount: 0,
      isLoadingFiles: false,
      fileDetailVisible: false,
      selectedFile: null,
      subFolders: [
        { name: '周杰伦', path: '/music/jay', fileCount: 12 },
      ],
      currentFiles: [
        { name: '晴天.mp3', path: '/music/jay/qingtian.mp3', ext: '.mp3', artist: '周杰伦', title: '晴天' },
      ],
    });
  });

  it('从 store 渲染子文件夹与音乐文件', () => {
    render(<Home />);
    expect(screen.getByText('周杰伦')).toBeInTheDocument();
    expect(screen.getByText('晴天.mp3')).toBeInTheDocument();
  });

  it('子文件夹文件数使用真实 fileCount（非随机数）', () => {
    render(<Home />);
    expect(screen.getByText(/12\s*个文件/)).toBeInTheDocument();
  });

  it('进入页面不会注入假统计数据', () => {
    render(<Home />);
    // 旧代码会在挂载时把 processedFiles 强制改成 142，修复后应保持为 store 的真实值 0
    expect(useAppStore.getState().processedFiles).toBe(0);
    expect(useAppStore.getState().totalFiles).toBe(0);
  });
});
