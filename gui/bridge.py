#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Qt WebChannel Bridge - 前端与后端通信桥梁"""

import sys
import os
import json
import threading
from pathlib import Path
from PyQt6.QtCore import QObject, pyqtSlot, pyqtSignal, QTimer, QThread, QUrl, Qt
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QMessageBox, QFileDialog
)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtGui import QIcon, QAction

# 导入核心模块
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.pipeline import MusicOrganizerPipeline
from core.config import AppConfig

APP_BASE_TITLE = "OpenMusicTag - 音乐整理工具"
APP_DEFAULT_WIDTH = 1200
APP_DEFAULT_HEIGHT = 800
APP_MIN_WIDTH = 1100
APP_MIN_HEIGHT = 700


def apply_macos_application_icon(icon_path: Path) -> None:
    """Best-effort macOS app icon override for script-launched Qt apps."""
    if sys.platform != 'darwin' or not icon_path.exists():
        return
    try:
        from AppKit import NSApplication, NSImage
        image = NSImage.alloc().initWithContentsOfFile_(str(icon_path))
        if image:
            NSApplication.sharedApplication().setApplicationIconImage_(image)
    except Exception:
        pass


class ProcessingWorker(QThread):
    """处理工作线程"""

    progress = pyqtSignal(dict)
    log = pyqtSignal(dict)
    finished = pyqtSignal(dict)
    error = pyqtSignal(str)

    def __init__(self, config: AppConfig, storage=None):
        super().__init__()
        self.config = config
        self.cancel_event = threading.Event()
        self.storage = storage

    def cancel(self):
        """请求协作式取消"""
        self.cancel_event.set()
        self.requestInterruption()

    def run(self):
        try:
            # 创建回调
            def on_progress(file_count, total, current_file):
                self.progress.emit({
                    'type': 'progress',
                    'current': file_count,
                    'total': total,
                    'file': current_file,
                    'percent': (file_count / total * 100) if total > 0 else 0
                })

            def on_log(message, level='info'):
                self.log.emit({
                    'type': 'log',
                    'message': message,
                    'level': level
                })

            def on_success(file_info):
                self.progress.emit({
                    'type': 'success',
                    'file': file_info
                })

            def on_error(error_msg):
                self.error.emit(error_msg)

            # 创建 pipeline
            pipeline = MusicOrganizerPipeline(self.config, cancel_event=self.cancel_event,
                                              storage=self.storage)

            # 设置回调
            pipeline.on_progress = on_progress
            pipeline.on_log = on_log
            pipeline.on_success = on_success
            pipeline.on_error = on_error

            # 执行处理
            pipeline.process()

            if self.cancel_event.is_set():
                self.finished.emit({'success': False, 'cancelled': True})
            else:
                self.finished.emit({'success': True})

        except Exception as e:
            self.error.emit(str(e))
            self.finished.emit({'success': False, 'error': str(e)})


class Bridge(QObject):
    """前端与后端通信桥梁"""

    # 信号定义（暴露给 QWebChannel，必须用可序列化的 QVariantMap 而非 dict/
    # PyQt_PyObject，否则 emit 给前端时会触发 C++ 类型转换崩溃）
    started = pyqtSignal('QVariantMap')
    progress = pyqtSignal('QVariantMap')
    finished = pyqtSignal('QVariantMap')
    error = pyqtSignal('QVariantMap')
    log = pyqtSignal('QVariantMap')

    def __init__(self, window):
        super().__init__()
        self.window = window
        self.worker = None
        self.processing = False
        self.config_overrides = {}
        self._storage = None

    @property
    def storage(self):
        """懒加载持久化层：仅在真正用到时才创建数据库（避免测试副作用）。"""
        if self._storage is None:
            from core.storage import Storage
            self._storage = Storage()
        return self._storage

    def _build_pipeline_order(self, params: dict) -> list:
        """根据 GUI 开关构建 Pipeline 顺序"""
        order = AppConfig._default_order()
        disabled = set()

        if params.get('enableDuplicateCheck') is False or params.get('enable_duplicate_check') is False:
            disabled.add('CheckDuplicateStage')
        if params.get('enableFilenameParse') is False or params.get('enable_filename_parse') is False:
            disabled.add('ExtractFromFilenameStage')
        if params.get('enableMetadataScrape') is False or params.get('enable_metadata_scrape') is False:
            disabled.add('ScrapeMetadataStage')
        if params.get('enableCoverDownload') is False or params.get('enable_cover_download') is False:
            disabled.add('DownloadCoverStage')

        return [stage for stage in order if stage not in disabled]

    @pyqtSlot('QVariantMap')
    def start_scan(self, params: dict):
        """开始扫描目录"""
        input_path = params.get('input_path', '')
        if not input_path:
            self.error.emit({'message': '请选择输入目录', 'code': 'INVALID_PATH'})
            return

        self.started.emit({
            'input_path': input_path,
            'status': 'scanning'
        })

        # 发送扫描完成信号
        self.log.emit({
            'message': f'📁 扫描目录: {input_path}',
            'level': 'info'
        })

        self.finished.emit({
            'status': 'scan_complete',
            'total_files': 0  # 后续实现
        })

    @pyqtSlot('QVariantMap')
    def start_process(self, params: dict):
        """开始处理音乐文件"""
        if self.processing:
            self.log.emit({
                'message': '⚠️ 已经在处理中，请稍候...',
                'level': 'warning'
            })
            return

        try:
            params = dict(params or {})
            input_path = params.get('input_path', '')
            output_path = params.get('output_path', '')
            threads = max(1, min(16, int(params.get('threads', 4) or 4)))

            if not input_path or not output_path:
                self.error.emit({'message': '请选择输入和输出目录', 'code': 'INVALID_PATH'})
                return

            self.processing = True

            stage_config = {
                'ScrapeMetadataStage': {
                    'confidence_threshold': int(params.get('confidenceThreshold', 80) or 80),
                },
                'DownloadCoverStage': {
                    'timeout': int(params.get('coverTimeout', 10) or 10),
                    'quality': int(params.get('coverQuality', 90) or 90),
                },
            }

            config = AppConfig(
                input_path=Path(input_path),
                output_path=Path(output_path),
                threads=threads,
                pipeline_order=self._build_pipeline_order({**self.config_overrides, **params}),
                stage_config=stage_config,
            )
            config.execution_config = {
                'threads': threads,
                'enableCoverDownload': params.get('enableCoverDownload', True),
                'enableSimplifiedChinese': params.get('enableSimplifiedChinese', True),
                'enableDuplicateCheck': params.get('enableDuplicateCheck', True),
                'enableFilenameParse': params.get('enableFilenameParse', True),
                'enableMetadataScrape': params.get('enableMetadataScrape', True),
                'preserveOriginal': params.get('preserveOriginal', True),
                'autoOrganize': params.get('autoOrganize', True),
                'confidenceThreshold': stage_config['ScrapeMetadataStage']['confidence_threshold'],
                'coverTimeout': stage_config['DownloadCoverStage']['timeout'],
                'coverQuality': stage_config['DownloadCoverStage']['quality'],
                'input_path': input_path,
                'output_path': output_path,
            }

            self.log.emit({
                'message': '🚀 开始处理...',
                'level': 'info'
            })

            self.log.emit({
                'message': f'📁 输入目录: {input_path}',
                'level': 'info'
            })

            self.log.emit({
                'message': f'📁 输出目录: {output_path}',
                'level': 'info'
            })

            self.log.emit({
                'message': f'⚡ 线程数: {threads}',
                'level': 'info'
            })

            self.started.emit({
                'input_path': input_path,
                'output_path': output_path,
                'threads': threads,
                'status': 'processing'
            })

            # 启动工作线程
            self.worker = ProcessingWorker(config, storage=self.storage)
            self.worker.progress.connect(self._on_progress)
            self.worker.log.connect(self._on_log)
            self.worker.finished.connect(self._on_finished)
            self.worker.error.connect(self._on_error)
            self.worker.start()

        except Exception as e:
            self.processing = False
            self.error.emit({'message': str(e), 'code': 'UNKNOWN'})
            self.log.emit({
                'message': f'❌ 错误: {e}',
                'level': 'error'
            })

    @pyqtSlot('QVariantMap')
    def update_config(self, config: dict):
        """更新配置"""
        self.config_overrides.update(config or {})
        self.log.emit({
            'message': '⚙️ 配置已更新',
            'level': 'info'
        })

    @pyqtSlot()
    def cancel_task(self):
        """取消任务"""
        if self.worker and self.processing:
            self.worker.cancel()
            self.log.emit({
                'message': '🛑 正在取消任务，当前文件结束后停止',
                'level': 'warning'
            })

    @pyqtSlot(str, result=str)
    def select_directory(self, current_path: str) -> str:
        """选择目录"""
        from PyQt6.QtWidgets import QFileDialog

        dialog = QFileDialog(self.window)
        dialog.setFileMode(QFileDialog.FileMode.Directory)
        dialog.setOption(QFileDialog.Option.ShowDirsOnly, True)
        dialog.setDirectory(current_path if current_path else str(Path.home()))

        if dialog.exec() == QFileDialog.DialogCode.Accepted:
            selected = dialog.selectedFiles()
            if selected and len(selected) > 0:
                print(f"[DEBUG] 选择目录: {selected[0]}")
                return selected[0]
        
        print(f"[DEBUG] 取消选择或失败，返回原路径: {current_path}")
        return current_path if current_path else ""

    @pyqtSlot(result=str)
    def get_home_path(self) -> str:
        """获取用户主目录"""
        return str(Path.home())

    @pyqtSlot(result=str)
    def get_last_library_path(self) -> str:
        """获取上次打开的资源库目录。"""
        try:
            return self.storage.get_setting("last_library_path", "")
        except Exception as e:
            print(f"[ERROR] 读取上次资源库目录失败: {e}")
            return ""

    @pyqtSlot(str, result=bool)
    def set_last_library_path(self, path: str) -> bool:
        """保存上次打开的资源库目录。"""
        try:
            self.storage.set_setting("last_library_path", path or "")
            return True
        except Exception as e:
            print(f"[ERROR] 保存上次资源库目录失败: {e}")
            return False

    @pyqtSlot(str, result=bool)
    def set_window_title(self, file_name: str) -> bool:
        """同步当前选中文件到原生窗口标题。"""
        title = APP_BASE_TITLE
        clean_name = Path(file_name).name if file_name else ""
        if clean_name:
            title = f"OpenMusicTag - {clean_name}"
        try:
            if self.window:
                self.window.setWindowTitle(title)
            return True
        except Exception as e:
            print(f"[WARN] 设置窗口标题失败: {e}")
            return False

    @pyqtSlot(result='QVariantMap')
    def get_default_config(self) -> dict:
        """获取默认配置"""
        return {
            'input_path': '',
            'output_path': '',
            'threads': 4,
            'formats': ['.mp3', '.flac', '.m4a', '.ape', '.ogg', '.wav'],
            'enableCoverDownload': True,
            'enableSimplifiedChinese': True,
        }

    @pyqtSlot(result='QVariantMap')
    def get_dashboard_stats(self) -> dict:
        """聚合统计：累计歌曲数、成功率、处理容量、任务数（来自 SQLite）。"""
        try:
            return self.storage.get_dashboard_stats()
        except Exception as e:
            print(f"[ERROR] 读取统计失败: {e}")
            return {}

    @pyqtSlot(int, result=list)
    def get_recent_tasks(self, limit: int = 10) -> list:
        """最近的任务记录（用于 Dashboard 近期任务 / History）。"""
        try:
            return self.storage.get_recent_tasks(limit or 10)
        except Exception as e:
            print(f"[ERROR] 读取任务记录失败: {e}")
            return []

    @pyqtSlot(int, result='QVariantMap')
    def get_task(self, task_id: int) -> dict:
        """获取单个任务详情（含 execution_config）。"""
        try:
            return self.storage.get_task(task_id) or {}
        except Exception as e:
            print(f"[ERROR] 读取任务详情失败: {e}")
            return {}

    @pyqtSlot(int, result=list)
    def get_daily_activity(self, days: int = 7) -> list:
        """最近 N 天每天成功处理的歌曲数（活跃度图）。"""
        try:
            return self.storage.get_daily_activity(days or 7)
        except Exception as e:
            print(f"[ERROR] 读取活跃度失败: {e}")
            return []

    @pyqtSlot(int, int, str, result=list)
    def get_songs(self, limit: int = 20, offset: int = 0, status: str = "") -> list:
        """分页获取已处理的歌曲（增量加载，可按状态过滤）。"""
        try:
            return self.storage.get_songs(limit or 20, offset or 0, status or None)
        except Exception as e:
            print(f"[ERROR] 读取歌曲列表失败: {e}")
            return []

    @pyqtSlot(str, result=int)
    def count_songs(self, status: str = "") -> int:
        """已处理歌曲总数（供分页计算）。"""
        try:
            return self.storage.count_songs(status or None)
        except Exception as e:
            print(f"[ERROR] 统计歌曲数失败: {e}")
            return 0

    @pyqtSlot(int, int, int, result=list)
    def get_task_songs(self, task_id: int, limit: int = 50, offset: int = 0) -> list:
        """分页获取某任务下的歌曲。"""
        try:
            return self.storage.get_task_songs(task_id, limit or 50, offset or 0)
        except Exception as e:
            print(f"[ERROR] 读取任务歌曲失败: {e}")
            return []

    @pyqtSlot(int, str, int, result=list)
    def get_task_events(self, task_id: int, status: str = "", limit: int = 2000) -> list:
        """获取某任务的环节事件（status 为空则全部，可传 'failed' 只看失败）。"""
        try:
            return self.storage.get_task_events(task_id, status or None, limit or 2000)
        except Exception as e:
            print(f"[ERROR] 读取环节事件失败: {e}")
            return []

    @pyqtSlot(int, result=list)
    def get_stage_failure_stats(self, task_id: int = 0) -> list:
        """按环节汇总各状态计数（task_id 传 0 则统计所有任务）。"""
        try:
            return self.storage.get_stage_failure_stats(task_id or None)
        except Exception as e:
            print(f"[ERROR] 读取环节统计失败: {e}")
            return []

    @pyqtSlot(int, int, result=list)
    def get_task_log(self, task_id: int, limit: int = 1000) -> list:
        """读取任务 JSONL 详细日志，返回最近 limit 条（每条已解析为对象）。"""
        try:
            task = self.storage.get_task(task_id) or {}
            log_path = task.get("log_path")
            if not log_path or not Path(log_path).exists():
                return []
            with open(log_path, encoding="utf-8") as fh:
                lines = fh.readlines()
            records = []
            for line in lines[-(limit or 1000):]:
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except (ValueError, TypeError):
                    continue
            return records
        except Exception as e:
            print(f"[ERROR] 读取任务日志失败: {e}")
            return []

    @pyqtSlot(int, result=int)
    def count_task_songs(self, task_id: int) -> int:
        try:
            return self.storage.count_task_songs(task_id)
        except Exception as e:
            print(f"[ERROR] 统计任务歌曲数失败: {e}")
            return 0

    @pyqtSlot(int, result='QVariantMap')
    def get_song(self, song_id: int) -> dict:
        """获取单曲完整详情（含解析后的标签元数据），用于歌曲详情页。"""
        try:
            song = self.storage.get_song(song_id)
            return song or {}
        except Exception as e:
            print(f"[ERROR] 读取歌曲详情失败: {e}")
            return {}

    @pyqtSlot(str, result='QVariantMap')
    def scan_directory_lazy(self, path: str) -> dict:
        """快速列目录：只返回子目录/文件名，不做每个子目录的歌曲计数。

        远端/网络目录下，逐个子目录 iterdir 计数会阻塞 GUI 线程；这里把计数
        延后到前端按需调用 ``count_folder_files``（一次只统计可见的几个）。
        子目录的 ``fileCount`` 以 -1 表示「尚未统计」。
        """
        try:
            base_path = Path(path)
            result = {'subfolders': [], 'files': [], 'exists': False, 'path': str(base_path)}
            if not base_path.exists():
                return result
            result['exists'] = True
            result['path'] = str(base_path.absolute())
            for item in sorted(base_path.iterdir()):
                if item.is_dir():
                    result['subfolders'].append({
                        'name': item.name,
                        'path': str(item.absolute()),
                        'fileCount': -1,  # 未统计，前端按需懒加载
                    })
                elif item.is_file() and self._is_music_file(item.name):
                    result['files'].append({
                        'name': item.name,
                        'path': str(item.absolute()),
                        'ext': item.suffix.lower(),
                    })
            return result
        except Exception as e:
            print(f"[ERROR] 懒扫描目录失败: {e}")
            return {'subfolders': [], 'files': [], 'exists': False, 'path': path}

    @pyqtSlot(str, result=int)
    def count_folder_files(self, path: str) -> int:
        """递归统计目录下全部音乐文件数（前端对可见目录按需调用）。"""
        try:
            folder = Path(path)
            if not folder.is_dir():
                return 0
            count = 0
            for root, _, files in os.walk(folder):
                count += sum(1 for name in files if self._is_music_file(name))
            return count
        except OSError:
            return 0
        except Exception as e:
            print(f"[ERROR] 统计目录文件数失败: {e}")
            return 0

    @pyqtSlot(str, result='QVariantMap')
    def scan_directory(self, path: str) -> dict:
        """扫描目录获取文件夹和文件列表"""
        try:
            base_path = Path(path)
            result = {
                'subfolders': [],
                'files': []
            }

            if not base_path.exists():
                return result

            # 获取子文件夹
            for item in sorted(base_path.iterdir()):
                if item.is_dir():
                    # 只统计当前层，避免大型目录或网络共享目录阻塞 GUI 线程
                    try:
                        music_count = sum(
                            1 for f in item.iterdir()
                            if f.is_file() and self._is_music_file(f.name)
                        )
                    except OSError:
                        music_count = 0
                    result['subfolders'].append({
                        'name': item.name,
                        'path': str(item.absolute()),
                        'fileCount': music_count
                    })
                elif item.is_file() and self._is_music_file(item.name):
                    result['files'].append({
                        'name': item.name,
                        'path': str(item.absolute()),
                        'ext': item.suffix.lower()
                    })

            return result
        except Exception as e:
            print(f"[ERROR] 扫描目录失败: {e}")
            return {'subfolders': [], 'files': []}

    @pyqtSlot(str, result='QVariantMap')
    def get_music_file_details(self, file_path: str) -> dict:
        """获取音乐文件详情"""
        try:
            import base64
            import mutagen

            file_path = Path(file_path)
            if not file_path.exists():
                return {}

            tags = {}
            cover_data_url = ''

            try:
                audio = mutagen.File(str(file_path), easy=True)
                raw_audio = mutagen.File(str(file_path))
                if not audio and not raw_audio:
                    return {}

                def stringify(value):
                    if value is None:
                        return ''
                    if isinstance(value, (list, tuple)):
                        return stringify(value[0]) if value else ''
                    if hasattr(value, 'text'):
                        return stringify(value.text)
                    return str(value)

                def get_tag(*keys):
                    for source in (getattr(audio, 'tags', None), getattr(raw_audio, 'tags', None)):
                        if not source or not hasattr(source, 'get'):
                            continue
                        for key in keys:
                            value = source.get(key)
                            if value:
                                return stringify(value)
                    return ''

                def image_data_url(data, mime='image/jpeg'):
                    if not data:
                        return ''
                    encoded = base64.b64encode(bytes(data)).decode('ascii')
                    return f"data:{mime or 'image/jpeg'};base64,{encoded}"

                def get_cover_data_url():
                    source = raw_audio or audio
                    pictures = getattr(source, 'pictures', None)
                    if pictures:
                        picture = pictures[0]
                        return image_data_url(getattr(picture, 'data', b''), getattr(picture, 'mime', 'image/jpeg'))

                    tags_source = getattr(source, 'tags', None)
                    if not tags_source:
                        return ''

                    values = tags_source.values() if hasattr(tags_source, 'values') else []
                    for value in values:
                        if value.__class__.__name__ == 'APIC':
                            return image_data_url(getattr(value, 'data', b''), getattr(value, 'mime', 'image/jpeg'))

                    covr = tags_source.get('covr') if hasattr(tags_source, 'get') else None
                    if covr:
                        first = covr[0] if isinstance(covr, (list, tuple)) else covr
                        imageformat = getattr(first, 'imageformat', None)
                        mime = 'image/png' if imageformat == 14 else 'image/jpeg'
                        return image_data_url(first, mime)

                    return ''

                tags = {
                    'title': get_tag('title', 'TITLE', 'TIT2'),
                    'artist': get_tag('artist', 'ARTIST', 'TPE1'),
                    'album': get_tag('album', 'ALBUM', 'TALB'),
                    'year': get_tag('date', 'year', 'DATE', 'TDRC'),
                    'genre': get_tag('genre', 'GENRE', 'TCON'),
                    'track': get_tag('tracknumber', 'track', 'TRACKNUMBER', 'TRCK'),
                }

                # 获取时长
                source_for_info = raw_audio or audio
                if hasattr(source_for_info, 'info') and hasattr(source_for_info.info, 'length'):
                    duration = int(source_for_info.info.length)
                    minutes = duration // 60
                    seconds = duration % 60
                    tags['duration'] = f"{minutes}:{seconds:02d}"
                cover_data_url = get_cover_data_url()

            except Exception as e:
                print(f"[WARN] 读取标签失败: {e}")

            # 确保所有字段都有值
            tags = {
                'title': tags.get('title', ''),
                'artist': tags.get('artist', ''),
                'album': tags.get('album', ''),
                'year': tags.get('year', ''),
                'genre': tags.get('genre', ''),
                'track': tags.get('track', ''),
                'duration': tags.get('duration', '--:--'),
                'coverDataUrl': cover_data_url,
            }

            return tags
        except Exception as e:
            print(f"[ERROR] 获取文件详情失败: {e}")
            return {}

    @pyqtSlot(result=list)
    def get_common_directories(self) -> list:
        """获取常用目录列表"""
        import platform
        system = platform.system()

        directories = []

        if system == 'Darwin':  # macOS
            directories = [
                str(Path.home()),
                str(Path.home() / 'Documents'),
                str(Path.home() / 'Music'),
                str(Path.home() / 'Downloads'),
                '/Volumes',
            ]
        elif system == 'Windows':
            directories = [
                str(Path.home()),
                str(Path.home() / 'Documents'),
                str(Path.home() / 'Music'),
                str(Path.home() / 'Downloads'),
            ]
        else:  # Linux
            directories = [
                str(Path.home()),
                str(Path.home() / 'Documents'),
                str(Path.home() / 'Music'),
                '/mnt',
            ]

        return directories

    def _permission_probe_directories(self) -> list:
        """启动时轻量探测的目录。

        这里故意不递归、不统计文件数，只触发系统对常用受保护目录的访问授权。
        """
        import platform
        system = platform.system()
        if system == 'Darwin':
            return [
                str(Path.home() / 'Desktop'),
                str(Path.home() / 'Documents'),
                str(Path.home() / 'Downloads'),
                str(Path.home() / 'Music'),
                '/Volumes',
            ]
        return self.get_common_directories()

    @pyqtSlot(result=bool)
    def request_initial_permissions(self) -> bool:
        """启动阶段集中请求/预热常用目录访问权限。"""
        ok = True
        for raw in self._permission_probe_directories():
            try:
                path = Path(raw)
                if not path.exists() or not path.is_dir():
                    continue
                # 只读取当前层的第一个条目，不递归，不做耗时统计。
                next(path.iterdir(), None)
            except PermissionError:
                ok = False
                self.log.emit({
                    'message': f'需要授权访问目录: {raw}',
                    'level': 'warning',
                })
            except OSError:
                # 网络卷、外置卷可能暂不可达；不要阻塞启动。
                continue
            except Exception as e:
                ok = False
                print(f"[WARN] 启动权限预热失败: {raw}: {e}")
        return ok

    @pyqtSlot(result=list)
    def list_artist_aliases(self) -> list:
        try:
            return self.storage.list_artist_aliases()
        except Exception as e:
            print(f"[ERROR] 读取艺人映射失败: {e}")
            return []

    @pyqtSlot(str, str, result=int)
    def add_artist_alias(self, original: str, standardized: str) -> int:
        try:
            if not original.strip() or not standardized.strip():
                return 0
            return self.storage.add_artist_alias(original, standardized)
        except Exception as e:
            print(f"[ERROR] 添加艺人映射失败: {e}")
            return 0

    @pyqtSlot(int, str, str, bool, result=bool)
    def update_artist_alias(self, alias_id: int, original: str, standardized: str,
                            enabled: bool) -> bool:
        try:
            self.storage.update_artist_alias(alias_id, original, standardized, enabled)
            return True
        except Exception as e:
            print(f"[ERROR] 更新艺人映射失败: {e}")
            return False

    @pyqtSlot(int, result=bool)
    def delete_artist_alias(self, alias_id: int) -> bool:
        try:
            self.storage.delete_artist_alias(alias_id)
            return True
        except Exception as e:
            print(f"[ERROR] 删除艺人映射失败: {e}")
            return False

    @pyqtSlot(result=list)
    def list_cleanup_rules(self) -> list:
        try:
            return self.storage.list_cleanup_rules()
        except Exception as e:
            print(f"[ERROR] 读取清洗规则失败: {e}")
            return []

    @pyqtSlot(str, str, str, bool, result=int)
    def add_cleanup_rule(self, pattern: str, replacement: str,
                         description: str, enabled: bool) -> int:
        try:
            if not pattern.strip():
                return 0
            return self.storage.add_cleanup_rule(pattern, replacement, description, enabled)
        except Exception as e:
            print(f"[ERROR] 添加清洗规则失败: {e}")
            return 0

    @pyqtSlot(int, str, str, str, bool, result=bool)
    def update_cleanup_rule(self, rule_id: int, pattern: str, replacement: str,
                            description: str, enabled: bool) -> bool:
        try:
            self.storage.update_cleanup_rule(rule_id, pattern, replacement, description, enabled)
            return True
        except Exception as e:
            print(f"[ERROR] 更新清洗规则失败: {e}")
            return False

    @pyqtSlot(int, result=bool)
    def delete_cleanup_rule(self, rule_id: int) -> bool:
        try:
            self.storage.delete_cleanup_rule(rule_id)
            return True
        except Exception as e:
            print(f"[ERROR] 删除清洗规则失败: {e}")
            return False

    def _is_music_file(self, filename: str) -> bool:
        """检查是否为音乐文件"""
        music_extensions = {'.mp3', '.flac', '.m4a', '.ape', '.ogg', '.wav'}
        return Path(filename).suffix.lower() in music_extensions

    @pyqtSlot(result=bool)
    def is_processing(self) -> bool:
        """检查是否正在处理"""
        return self.processing

    def _on_progress(self, data: dict):
        """进度更新回调"""
        self.progress.emit(data)

    def _on_log(self, data: dict):
        """日志回调"""
        self.log.emit(data)

    def _on_finished(self, data: dict):
        """完成回调"""
        self.processing = False

        if data.get('cancelled'):
            self.log.emit({
                'message': '🛑 任务已取消',
                'level': 'warning'
            })
        elif data.get('success'):
            self.log.emit({
                'message': '✅ 处理完成！',
                'level': 'success'
            })

        self.finished.emit({
            **data,
            'status': 'cancelled' if data.get('cancelled') else 'completed'
        })

    def _on_error(self, error_msg: str):
        """错误回调"""
        self.processing = False
        self.error.emit({'message': error_msg, 'code': 'PROCESSING_ERROR'})
        self.log.emit({
            'message': f'❌ 处理错误: {error_msg}',
            'level': 'error'
        })


class MainWindow(QMainWindow):
    """主窗口 - 使用FramelessMainWindow提供跨平台无边框窗口支持"""

    def __init__(self):
        super().__init__()

        self.setWindowTitle(APP_BASE_TITLE)
        self.setMinimumSize(APP_MIN_WIDTH, APP_MIN_HEIGHT)
        self.resize(APP_DEFAULT_WIDTH, APP_DEFAULT_HEIGHT)

        # 设置窗口图标
        self.set_icon()

        # 设置通信桥梁
        self.bridge = Bridge(self)

        # 设置 WebChannel（在创建 WebEngineView 之前）
        from PyQt6.QtWebChannel import QWebChannel
        self.channel = QWebChannel()
        self.channel.registerObject("bridge", self.bridge)

        # 创建 WebEngineView
        self.browser = QWebEngineView()

        # 设置 WebChannel 到页面
        self.browser.page().setWebChannel(self.channel)

        # 加载本地 HTML
        dist_html_path = Path(__file__).parent / "dist" / "index.html"
        if dist_html_path.exists():
            # 优先加载构建后的 HTML
            self.browser.setUrl(QUrl.fromLocalFile(str(dist_html_path.absolute())))
        else:
            # 如果没有构建的 HTML，使用开发服务器
            self.browser.setUrl(QUrl("http://localhost:3000"))

        # 将 browser 设置为中心部件
        self.setCentralWidget(self.browser)

        # 启用开发者工具（调试用）
        # self.browser.page().setDevToolsPage(QWebEngineView().page())

        # 创建 macOS 应用菜单
        self._create_macos_menu()

        # 启动后集中触发常用目录访问授权，避免首次打开资源库时才逐个弹窗。
        QTimer.singleShot(1200, self.bridge.request_initial_permissions)

    def set_icon(self):
        """设置窗口图标"""
        icon_path = Path(__file__).parent / "logo.png"
        if icon_path.exists():
            icon = QIcon(str(icon_path))
            self.setWindowIcon(icon)
            app = QApplication.instance()
            if app:
                app.setWindowIcon(icon)
            apply_macos_application_icon(icon_path)

    def closeEvent(self, event):
        """关闭窗口时的事件"""
        if self.bridge.is_processing():
            reply = QMessageBox.question(
                self,
                "确认",
                "正在处理中，确定要退出吗？",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            if reply == QMessageBox.StandardButton.No:
                event.ignore()
                return
        event.accept()

    def _create_macos_menu(self):
        """创建 macOS 应用菜单"""
        if sys.platform != 'darwin':
            return

        # 获取菜单栏
        menu_bar = self.menuBar()

        # 创建应用菜单（在 macOS 上会显示为 OpenMusicTag）
        app_menu = menu_bar.addMenu("OpenMusicTag")

        # 添加 About 菜单项
        about_action = QAction("About OpenMusicTag", self)
        about_action.triggered.connect(self._show_about)
        app_menu.addAction(about_action)

        app_menu.addSeparator()

        # 添加 Preferences 菜单项
        prefs_action = QAction("Preferences...", self)
        prefs_action.setShortcut("Ctrl+,")
        prefs_action.triggered.connect(self._show_preferences)
        app_menu.addAction(prefs_action)

    def _show_about(self):
        """显示关于对话框"""
        QMessageBox.about(
            self,
            "About OpenMusicTag",
            "<h2>OpenMusicTag</h2>"
            "<p>Version 1.0.0</p>"
            "<p>A general music scraping tool</p>"
            "<p>Author: Kalyter</p>"
        )

    def _show_preferences(self):
        """显示偏好设置"""
        # 通过 JavaScript 触发前端设置页面
        self.browser.page().runJavaScript("window.location.hash = '#/settings'")


def main():
    app = QApplication(sys.argv)

    # 设置应用信息
    app.setApplicationName("OpenMusicTag")
    app.setOrganizationName("OpenMusicTag")
    app.setOrganizationDomain("openmusictag.local")

    # 创建并显示窗口
    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
