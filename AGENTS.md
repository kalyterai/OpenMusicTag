# AGENTS.md - 通用音乐刮削软件

## 项目概述

本项目是一个 **通用音乐刮削软件**，采用 **Pipeline 架构**实现模块化的音乐文件处理流水线。主要功能包括：

- **文件加载**：支持多种音频格式的加载和解析
- **繁简转换**：将台湾/香港繁体歌词转换为大陆简体
- **去乱码广告**：清理音乐标签中的广告、乱码和无效字符
- **艺人标准化**：智能处理艺人名称格式（G.E.M.、多人合唱等）
- **重复检测**：检测并跳过重复文件
- **文件名解析**：从文件名中提取歌手和歌曲信息
- **元数据刮削**：从 MusicBrainz 免费音乐数据库自动获取歌曲信息
- **封面下载**：自动下载并嵌入专辑封面
- **智能整理**：自动按「歌手/专辑」结构整理文件

## 项目结构

```
OpenMusicTag/
├── organizer.py               # 主程序入口（CLI）- 支持命令行参数
├── core/                      # 核心引擎包（import 形式：from core.xxx import ...）
│   ├── __init__.py
│   ├── pipeline.py            # 管道主类 - 批量处理调度
│   ├── base.py                # PipelineStage 抽象基类（含文本处理逻辑）
│   ├── config.py              # 配置类 + 注册表
│   ├── context.py             # Pipeline 上下文 - 共享资源和通用方法
│   ├── models.py              # AudioFile 数据模型
│   └── pipelines/             # Pipeline 阶段模块
│       ├── __init__.py
│       ├── load_stage.py              # 加载音频文件
│       ├── extract_tags_stage.py      # 提取原始标签
│       ├── clean_tags_stage.py        # 清理广告乱码
│       ├── normalize_artist_stage.py  # 标准化艺人名称
│       ├── check_duplicate_stage.py   # 检测重复文件
│       ├── extract_filename_stage.py  # 解析文件名
│       ├── scrape_metadata_stage.py   # MusicBrainz 刮削
│       ├── merge_metadata_stage.py    # 合并元数据
│       ├── calculate_path_stage.py    # 计算输出路径
│       ├── copy_file_stage.py         # 复制文件
│       ├── download_cover_stage.py    # 下载专辑封面
│       ├── write_tags_stage.py        # 写入标签
│       └── cleanup_stage.py           # 清理临时文件
├── gui/                       # PyQt6 + WebEngine + React 桌面应用
├── tests/                     # 单元测试
├── docs/                      # 设计与评审文档（solution.md、code_review_report.md）
└── AGENTS.md                  # 本文档
```

## 依赖安装

```bash
pip install opencc mutagen musicbrainzngs requests Pillow
```

## 使用方法

### 方式一：命令行参数（推荐）

```bash
python organizer.py <输入目录> [-o <输出目录>] [-t <线程数>]

# 示例
python organizer.py /path/to/music -o /path/to/music_organized -t 4
```

### 方式二：交互式运行

修改 `organizer.py` 中的 `input_path` 和 `output_path` 配置后运行：

```bash
python organizer.py
```

### 处理本地或网络共享音乐目录

```bash
# 本地目录示例
python organizer.py ~/Music -o ~/Music/organized

# 网络共享目录示例
python organizer.py /Volumes/shared/music -o /Volumes/shared/music_organized
```

## Pipeline 执行流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     Pipeline 执行顺序                            │
├─────────────────────────────────────────────────────────────────┤
│  1. LoadStage              加载音频文件，解析 mutagen 对象       │
│  2. ExtractRawTagsStage    提取原始标签元数据                    │
│  3. CleanRawTagsStage      清理广告乱码，繁简转换                │
│  4. NormalizeArtistStage   标准化艺人名称                        │
│  5. CheckDuplicateStage    检测重复文件（如重复则跳过后续）       │
│  6. ExtractFromFilenameStage 从文件名解析歌手和歌名              │
│  7. ScrapeMetadataStage    从 MusicBrainz 刮削元数据             │
│  8. MergeMetadataStage     合并所有来源的元数据                   │
│  9. CalculateOutputPathStage 计算输出文件路径                     │
│ 10. CopyFileStage          复制文件到输出目录                    │
│ 11. DownloadCoverStage     下载并嵌入专辑封面                    │
│ 12. WriteTagsStage         写入处理后的标签                      │
│ 13. CleanupStage           清理临时文件                          │
└─────────────────────────────────────────────────────────────────┘
```

## 核心类

### MusicOrganizerPipeline

管道主类，位于 `core/pipeline.py`，负责：

| 属性/方法 | 说明 |
|-----------|------|
| `config` | AppConfig 配置对象 |
| `input_path` | 输入目录 |
| `output_path` | 输出目录 |
| `threads` | 并行线程数 |
| `_build_pipeline()` | 根据配置动态构建管道 |
| `process_file()` | 处理单个文件 |
| `process()` | 批量处理所有文件 |

### AppConfig

配置类，位于 `core/config.py`，支持：

| 功能 | 说明 |
|------|------|
| `input_path` | 输入目录路径 |
| `output_path` | 输出目录路径 |
| `threads` | 处理线程数 |
| `pipeline_order` | Pipeline 执行顺序（可自定义） |
| `stage_config` | 各阶段配置字典 |
| `from_json()` | 从 JSON 文件加载配置 |
| `to_json()` | 保存配置到 JSON 文件 |
| `generate_default_config()` | 生成默认配置文件 |

### PipelineRegistry

注册表，位于 `core/config.py`，用于动态加载 Stage：

| 方法 | 说明 |
|------|------|
| `register(name)` | 注册 Stage 类 |
| `get(name)` | 获取已注册的 Stage 类 |
| `create_stage(name)` | 创建 Stage 实例 |
| `list_all()` | 列出所有已注册的 Stage |

### PipelineContext

上下文类，位于 `core/context.py`，提供共享资源和方法：

| 方法 | 说明 |
|------|------|
| `clean_text()` | 繁简转换 + 去广告 |
| `format_path()` | 格式化路径 |
| `normalize_artist()` | 标准化艺人名称 |
| `parse_filename()` | 从文件名解析信息 |
| `get_musicbrainz_client()` | 获取 MusicBrainz 客户端 |
| `stop()` / `continue_pipeline()` | 控制 Pipeline 执行 |

### AudioFile

数据模型，位于 `core/models.py`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `path` | Path | 原始文件路径 |
| `ext` | str | 文件扩展名 |
| `audio` | Any | mutagen 音频对象 |
| `raw_tags` | Dict | 原始标签 |
| `metadata` | Dict | 处理后元数据 |
| `scraped` | Dict | 刮削的元数据 |
| `final_metadata` | Dict | 最终元数据 |
| `output_path` | Path | 输出文件路径 |

## PipelineStage 基类

所有 Stage 继承的抽象基类，位于 `core/base.py`：

```python
class PipelineStage(ABC):
    NAME: str = "PipelineStage"
    
    def __init__(self):
        self._initialize()
    
    def _initialize(self) -> None:
        """子类可重写的初始化逻辑"""
        pass
    
    @abstractmethod
    def process(self, audio_file: AudioFile, context: PipelineContext) -> AudioFile:
        """处理音频文件，返回处理后的对象"""
        pass
    
    @classmethod
    def register(cls, name: str = None):
        """注册到全局注册表"""
```

## 支持格式

- MP3 (.mp3)
- FLAC (.flac)
- APE (.ape)
- M4A (.m4a)
- OGG (.ogg)
- WAV (.wav)

## 配置文件示例

可生成自定义配置文件：

```python
from core.config import generate_default_config

generate_default_config("/path/to/input", "/path/to/output", "pipeline_config.json")
```

生成的 `pipeline_config.json`：

```json
{
  "input_path": "/path/to/input",
  "output_path": "/path/to/output",
  "threads": 4,
  "pipeline_order": ["LoadStage", "ExtractRawTagsStage", ...],
  "stage_config": {
    "LoadStage": {
      "supported_formats": [".mp3", ".flac", ".m4a", ".ape", ".ogg", ".wav"]
    },
    "ScrapeMetadataStage": {
      "live_keywords": ["演唱会", "演唱會", "concert", "tour", "live"],
      "edition_keywords": ["珍藏版", "精选", "精選", "special", "edition"],
      "confidence_threshold": 80
    },
    "DownloadCoverStage": {
      "timeout": 10,
      "quality": 90
    }
  }
}
```

## 注意事项

1. **备份**：首次使用建议备份原文件
2. **线程安全**：每次 `process_file()` 调用创建新的 Context，确保线程安全
3. **SMB 权限**：macOS 跨文件系统复制可能遇到权限问题，代码已处理
4. **网络**：元数据刮削需要网络连接
5. **可定制性**：可通过配置文件调整 Pipeline 顺序和阶段参数
