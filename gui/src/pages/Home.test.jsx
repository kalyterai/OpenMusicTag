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
    window.localStorage.clear();
    useAppStore.setState({
      totalFiles: 0,
      processedFiles: 0,
      successCount: 0,
      failCount: 0,
      isLoadingFiles: false,
      fileDetailVisible: false,
      selectedFile: null,
      currentPath: '',
      commonDirectories: [],
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

  it('目录和音乐文件合并在同一个当前目录文件列表', () => {
    useAppStore.setState({
      fileDetailVisible: true,
      selectedFile: {
        name: '晴天.mp3',
        path: '/music/jay/qingtian.mp3',
        ext: '.mp3',
        artist: '周杰伦',
        title: '晴天',
        album: '叶惠美',
      },
    });
    const { container } = render(<Home />);
    const browserColumn = container.querySelector('.library-browser-column');

    expect(browserColumn).toBeInTheDocument();
    expect(screen.getByText('当前目录文件')).toBeInTheDocument();
    expect(screen.queryByText('目录结构')).not.toBeInTheDocument();
    expect(screen.queryByText('待处理文件')).not.toBeInTheDocument();
    expect(browserColumn?.querySelector('.library-unified-list')).toBeInTheDocument();
    expect(container.querySelector('.library-inspector')).toBeInTheDocument();
    expect(container.querySelector('.library-artwork')).toBeInTheDocument();
    expect(screen.getByText('标题：')).toBeInTheDocument();
    expect(screen.queryByText('文件：')).not.toBeInTheDocument();
    expect(screen.queryByText('文件信息')).not.toBeInTheDocument();
  });

  it('子文件夹文件数使用真实 fileCount（非随机数）', () => {
    render(<Home />);
    expect(screen.getByText(/12\s*个当前层音乐文件/)).toBeInTheDocument();
  });

  it('进入页面不会注入假统计数据', () => {
    render(<Home />);
    // 旧代码会在挂载时把 processedFiles 强制改成 142，修复后应保持为 store 的真实值 0
    expect(useAppStore.getState().processedFiles).toBe(0);
    expect(useAppStore.getState().totalFiles).toBe(0);
  });

  it('没有上次目录时不默认列出磁盘，而是提示用户选择根目录', () => {
    useAppStore.setState({
      currentPath: '',
      subFolders: [],
      currentFiles: [],
      commonDirectories: [],
    });
    render(<Home />);
    expect(screen.getByText('选择一个音乐根目录')).toBeInTheDocument();
    expect(useAppStore.getState().commonDirectories).toEqual([]);
  });
});
