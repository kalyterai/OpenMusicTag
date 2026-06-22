# -*- coding: utf-8 -*-
"""Pipeline 上下文 - 承载共享资源和通用方法"""

import re
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.config import AppConfig


class PipelineContext:
    """Pipeline 上下文 - 每次 process 调用创建新实例（线程安全）"""

    def __init__(self, config: AppConfig, cancel_event: Optional[threading.Event] = None):
        self.config = config
        self.cancel_event = cancel_event
        self.breakout = False  # 控制是否提前终止 pipeline
        # 当前环节产生的人类可读说明，处理完每个环节后由 pipeline 取走
        self.notes: List[Dict[str, Any]] = []

    # ========== 环节日志 ==========

    def note(
        self,
        message: str,
        status: str = "ok",
        changes: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """记录当前环节的执行结果，供详细日志展示。

        - ``message``：人类可读的结果说明（为什么 ok / 为什么没做事）。
        - ``status``：``ok`` / ``warning`` / ``skipped`` / ``failed``。
        - ``changes``：字段变化列表，每项 ``{"field", "before", "after"}``，
          用于在日志中展示「之前 → 现在」。
        """
        self.notes.append({
            "message": message,
            "status": status,
            "changes": list(changes or []),
        })

    def drain_notes(self) -> List[Dict[str, Any]]:
        """取走并清空当前环节累积的说明（pipeline 在每个环节后调用）。"""
        notes = self.notes
        self.notes = []
        return notes

    def is_cancelled(self) -> bool:
        """检查外部是否请求取消"""
        return bool(self.cancel_event and self.cancel_event.is_set())

    def should_continue(self) -> bool:
        """检查是否继续执行后续阶段"""
        return not self.breakout and not self.is_cancelled()

    def stop(self) -> None:
        """停止后续阶段执行"""
        self.breakout = True

    def continue_pipeline(self) -> None:
        """继续执行后续阶段"""
        self.breakout = False

    # ========== 文件名解析 ==========

    def parse_filename(self, filename: str) -> Dict[str, str]:
        """从文件名解析歌手和歌名"""
        name = Path(filename).stem
        patterns = [
            (r"^(.*?)\s*-\s*(.*?)$", "歌手 - 歌名"),
            (r"^\[(.*?)\]\s*(.*?)$", "[歌手]歌名"),
        ]

        for pattern, _ in patterns:
            match = re.match(pattern, name)
            if match:
                return {
                    "artist": match.group(1).strip(),
                    "title": match.group(2).strip(),
                }

        return {"artist": "Unknown Artist", "title": name}

    # ========== 外部服务 ==========

    @property
    def input_path(self) -> Path:
        return self.config.input_path

    @property
    def output_path(self) -> Path:
        return self.config.output_path

    def get_stage_config(self, stage_name: str) -> Dict[str, Any]:
        """获取指定阶段的配置"""
        return self.config.get_stage_config(stage_name)

    def get_supported_formats(self) -> tuple:
        """获取支持的文件格式"""
        return self.config.get_supported_formats()
