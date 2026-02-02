# -*- coding: utf-8 -*-
"""Pipeline 阶段基类"""

import re
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

import opencc

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


class _TextProcessor:
    """内部文本处理器"""

    def __init__(self):
        self.converter = opencc.OpenCC("tw2s")
        self.ads_patterns = [
            r"www\..*?\.com",
            r"QQ群[：:]?\d+",
            r"微信[：:]?[a-zA-Z0-9_]+",
            r"广告|推广|破解版|纯净版",
            r"请务必|点击|下载|关注",
            r"音乐论坛",
            r"[^\w\s\-_\.\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff♪&]",
        ]

    def convert(self, text: str, is_filename: bool = False) -> str:
        """繁转简 + 去广告"""
        if not text or not isinstance(text, str):
            return ""

        # 1. 繁体转简体
        text = self.converter.convert(text)

        # 2. 移除广告关键词
        for pattern in self.ads_patterns:
            text = re.sub(pattern, "", text)

        # 3. 移除方括号内容
        text = re.sub(r"\[.*?\]", "", text, flags=re.IGNORECASE)

        # 4. 清理特殊字符
        if is_filename:
            text = re.sub(r'[\\/:*?"<>|]', "", text)
            text = re.sub(r"[\x00-\x1F\x7F-\x9F\uA000-\uF8FF\uFE00-\uFE0F]", "", text)
            text = " ".join(text.split())
        else:
            text = re.sub(r"[\x00-\x1F\x7F]", "", text)
            text = " ".join(text.split())

        return text.strip()

    def format_path(self, text: str) -> str:
        """格式化路径：去非法字符"""
        if not text:
            return ""
        text = re.sub(r'[\\/:*?"<>|]', "", text)
        text = re.sub(r"[\x00-\x1F\x7F-\x9F\uA000-\uF8FF\uFE00-\uFE0F]", "", text)
        return " ".join(text.split()).strip()


class PipelineStage(ABC):
    """管道阶段抽象基类"""

    NAME: str = "PipelineStage"

    def __init__(self):
        """构造函数不接受 context"""
        self.text_processor = _TextProcessor()
        self._initialize()

    def _initialize(self) -> None:
        """子类可重写的初始化逻辑"""
        pass

    # ========== 文本处理 ==========

    def clean_text(self, text: str, is_filename: bool = False) -> str:
        """清理文本：繁简转换 + 去广告乱码"""
        return self.text_processor.convert(text, is_filename)

    def format_path(self, text: str) -> str:
        """格式化路径：去非法字符"""
        return self.text_processor.format_path(text)

    def normalize_artist(self, name: str) -> str:
        """标准化艺人名称"""
        if not name:
            return "Unknown Artist"

        # 处理带 & 的多人合唱
        if " & " in name:
            artists = name.split(" & ")
            normalized = [self._normalize_single(a.strip()) for a in artists]
            return " & ".join(normalized)

        return self._normalize_single(name)

    def _normalize_single(self, name: str) -> str:
        """标准化单个艺人名称"""
        if not name:
            return "Unknown Artist"

        original = name

        # 去掉 G.E.M. 前缀
        gem_patterns = [
            r"^G\.E\.M\.?[\s\-_.：:]*",
            r"[\s\-_.：:]*G\.E\.M\.?$",
            r"[\s\-_.]*G\.E\.M\.?[\s\-_.]*[\(\（].*?[\)\）]",
            r"[\(\（]\s*G\.E\.M\.?\s*[\)\）]",
        ]
        for pattern in gem_patterns:
            name = re.sub(pattern, "", name, flags=re.IGNORECASE)

        # 处理 "英文名/中文名" 格式
        if "/" in name:
            for part in name.split("/"):
                if any("\u4e00" <= ch <= "\u9fff" for ch in part):
                    name = part
                    break

        # 处理 "英文名 - 中文名" 格式
        elif " - " in name and any("\u4e00" <= ch <= "\u9fff" for ch in name):
            for part in name.split(" - "):
                if any("\u4e00" <= ch <= "\u9fff" for ch in part):
                    name = part
                    break

        # 处理 "英文名:中文名" 格式
        elif ":" in name:
            for part in name.split(":"):
                if any("\u4e00" <= ch <= "\u9fff" for ch in part):
                    name = part
                    break

        # 如果还是没有中文，提取中文部分
        if not any("\u4e00" <= ch <= "\u9fff" for ch in name) and any(
            "\u4e00" <= ch <= "\u9fff" for ch in original
        ):
            chinese_parts = re.findall(r"[\u4e00-\u9fff]+", name)
            if chinese_parts:
                name = " ".join(chinese_parts)

        result = name.strip(" .-_()（）[]【】:：")
        # 去除私人使用区字符
        result = re.sub(r"[\uE000-\uF8FF\uFE00-\uFE0F]", "", result)
        result = re.sub(r"[\x00-\x1F\x7F]", "", result)
        return result if result else ""

    def cleanup_album(self, album: str) -> str:
        """清理专辑名称中的特殊字符"""
        if not album:
            return album
        album = re.sub(r"[\x00-\x1F\x7F-\x9F\uA000-\uF8FF\uFE00-\uFE0F]", "", album)
        return album.strip()

    @abstractmethod
    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """处理音频文件，返回处理后的对象"""
        pass

    @classmethod
    def register(cls, name: str = None):
        """注册到全局注册表"""
        if name is None:
            name = cls.NAME
        from config import PipelineRegistry
        return PipelineRegistry.register(name)
