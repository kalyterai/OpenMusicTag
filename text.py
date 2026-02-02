# -*- coding: utf-8 -*-
"""文本处理器 - 繁简转换和广告清理"""

import re
from typing import Optional

import opencc


class TraditionalToSimplified:
    """繁简转换器 - 职责：繁体转简体"""

    def __init__(self):
        self.converter = opencc.OpenCC("tw2s")

    def convert(self, text: str) -> str:
        """繁体转简体"""
        if not text or not isinstance(text, str):
            return ""
        return self.converter.convert(text)


class AdsCleaner:
    """广告清理器 - 职责：移除广告和乱码"""

    def __init__(self):
        self.ads_patterns = [
            r"www\..*?\.com",
            r"WWW\..*?\.COM",
            r"QQ群[：:]?\d+",
            r"微信[：:]?[a-zA-Z0-9_]+",
            r"广告|推广|破解版|绿色版|纯净版",
            r"请务必|点击|下载|关注",
            r"音乐论坛",
            # 白名单：字母、数字、中文、日文、常用符号（保留 & 用于多人合唱）
            r"[^\w\s\-_\.\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff♪&]",
        ]

    def clean(self, text: str, is_filename: bool = False) -> str:
        """移除广告和乱码"""
        if not text or not isinstance(text, str):
            return ""

        # 1. 移除广告关键词
        for pattern in self.ads_patterns:
            text = re.sub(pattern, "", text)

        # 2. 移除方括号内容
        text = re.sub(r"\[.*?\]", "", text, flags=re.IGNORECASE)

        # 3. 清理特殊字符
        if is_filename:
            # 移除所有非 ASCII 字符和非法文件名字符
            text = re.sub(r'[\\/:*?"<>|]', "", text)
            # 移除控制字符、私有使用区字符、特殊符号
            text = re.sub(r"[\x00-\x1F\x7F-\x9F\uA000-\uF8FF\uFE00-\uFE0F]", "", text)
            text = " ".join(text.split())
        else:
            text = re.sub(r"[\x00-\x1F\x7F]", "", text)
            text = " ".join(text.split())

        return text.strip()


class TextProcessor:
    """文本处理器组合 - 组合繁简转换和广告清理"""

    def __init__(self):
        self.t2s = TraditionalToSimplified()
        self.ads_cleaner = AdsCleaner()

    def convert(self, text: str, is_filename: bool = False) -> str:
        """繁转简 + 去广告"""
        if not text or not isinstance(text, str):
            return ""

        # 1. 繁体转简体
        text = self.t2s.convert(text)

        # 2. 移除广告和乱码
        text = self.ads_cleaner.clean(text, is_filename)

        return text