# -*- coding: utf-8 -*-
"""音乐整理管道 - 使用配置化动态加载"""

import os
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Optional, Tuple

# 导入所有 Stage 以触发注册
from pipelines.load_stage import LoadStage
from pipelines.extract_tags_stage import ExtractRawTagsStage
from pipelines.clean_tags_stage import CleanRawTagsStage
from pipelines.normalize_artist_stage import NormalizeArtistStage
from pipelines.check_duplicate_stage import CheckDuplicateStage
from pipelines.extract_filename_stage import ExtractFromFilenameStage
from pipelines.scrape_metadata_stage import ScrapeMetadataStage
from pipelines.merge_metadata_stage import MergeMetadataStage
from pipelines.calculate_path_stage import CalculateOutputPathStage
from pipelines.copy_file_stage import CopyFileStage
from pipelines.download_cover_stage import DownloadCoverStage
from pipelines.write_tags_stage import WriteTagsStage
from pipelines.cleanup_stage import CleanupStage

from config import AppConfig, PipelineRegistry
from context import PipelineContext
from models import AudioFile


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

    def __init__(self, config: AppConfig):
        self.config = config
        self.pipeline = self._build_pipeline()

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
        context = PipelineContext(self.config)
        audio_file = AudioFile(path=file_path, ext=file_path.suffix.lower())

        # 依次执行所有阶段
        for stage in self.pipeline:
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

    def process(self) -> None:
        """批量处理音乐文件"""
        supported_formats = self.config.get_supported_formats()

        print(f"扫描目录: {self.config.input_path}")
        print(f"支持格式: {supported_formats}")

        audio_files = []
        for root, _, files in os.walk(self.config.input_path):
            for f in files:
                if f.lower().endswith(supported_formats):
                    audio_files.append(Path(root) / f)

        print(f"找到 {len(audio_files)} 个文件")

        total_files = len(audio_files)
        if total_files == 0:
            print("未找到支持的音乐文件")
            return

        print(f"使用 {self.config.threads} 个线程处理")
        print("=" * 60)

        start_time = time.time()
        completed = 0
        failed = 0
        skipped = 0

        with ThreadPoolExecutor(max_workers=self.config.threads) as executor:
            futures = {executor.submit(self.process_file, f): f for f in audio_files}

            for future in as_completed(futures):
                file_path = futures[future]
                try:
                    output_path, skipped_file = future.result()
                    if skipped_file:
                        skipped += 1
                    elif output_path:
                        completed += 1
                    else:
                        failed += 1
                except Exception:
                    print(f"\n处理失败: {file_path}")
                    traceback.print_exc()
                    failed += 1

                elapsed = time.time() - start_time
                completed_count = completed + failed + skipped
                progress = (completed_count / total_files) * 100

                if completed_count > 0 and elapsed > 1:
                    avg_time = elapsed / completed_count
                    remaining = (total_files - completed_count) * avg_time
                    eta = self._format_duration(remaining)
                    print(f"\r进度: {completed_count}/{total_files} ({progress:.1f}%) | 预计剩余: {eta}", end="", flush=True)

        elapsed = time.time() - start_time
        print()
        print("=" * 60)
        print(f"处理完成！")
        print(f"  成功: {completed}")
        print(f"  跳过: {skipped}")
        print(f"  失败: {failed}")
        print(f"  总耗时: {self._format_duration(elapsed)}")
        if completed > 0:
            print(f"  平均: {self._format_duration(elapsed / (completed + failed))}/文件")


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="极空间 NAS 音乐整理工具")
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