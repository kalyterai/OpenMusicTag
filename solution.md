# OpenMusicTag 跨平台桌面应用技术方案

> 版本：2.0（React 版）  
> 日期：2026年2月5日  
> 状态：待确认

---

## 一、项目概述

### 1.1 背景

OpenMusicTag 是一个通用音乐刮削软件，采用 Pipeline 架构实现模块化的音乐文件处理流水线。主要功能包括：

- 文件加载（支持 MP3/FLAC/M4A/APE/OGG/WAV）
- 繁简转换（台湾/香港繁体歌词转换为大陆简体）
- 去乱码广告（清理音乐标签中的广告、乱码和无效字符）
- 艺人标准化（智能处理艺人名称格式）
- 重复检测（检测并跳过重复文件）
- 文件名解析（从文件名中提取歌手和歌曲信息）
- 元数据刮削（从 MusicBrainz 免费音乐数据库自动获取歌曲信息）
- 封面下载（自动下载并嵌入专辑封面）
- 智能整理（自动按「歌手/专辑」结构整理文件）

### 1.2 目标

打造一个**跨平台桌面应用**，具备：

- **现代科技感 UI**（类智谱 AI 输入法风格）
- **流畅用户体验**（响应式交互、实时进度）
- **跨平台支持**（macOS / Windows / Linux）
- **一键打包分发**（无需用户安装 Python 环境）

---

## 二、技术选型分析

### 2.1 方案对比

| 方案 | 包体积 | 内存占用 | 开发效率 | Python 集成 | 推荐度 |
|------|--------|----------|----------|-------------|--------|
| **PyQt6 + WebEngine** | ~120MB | ~150MB | ⭐⭐⭐⭐⭐ | ✅ 原生 | ⭐⭐⭐⭐⭐ |
| Electron | ~180MB | ~320MB | ⭐⭐⭐⭐⭐ | ❌ 需 IPC | ⭐⭐⭐ |
| Tauri + Python | ~20MB | ~85MB | ⭐⭐⭐ | ❌ 需 IPC | ⭐⭐⭐⭐ |
| PySide6 + WebEngine | ~120MB | ~150MB | ⭐⭐⭐⭐⭐ | ✅ 原生 | ⭐⭐⭐⭐⭐ |

### 2.2 最终推荐：PyQt6 + WebEngine + React 18

**推荐理由：**

1. ✅ **与现有 Python 代码无缝集成**（100% 复用）
2. ✅ **WebEngine 提供现代 UI 能力**（React 18 组件化）
3. ✅ **React Hooks 简化状态管理**
4. ✅ **跨平台一致性好**
5. ✅ **包体积适中**（~120MB，可接受）
6. ✅ **技术成熟、生态丰富**
7. ✅ **MusicBrainz Picard 验证可行**

---

## 三、架构设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OpenMusicTag Desktop                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                      Web UI Layer                                │ │
│  │         (React 18 + Hooks + Zustand)                            │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │ │
│  │  │ Dashboard│ │ Settings│ │ Files   │ │  Logs   │ │  About  │   │ │
│  │  │  首页    │ │ 设置    │ │ 文件    │ │ 日志    │ │ 关于    │   │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│              ┌───────────────┼───────────────┐                           │
│              ▼               ▼               ▼                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    Qt WebChannel Bridge                          │ │
│  │              Python ↔ JavaScript 双向通信                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                   Application Layer                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │ │
│  │  │ ConfigManager│  │  TaskQueue  │  │ EventBus    │              │ │
│  │  │   配置管理   │  │   任务队列   │  │   事件总线   │              │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                   Core Pipeline Layer                             │ │
│  │              (复用现有 Python 代码)                                │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │ │
│  │  │ Load   │ │ Clean  │ │ Scrape │ │ Merge  │ │ Write  │         │ │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘         │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.1 前后端通信

```python
# Python 端 (gui/bridge.py)
from PyQt6.QtCore import QObject, pyqtSignal, pyqtSlot
from PyQt6.QtWebChannel import QWebChannel

class Bridge(QObject):
    """Qt ↔ JavaScript 通信桥梁"""
    
    # 信号定义
    started = pyqtSignal(dict)      # 任务开始
    progress = pyqtSignal(dict)     # 进度更新
    finished = pyqtSignal(dict)     # 任务完成
    error = pyqtSignal(dict)       # 错误通知
    log = pyqtSignal(dict)         # 日志输出
    
    @pyqtSlot(str)
    def start_scan(self, input_path: str):
        """开始扫描目录"""
        # 调用 Pipeline 执行扫描
        pass
    
    @pyqtSlot(str)
    def start_process(self, input_path: str, output_path: str):
        """开始处理"""
        pass
    
    @pyqtSlot(dict)
    def update_config(self, config: dict):
        """更新配置"""
        pass
    
    @pyqtSlot()
    def cancel_task(self):
        """取消任务"""
        pass
```

```javascript
// JavaScript 端 (gui/src/bridge.js)
import { useCallback, useEffect, useRef, useState } from 'react';

// Qt Bridge Hook
export function useQtBridge() {
    const [bridge, setBridge] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (window.qt && window.qt.webChannelTransport) {
            const channel = new QWebChannel(window.qt.webChannelTransport);
            setBridge(channel.objects.bridge);
            setIsReady(true);
        }
    }, []);

    // 调用 Python 方法
    const callQt = useCallback((method, params = {}) => {
        if (bridge && bridge[method]) {
            return new Promise((resolve, reject) => {
                // 处理异步回调
                const callbackId = `callback_${Date.now()}_${Math.random()}`;
                const timeout = setTimeout(() => {
                    reject(new Error('Qt bridge timeout'));
                }, 30000);

                bridge[method](params, (result) => {
                    clearTimeout(timeout);
                    resolve(result);
                });
            });
        }
    }, [bridge]);

    return { bridge, isReady, callQt };
}

// Qt Bridge Provider
export const QtBridgeContext = createContext(null);

export function QtBridgeProvider({ children }) {
    const { bridge, isReady, callQt } = useQtBridge();

    return (
        <QtBridgeContext.Provider value={{ bridge, isReady, callQt }}>
            {children}
        </QtBridgeContext.Provider>
    );
}

// 使用示例
function useScanTask() {
    const { callQt } = useQtBridge();

    const startScan = useCallback(async (inputPath) => {
        return await callQt('start_scan', { input_path: inputPath });
    }, [callQt]);

    const startProcess = useCallback(async (inputPath, outputPath) => {
        return await callQt('start_process', { 
            input_path: inputPath, 
            output_path: outputPath 
        });
    }, [callQt]);

    return { startScan, startProcess };
}
```

### 3.2 状态管理（Zustand）

```javascript
// gui/src/stores/appStore.js
import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // UI 状态
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  theme: 'dark',
  
  // 任务状态
  taskStatus: 'idle', // idle | scanning | processing | completed | error
  progress: 0,
  progressText: '',
  
  // 文件统计
  totalFiles: 0,
  processedFiles: 0,
  successCount: 0,
  failCount: 0,
  
  // 配置
  config: {
    inputPath: '',
    outputPath: '',
    threads: 4,
    formats: ['.mp3', '.flac', '.m4a', '.ape', '.ogg', '.wav'],
    enableCoverDownload: true,
    enable繁简转换: true,
  },
  
  // 日志
  logs: [],
  
  // Actions
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  setTaskStatus: (status) => set({ taskStatus: status }),
  setProgress: (progress, text) => set({ progress, progressText: text }),
  
  updateStats: (stats) => set((state) => ({
    totalFiles: stats.totalFiles ?? state.totalFiles,
    processedFiles: stats.processedFiles ?? state.processedFiles,
    successCount: stats.successCount ?? state.successCount,
    failCount: stats.failCount ?? state.failCount,
  })),
  
  addLog: (log) => set((state) => ({
    logs: [...state.logs.slice(-1000), log] // 保留最近1000条
  })),
  
  updateConfig: (config) => set((state) => ({
    config: { ...state.config, ...config }
  })),
  
  resetTask: () => set({
    taskStatus: 'idle',
    progress: 0,
    progressText: '',
    totalFiles: 0,
    processedFiles: 0,
    successCount: 0,
    failCount: 0,
    logs: [],
  }),
}));

export default useAppStore;
```

---

## 四、UI/UX 设计方案

### 4.1 设计风格

**科技感 + 简洁 + 现代**

```
┌──────────────────────────────────────────────────────────────────┐
│  🎵 OpenMusicTag                      ─ □ ×                     │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌─────────────────────────────────────────────────┐ │
│  │          │ │                                                 │ │
│  │  侧边栏  │ │              主内容区                          │ │
│  │          │ │  ┌───────────────────────────────────────────┐  │ │
│  │ 🏠 首页  │ │  │  📊 统计卡片                               │  │ │
│  │ 📁 文件  │ │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │  │ │
│  │ ⚙️ 设置  │ │  │  │1,234│ │98.5%│ │ 156 │ │ 45s │         │  │ │
│  │ 📋 日志  │ │  │  │📁   │ │✅   │ │🖼️   │ │⏱️   │         │  │ │
│  │ ℹ️ 关于  │ │  │  └─────┘ └─────┘ └─────┘ └─────┘         │  │ │
│  │          │ │  │                                           │  │ │
│  │          │ │  │  ┌─────────────────────────────────────┐  │  │ │
│  │          │ │  │  │  🔄 进度条                          │  │  │ │
│  │          │ │  │  │  ████████████░░░░░░  75%            │  │  │ │
│  │          │ │  │  └─────────────────────────────────────┘  │  │ │
│  │          │ │  │                                           │  │ │
│  │          │ │  │  ┌─────────────────────────────────────┐  │  │ │
│  │          │ │  │  │  📋 处理日志                         │  │  │ │
│  │          │ │  │  │  > ✅ 扫描完成: 1,234 个文件         │  │  │ │
│  │          │ │  │  │  > 🎵 识别: 周杰伦 - 晴天           │  │  │ │
│  │          │ │  │  └─────────────────────────────────────┘  │  │ │
│  │          │ │  │                                           │  │ │
│  └──────────┘ └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 色彩方案

```css
:root {
  /* 品牌色 */
  --primary: #6366F1;           /* 科技紫 */
  --primary-dark: #4F46E5;
  --primary-light: #818CF8;
  
  /* 语义色 */
  --success: #10B981;            /* 成功绿 */
  --warning: #F59E0B;           /* 警告黄 */
  --error: #EF4444;             /* 错误红 */
  --info: #3B82F6;              /* 信息蓝 */
  
  /* 背景色 */
  --bg-dark: #0F172A;           /* 深空蓝黑 */
  --bg-card: #1E293B;           /* 卡片背景 */
  --bg-hover: #334155;
  
  /* 文字色 */
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  
  /* 效果 */
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --radius: 12px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 4.3 核心页面

#### 4.3.1 首页 (Dashboard)
- 统计卡片：总文件数、处理成功率、平均耗时
- 快速开始：输入/输出目录选择
- 最近任务：处理历史

#### 4.3.2 文件页 (Files)
- 拖拽选择目录
- 文件列表预览（支持排序、筛选）
- 批量选择操作

#### 4.3.3 设置页 (Settings)
- 线程数调节（滑块 1-16）
- 文件格式过滤
- MusicBrainz API 配置
- 封面下载开关
- 繁简转换开关

#### 4.3.4 日志页 (Logs)
- 实时处理日志滚动
- 错误日志高亮
- 日志导出功能

---

## 五、性能优化策略

### 5.1 多线程架构

```
                    ┌─────────────┐
                    │  Main Thread│  (UI 响应)
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ Worker 1│       │ Worker 2│       │ Worker N│
   │ (线程)   │       │ (线程)   │       │ (线程)  │
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Queue      │
                    │  任务队列    │
                    └─────────────┘
```

- **主线程**：UI 渲染与响应
- **工作线程**：音乐处理 Pipeline
- **通信线程**：MusicBrainz API 请求

### 5.2 React 性能优化

```jsx
// 1. 使用 useMemo 缓存计算结果
const processedFiles = useMemo(() => {
  return files.filter(f => f.status === 'done');
}, [files]);

// 2. 使用 useCallback 缓存回调
const handleFileClick = useCallback((file) => {
  setSelectedFile(file);
}, []);

// 3. 使用 React.memo 缓存组件
const FileItem = React.memo(({ file, onClick }) => (
  <div onClick={onClick}>{file.name}</div>
));

// 4. 使用虚拟滚动（react-window）
import { FixedSizeList } from 'react-window';

<FileList
  height={400}
  itemCount={files.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <FileItem file={files[index]} />
    </div>
  )}
</FileList>
```

### 5.3 懒加载与分页

- 文件列表虚拟滚动（支持 10000+ 文件不卡顿）
- 缩略图按需加载
- 日志分页加载
- 路由代码分割

```jsx
// 代码分割
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

---

## 六、项目结构

```
OpenMusicTag/
├── gui/
│   ├── main.py                    # PyQt6 应用入口
│   ├── bridge.py                  # Qt WebChannel 桥接
│   ├── index.html                 # React 应用挂载点
│   ├── vite.config.js             # Vite 构建配置
│   ├── package.json               # Node 依赖配置
│   ├── public/
│   │   └── icon.icns             # 应用图标
│   ├── src/
│   │   ├── main.jsx              # React 应用入口
│   │   ├── App.jsx               # 根组件
│   │   ├── index.css             # 全局样式 + 设计变量
│   │   ├── bridge.js             # Qt Bridge Hooks
│   │   ├── stores/               # Zustand 状态管理
│   │   │   └── appStore.js
│   │   ├── hooks/                 # 自定义 Hooks
│   │   │   ├── useQtBridge.js
│   │   │   ├── useTask.js
│   │   │   └── useConfig.js
│   │   ├── components/           # React 组件
│   │   │   ├── Layout/
│   │   │   │   ├── index.jsx     # 主布局
│   │   │   │   ├── Sidebar.jsx   # 侧边栏
│   │   │   │   └── Header.jsx    # 顶部栏
│   │   │   ├── Dashboard/
│   │   │   │   ├── index.jsx     # 首页
│   │   │   │   ├── StatCard.jsx  # 统计卡片
│   │   │   │   ├── ProgressBar.jsx # 进度条
│   │   │   │   └── RecentLogs.jsx # 最近日志
│   │   │   ├── Files/
│   │   │   │   ├── index.jsx     # 文件页
│   │   │   │   ├── FileSelector.jsx # 目录选择
│   │   │   │   └── FileList.jsx  # 文件列表
│   │   │   ├── Settings/
│   │   │   │   ├── index.jsx     # 设置页
│   │   │   │   ├── General.jsx   # 通用设置
│   │   │   │   └── Advanced.jsx  # 高级设置
│   │   │   ├── Logs/
│   │   │   │   ├── index.jsx     # 日志页
│   │   │   │   └── LogViewer.jsx # 日志查看
│   │   │   └── Common/
│   │   │       ├── Button.jsx    # 按钮组件
│   │   │       ├── Input.jsx    # 输入框
│   │   │       ├── Modal.jsx     # 模态框
│   │   │       └── Toast.jsx     # 提示
│   │   ├── pages/                # 页面组件
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Files.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Logs.jsx
│   │   │   └── About.jsx
│   │   └── utils/                # 工具函数
│   │       ├── format.js          # 格式化工具
│   │       └── constants.js       # 常量定义
│   └── icons/                    # SVG 图标
├── src/                          # 核心代码（现有）
│   ├── pipelines/
│   │   ├── load_stage.py
│   │   ├── clean_tags_stage.py
│   │   ├── scrape_metadata_stage.py
│   │   ├── merge_metadata_stage.py
│   │   ├── download_cover_stage.py
│   │   └── write_tags_stage.py
│   ├── config.py
│   ├── context.py
│   ├── models.py
│   └── pipeline.py
├── build.py                      # 打包脚本
├── requirements-gui.txt         # GUI 依赖
├── requirements.txt             # 基础依赖
└── README.md
```

---

## 七、依赖清单

### 7.1 GUI 依赖

```json
// gui/package.json
{
  "name": "open-music-tag-gui",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0"
  }
}
```

```txt
# requirements-gui.txt
PyQt6>=6.6.0
PyQt6-WebEngine>=6.6.0
```

### 7.2 核心依赖（现有）

```txt
# requirements.txt
opencc>=1.1.7
mutagen>=1.47.0
musicbrainzngs>=0.7
requests>=2.31.0
Pillow>=10.0.0
```

---

## 八、跨平台打包方案

### 8.1 构建 React 应用

```bash
# 安装依赖
cd gui
npm install

# 开发模式
npm run dev

# 生产构建
npm run build
```

### 8.2 PyInstaller 打包

```python
# build.py
import subprocess
import os

def build_app():
    # 确保已构建 React 应用
    os.chdir('gui')
    subprocess.run(['npm', 'run', 'build'], check=True)
    os.chdir('..')
    
    cmd = [
        "pyinstaller",
        "--windowed",                    # 无控制台窗口
        "--onefile",                     # 打包成单个文件
        "--name", "OpenMusicTag",
        "--icon", "gui/public/icon.icns",
        "--add-data", "gui/dist:gui/dist",
        "--add-data", "gui/public:gui/public",
        "--hidden-import", "PyQt6.QtWebEngineWidgets",
        "--hidden-import", "mutagen",
        "--hidden-import","musicbrainzngs",
        "--hidden-import", "requests",
        "--hidden-import", "PIL",
        "--clean",
        "--noupx",
        "gui/main.py"
    ]
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    build_app()
```

### 8.3 各平台输出

| 平台 | 输出格式 | 用户体验 |
|------|----------|----------|
| **macOS** | `.dmg` 安装包 | 双击 → 拖拽到应用目录 |
| **Windows** | `.exe` 安装包 | 双击 → 下一步安装 |
| **Linux** | `.deb` / `.AppImage` | 双击运行 |

### 8.4 包体积

| 优化前 | 优化后 |
|--------|--------|
| ~200MB | ~120MB |

**优化手段：**
- `--exclude-module` 排除未用模块
- React 代码分割优化
- UPX 压缩
- 移除调试符号

---

## 九、开发路线图

### Phase 1：基础框架（1-2 天）
- [ ] PyQt6 + WebEngine 环境搭建
- [ ] React + Vite 项目初始化
- [ ] 前后端通信桥梁实现
- [ ] 基础 UI 框架（侧边栏 + 主内容区）

### Phase 2：UI 实现（2-3 天）
- [ ] 首页 Dashboard 页面（统计卡片）
- [ ] 设置页面（所有配置项）
- [ ] 目录选择器组件
- [ ] 进度展示组件
- [ ] 日志组件

### Phase 3：功能集成（2-3 天）
- [ ] Pipeline 调用集成
- [ ] 进度实时更新
- [ ] 错误处理与提示
- [ ] 任务队列管理

### Phase 4：优化与打包（1-2 天）
- [ ] 性能优化（虚拟滚动、代码分割）
- [ ] macOS 打包与签名
- [ ] Windows 打包
- [ ] Linux 打包测试

**预估总工时：6-10 天**

---

## 十、竞品技术栈参考

| 应用 | 类型 | 技术栈 | 备注 |
|------|------|--------|------|
| **MusicBrainz Picard** | 音乐标签编辑 | Python 3.10 + PyQt 6.5 | ⭐ 你的直接竞品 |
| **Calibre** | 电子书管理 | Python + Qt5 | ⭐ 成功案例，下载量百万级 |
| **Clementine** | 音乐播放器 | C++ / Qt | 知名开源播放器 |
| **MuseScore** | 乐谱编辑 | C++ / Qt | 全球数百万用户 |
| **Shotcut** | 视频编辑 | C++ / Qt | 开源视频编辑标杆 |

---

## 十一、FAQ

### Q1：为什么不用 Electron？

**答：**
- Electron 无法直接调用 Python 代码，需要 IPC 通信
- 需要 spawn Python 子进程，复杂且有序列化开销
- 对于本地 Python 处理，PyQt6 + WebEngine 更简单高效

### Q2：APE 格式支持问题？

**答：**
- Python mutagen 原生支持 APE
- Node.js 生态几乎没有 APE 支持库
- 这是选择 Python 的重要原因之一

### Q3：MusicBrainz API SDK？

**答：**
- Python 有官方 SDK `musicbrainzngs`
- Node.js 没有官方 SDK，需要自己封装 REST API
- 这是选择 Python 的另一个重要原因

### Q4：包体积太大怎么办？

**答：**
- PyInstaller 打包后约 120MB
- Calibre 200MB+ 依然几百万用户
- 可通过 UPX 压缩、排除无用模块优化到 ~100MB
- 对于现代网络，完全可接受

### Q5：用户需要安装 Python 吗？

**答：**
- **不需要**
- PyInstaller 将 Python 解释器和所有依赖打包进去
- 用户只需下载安装包，双击即可使用

### Q6：为什么选择 React 而不是 Vue？

**答：**
- React 生态更丰富，有更多组件库选择
- React Hooks 提供了更灵活的状态管理方式
- Zustand 与 React 配合良好，状态管理简洁
- React 18 并发特性有助于复杂 UI 性能优化
- 两者都是优秀选择，团队熟悉度是重要因素

---

## 十二、总结

### 推荐技术栈

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenMusicTag 技术栈                        │
├─────────────────────────────────────────────────────────────┤
│  核心语言：Python 3.9+                                        │
│  GUI 框架：PyQt6 + WebEngine                                 │
│  UI 框架：React 18 + Hooks + Zustand                        │
│  构建工具：Vite                                              │
│  通信协议：Qt WebChannel                                     │
│  打包工具：PyInstaller                                       │
└─────────────────────────────────────────────────────────────┘
```

### 核心优势

1. **100% 复用现有 Python Pipeline 代码**
2. **现代科技感 UI（React 18）**
3. **React Hooks + Zustand 简化状态管理**
4. **跨平台一致体验**
5. **无需用户安装 Python 环境**
6. **成熟稳定（MusicBrainz Picard 验证可行）**

---

## 状态

- [ ] 待确认技术方案
- [ ] 待确认 UI 风格
- [ ] 待确认开发计划

---

> 本文档由 OpenMusicTag 团队编写 | 2026-02-05
