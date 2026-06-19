# -*- coding: utf-8 -*-
"""音乐整理管道 - 使用配置化动态加载，支持 GUI 回调"""

import os
import threading
import time
import traceback
from concurrent.futures import CancelledError, ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Optional, Tuple, Callable


# 导入所有 Stage 以触发注册
from core.pipelines.load_stage import LoadStage
from core.pipelines.extract_tags_stage import ExtractRawTagsStage
from core.pipelines.clean_tags_stage import CleanRawTagsStage
from core.pipelines.normalize_artist_stage import NormalizeArtistStage
from core.pipelines.check_duplicate_stage import CheckDuplicateStage
from core.pipelines.extract_filename_stage import ExtractFromFilenameStage
from core.pipelines.scrape_metadata_stage import ScrapeMetadataStage
from core.pipelines.merge_metadata_stage import MergeMetadataStage
from core.pipelines.calculate_path_stage import CalculateOutputPathStage
from core.pipelines.copy_file_stage import CopyFileStage
from core.pipelines.download_cover_stage import DownloadCoverStage
from core.pipelines.write_tags_stage import WriteTagsStage
from core.pipelines.cleanup_stage import CleanupStage

from core.config import AppConfig, PipelineRegistry
from core.context import PipelineContext
from core.models import AudioFile


class MusicOrganizerPipeline:
    """
    音乐整理管道

    管道执行顺序：
    1. 加载文件
    2. 提取原始标签
    3. 清理广告乱码
    4. 标准化歌手
    5. 检查重复（可能 stop）
    6. 解析文件名
    7. MusicBrainz 刮削
    8. 合并元数据
    9. 计算输出路径
    10. 复制文件
    11. 下载封面
    12. 写入标签
    13. 清理临时文件
    """

    def __init__(self, config: AppConfig, 
                 on_progress: Callable[[int, int, str], None] = None,
                 on_log: Callable[[str, str], None] = None,
                 on_success: Callable[[dict], None] = None,
                 on_error: Callable[[str], None] = None,
                 cancel_event: Optional[threading.Event] = None,
                 storage=None):
        self.config = config
        self.pipeline = self._build_pipeline()
        self.cancel_event = cancel_event
        # 可选的持久化层（None 则不记录，便于 CLI/测试）
        self.storage = storage
        
        # GUI 回调函数
        self.on_progress = on_progress or (lambda *args: None)
        self.on_log = on_log or (lambda *args: None)
        self.on_success = on_success or (lambda *args: None)
        self.on_error = on_error or (lambda *args: None)

    @property
    def input_path(self) -> Path:
        return self.config.input_path

    @property
    def output_path(self) -> Path:
        return self.config.output_path

    @property
    def threads(self) -> int:
        return self.config.threads

    def _build_pipeline(self) -> List:
        """根据配置动态构建管道"""
        stages = []
        for stage_name in self.config.pipeline_order:
            stage = PipelineRegistry.create_stage(stage_name)
            stages.append(stage)
        return stages

    def _format_duration(self, seconds: float) -> str:
        """格式化时长为人类可读格式"""
        if seconds < 60:
            return f"{seconds:.1f}秒"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            secs = int(seconds % 60)
            return f"{minutes}分{secs}秒"
        else:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            secs = int(seconds % 60)
            return f"{hours}小时{minutes}分{secs}秒"

    def process_file(self, file_path: Path) -> Tuple[Optional[Path], bool]:
        """处理单个文件（每次调用创建新的 context，确保线程安全）"""
        context = PipelineContext(self.config, self.cancel_event)
        audio_file = AudioFile(path=file_path, ext=file_path.suffix.lower())

        # 依次执行所有阶段
        for stage in self.pipeline:
            if not context.should_continue():
                break
            try:
                audio_file = stage.process(audio_file, context)
            except Exception:
                print(f"\n  ✗ {stage.NAME} 阶段出错: {file_path.name}")
                traceback.print_exc()
                context.stop()
                return None, False

            # 检查是否需要跳过（通过 context.breakout 控制）
            if context.should_continue():
                continue

            # 跳过后续阶段
            break

        # 如果被跳过，返回 (None, True)
        if not context.should_continue():
            return None, True

        return audio_file.output_path, False

    @staticmethod
    def _file_size(path: Path) -> int:
        try:
            return path.stat().st_size
        except OSError:
            return 0

    def _record_song(self, task_id, status, source_path, output_path=None,
                     info=None, size=0) -> None:
        """把单曲结果写入持久化层（无 storage / 无 task 时静默跳过）。"""
        if not self.storage or not task_id:
            return
        info = info or {}
        try:
            self.storage.add_song(
                task_id, status,
                source_path=str(source_path),
                output_path=str(output_path) if output_path else "",
                artist=info.get("artist", ""),
                album=info.get("album", ""),
                title=info.get("title", ""),
                size_bytes=size,
            )
        except Exception:
            pass

    def process(self) -> None:
        """批量处理音乐文件"""
        supported_formats = self.config.get_supported_formats()

        self.on_log(f"扫描目录: {self.config.input_path}", "info")
        self.on_log(f"支持格式: {supported_formats}", "info")

        audio_files = []
        for root, _, files in os.walk(self.config.input_path):
            if self.cancel_event and self.cancel_event.is_set():
                self.on_log("任务已取消，停止扫描", "warning")
                return
            for f in files:
                if f.lower().endswith(supported_formats):
                    audio_files.append(Path(root) / f)

        self.on_log(f"找到 {len(audio_files)} 个文件", "info")

        total_files = len(audio_files)
        if total_files == 0:
            self.on_log("未找到支持的音乐文件", "warning")
            return

        self.on_log(f"使用 {self.config.threads} 个线程处理", "info")

        # 持久化：开始一个任务记录
        task_id = None
        if self.storage:
            try:
                task_id = self.storage.create_task(
                    str(self.config.input_path), str(self.config.output_path),
                    self.config.threads,
                )
            except Exception:
                task_id = None

        start_time = time.time()
        completed = 0
        failed = 0
        skipped = 0
        success_count = 0
        total_bytes = 0

        with ThreadPoolExecutor(max_workers=self.config.threads) as executor:
            futures = {executor.submit(self.process_file, f): f for f in audio_files}

            for future in as_completed(futures):
                if self.cancel_event and self.cancel_event.is_set():
                    for pending in futures:
                        pending.cancel()

                file_path = futures[future]
                try:
                    output_path, skipped_file = future.result()
                    if skipped_file:
                        skipped += 1
                        self._record_song(task_id, 'skipped', file_path)
                    elif output_path:
                        completed += 1
                        success_count += 1
                        # 回调成功信息
                        file_info = {
                            'artist': output_path.parent.parent.name,
                            'album': output_path.parent.name,
                            'title': output_path.stem
                        }
                        size = self._file_size(output_path)
                        total_bytes += size
                        self._record_song(task_id, 'success', file_path,
                                          output_path=output_path, info=file_info,
                                          size=size)
                        self.on_success(file_info)
                    else:
                        failed += 1
                        self._record_song(task_id, 'failed', file_path)
                except CancelledError:
                    skipped += 1
                    self._record_song(task_id, 'skipped', file_path)
                except Exception:
                    self.on_log(f"处理失败: {file_path}", "error")
                    traceback.print_exc()
                    failed += 1
                    self._record_song(task_id, 'failed', file_path)

                # 回调进度
                elapsed = time.time() - start_time
                completed_count = completed + failed + skipped
                progress = (completed_count / total_files) * 100

                if completed_count > 0 and elapsed > 0.5:
                    self.on_progress(completed_count, total_files, file_path.name)

                if self.cancel_event and self.cancel_event.is_set():
                    break

        elapsed = time.time() - start_time
        
        summary = {
            'total': total_files,
            'completed': completed,
            'skipped': skipped,
            'failed': failed,
            'success': success_count,
            'elapsed': elapsed
        }
        
        cancelled = bool(self.cancel_event and self.cancel_event.is_set())

        # 持久化：收尾任务记录
        if self.storage and task_id:
            try:
                self.storage.finish_task(
                    task_id,
                    'cancelled' if cancelled else 'completed',
                    total=total_files, success=success_count,
                    skipped=skipped, failed=failed,
                    size_bytes=total_bytes, duration_ms=int(elapsed * 1000),
                )
            except Exception:
                pass

        self.on_log("=" * 40, "info")
        if cancelled:
            self.on_log("处理已取消", "warning")
            return

        self.on_log(f"处理完成！", "success")
        self.on_log(f"  成功: {success_count}", "success")
        self.on_log(f"  跳过: {skipped}", "info")
        self.on_log(f"  失败: {failed}", "error")
        self.on_log(f"  总耗时: {self._format_duration(elapsed)}", "info")


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="通用音乐刮削软件")
    parser.add_argument("input", help="输入文件夹路径")
    parser.add_argument("-o", "--output", help="输出文件夹路径（默认: 与输入同目录）")
    parser.add_argument("-t", "--threads", type=int, default=4, help="线程数（默认: 4）")

    args = parser.parse_args()

    input_path = Path(args.input).expanduser()
    if not input_path.exists():
        print(f"输入路径不存在: {input_path}")
        return

    if args.output:
        output_path = Path(args.output).expanduser()
    else:
        output_path = input_path / "organized"

    print("功能：繁简转换 | 去广告乱码 | 刮削元数据 | 智能整理")
    print("=" * 60)
    print(f"输入: {input_path}")
    print(f"输出: {output_path}")
    print()

    config = AppConfig(input_path=input_path, output_path=output_path, threads=args.threads)

    pipeline = MusicOrganizerPipeline(config)
    pipeline.process()


if __name__ == "__main__":
    main()
