# -*- coding: utf-8 -*-
"""Pipeline 配置类 - 支持配置化动态加载"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Type


class AppConfig:
    """Pipeline 应用配置"""

    def __init__(
        self,
        input_path: Path,
        output_path: Path,
        threads: int = 4,
        pipeline_order: Optional[List[str]] = None,
        stage_config: Optional[Dict[str, Any]] = None,
    ):
        self.input_path = Path(input_path)
        self.output_path = Path(output_path)
        self.threads = threads
        # Pipeline 执行顺序
        self.pipeline_order = pipeline_order or self._default_order()
        # 各阶段配置
        self.stage_config = stage_config or {}

    @staticmethod
    def _default_order() -> List[str]:
        """默认 Pipeline 执行顺序"""
        return [
            "LoadStage",
            "ExtractRawTagsStage",
            "CleanRawTagsStage",
            "NormalizeArtistStage",
            "CheckDuplicateStage",
            "ExtractFromFilenameStage",
            "ScrapeMetadataStage",
            "MergeMetadataStage",
            "CalculateOutputPathStage",
            "CopyFileStage",
            "DownloadCoverStage",
            "WriteTagsStage",
            "CleanupStage",
        ]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AppConfig":
        """从字典加载配置"""
        return cls(
            input_path=Path(data["input_path"]),
            output_path=Path(data["output_path"]),
            threads=data.get("threads", 4),
            pipeline_order=data.get("pipeline_order"),
            stage_config=data.get("stage_config", {}),
        )

    @classmethod
    def from_json(cls, json_path: Path) -> "AppConfig":
        """从 JSON 文件加载配置"""
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)

    def to_dict(self) -> Dict[str, Any]:
        """导出为字典"""
        return {
            "input_path": str(self.input_path),
            "output_path": str(self.output_path),
            "threads": self.threads,
            "pipeline_order": self.pipeline_order,
            "stage_config": self.stage_config,
        }

    def to_json(self, json_path: Path) -> None:
        """导出为 JSON 文件"""
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

    def get_stage_config(self, stage_name: str) -> Dict[str, Any]:
        """获取指定阶段的配置"""
        return self.stage_config.get(stage_name, {})

    def update_stage_config(self, stage_name: str, config: Dict[str, Any]) -> None:
        """更新指定阶段的配置"""
        self.stage_config[stage_name] = config

    def get_supported_formats(self) -> tuple:
        """获取支持的文件格式（用于高层抽象）"""
        load_config = self.get_stage_config("LoadStage")
        formats = load_config.get("supported_formats", 
            [".mp3", ".flac", ".m4a", ".ape", ".ogg", ".wav"])
        return tuple(f.lower() for f in formats)


class PipelineRegistry:
    """Pipeline Stage 注册表 - 支持动态加载"""

    _registry: Dict[str, Type] = {}

    @classmethod
    def register(cls, name: str):
        """注册 Pipeline Stage"""
        def decorator(stage_class):
            cls._registry[name] = stage_class
            return stage_class
        return decorator

    @classmethod
    def get(cls, name: str) -> Optional[Type]:
        """根据名称获取 Stage 类"""
        return cls._registry.get(name)

    @classmethod
    def list_all(cls) -> List[str]:
        """列出所有已注册的 Stage"""
        return list(cls._registry.keys())

    @classmethod
    def create_stage(cls, name: str):
        """根据名称创建 Stage 实例（不依赖 context）"""
        stage_class = cls.get(name)
        if not stage_class:
            raise ValueError(f"未注册的 Pipeline Stage: {name}")
        return stage_class()

    @classmethod
    def clear(cls) -> None:
        """清空注册表"""
        cls._registry.clear()


# 默认配置生成器
def generate_default_config(input_path: str, output_path: str, config_path: str = "pipeline_config.json") -> str:
    """生成默认配置文件"""
    config = {
        "input_path": input_path,
        "output_path": output_path,
        "threads": 4,
        "pipeline_order": AppConfig._default_order(),
        "stage_config": {
            "LoadStage": {
                "supported_formats": [".mp3", ".flac", ".m4a", ".ape", ".ogg", ".wav"]
            },
            "ScrapeMetadataStage": {
                "live_keywords": ["演唱会", "演唱會", "concert", "tour", "live", "巡回", "巡迴", "现场", "現場"],
                "edition_keywords": ["珍藏版", "精选", "精選", "special", "edition", "remaster", "deluxe"],
                "confidence_threshold": 80
            },
            "DownloadCoverStage": {
                "timeout": 10,
                "quality": 90
            }
        }
    }
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    
    return config_path