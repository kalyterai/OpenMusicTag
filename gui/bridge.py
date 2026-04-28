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
from pipeline import MusicOrganizerPipeline
from config import AppConfig


class ProcessingWorker(QThread):
    """处理工作线程"""

    progress = pyqtSignal(dict)
    log = pyqtSignal(dict)
    finished = pyqtSignal(dict)
    error = pyqtSignal(str)

    def __init__(self, config: AppConfig):
        super().__init__()
        self.config = config

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
            pipeline = MusicOrganizerPipeline(self.config)

            # 设置回调
            pipeline.on_progress = on_progress
            pipeline.on_log = on_log
            pipeline.on_success = on_success
            pipeline.on_error = on_error

            # 执行处理
            pipeline.process()

            self.finished.emit({'success': True})

        except Exception as e:
            self.error.emit(str(e))
            self.finished.emit({'success': False, 'error': str(e)})


class Bridge(QObject):
    """前端与后端通信桥梁"""

    # 信号定义
    started = pyqtSignal(dict)
    progress = pyqtSignal(dict)
    finished = pyqtSignal(dict)
    error = pyqtSignal(dict)
    log = pyqtSignal(dict)

    def __init__(self, window):
        super().__init__()
        self.window = window
        self.worker = None
        self.processing = False

    @pyqtSlot(dict)
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

    @pyqtSlot(dict)
    def start_process(self, params: dict):
        """开始处理音乐文件"""
        if self.processing:
            self.log.emit({
                'message': '⚠️ 已经在处理中，请稍候...',
                'level': 'warning'
            })
            return

        input_path = params.get('input_path', '')
        output_path = params.get('output_path', '')
        threads = params.get('threads', 4)

        if not input_path or not output_path:
            self.error.emit({'message': '请选择输入和输出目录', 'code': 'INVALID_PATH'})
            return

        self.processing = True

        try:
            config = AppConfig(
                input_path=Path(input_path),
                output_path=Path(output_path),
                threads=threads
            )

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
            self.worker = ProcessingWorker(config)
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

    @pyqtSlot(dict)
    def update_config(self, config: dict):
        """更新配置"""
        # 配置更新逻辑
        self.log.emit({
            'message': '⚙️ 配置已更新',
            'level': 'info'
        })

    @pyqtSlot()
    def cancel_task(self):
        """取消任务"""
        if self.worker and self.processing:
            self.worker.terminate()
            self.processing = False
            self.log.emit({
                'message': '🛑 任务已取消',
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

    @pyqtSlot(result=dict)
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

    @pyqtSlot(str, result=dict)
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
                    # 统计文件夹中的音乐文件数量
                    music_count = sum(1 for f in item.rglob('*') if f.is_file() and self._is_music_file(f.name))
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

    @pyqtSlot(str, result=dict)
    def get_music_file_details(self, file_path: str) -> dict:
        """获取音乐文件详情"""
        try:
            import mutagen
            from mutagen.id3 import ID3
            from mutagen.mp3 import MP3
            from mutagen.flac import FLAC
            from mutagen.m4a import M4A
            from mutagen.ogg import Ogg
            from mutagen.wave import WAVE
            from mutagen.apev2 import APEv2

            file_path = Path(file_path)
            if not file_path.exists():
                return {}

            # 根据文件类型读取标签
            ext = file_path.suffix.lower()
            tags = {}

            try:
                if ext == '.mp3':
                    audio = MP3(str(file_path))
                elif ext == '.flac':
                    audio = FLAC(str(file_path))
                elif ext == '.m4a':
                    audio = M4A(str(file_path))
                elif ext == '.ogg':
                    audio = Ogg(str(file_path))
                elif ext == '.wav':
                    audio = WAVE(str(file_path))
                elif ext == '.ape':
                    audio = APEv2(str(file_path))
                else:
                    return {}

                # 提取常见标签
                if hasattr(audio, 'tags') and audio.tags:
                    tag_dict = audio.tags
                    tags = {
                        'title': str(tag_dict.get('TIT2', tag_dict.get('title', ''))) if hasattr(tag_dict, 'get') else '',
                        'artist': str(tag_dict.get('TPE1', tag_dict.get('artist', ''))) if hasattr(tag_dict, 'get') else '',
                        'album': str(tag_dict.get('TALB', tag_dict.get('album', ''))) if hasattr(tag_dict, 'get') else '',
                        'year': str(tag_dict.get('TDRC', tag_dict.get('year', tag_dict.get('date', '')))) if hasattr(tag_dict, 'get') else '',
                        'genre': str(tag_dict.get('TCON', tag_dict.get('genre', ''))) if hasattr(tag_dict, 'get') else '',
                        'track': str(tag_dict.get('TRCK', tag_dict.get('track', ''))) if hasattr(tag_dict, 'get') else '',
                    }
                else:
                    # 尝试直接访问属性
                    tags = {
                        'title': str(getattr(audio, 'title', '')),
                        'artist': str(getattr(audio, 'artist', '')),
                        'album': str(getattr(audio, 'album', '')),
                        'year': str(getattr(audio, 'year', str(getattr(audio, 'date', '')))),
                        'genre': str(getattr(audio, 'genre', '')),
                        'track': str(getattr(audio, 'track', '')),
                    }

                # 获取时长
                if hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                    duration = int(audio.info.length)
                    minutes = duration // 60
                    seconds = duration % 60
                    tags['duration'] = f"{minutes}:{seconds:02d}"

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

        if data.get('success'):
            self.log.emit({
                'message': '✅ 处理完成！',
                'level': 'success'
            })

        self.finished.emit({
            **data,
            'status': 'completed'
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

        self.setWindowTitle("OpenMusicTag - 音乐整理工具")
        self.setMinimumSize(1100, 700)
        self.resize(1200, 800)

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

    def set_icon(self):
        """设置窗口图标"""
        icon_path = Path(__file__).parent / "logo.png"
        if icon_path.exists():
            self.setWindowIcon(QIcon(str(icon_path)))

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
            "<p>A music organization tool for NAS</p>"
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
