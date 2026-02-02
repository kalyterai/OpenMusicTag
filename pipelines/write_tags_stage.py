# -*- coding: utf-8 -*-
"""阶段12：写入标签"""

import traceback
from pathlib import Path
from typing import TYPE_CHECKING, Optional

from mutagen.apev2 import APEv2
from mutagen.flac import FLAC, Picture
from mutagen.id3 import (
    APIC,
    COMM,
    TALB,
    TCOM,
    TCON,
    TDRC,
    TIT2,
    TPE1,
    TPE2,
)
from mutagen.mp3 import MP3
from mutagen.wave import WAVE

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


@PipelineStage.register("WriteTagsStage")
class WriteTagsStage(PipelineStage):
    """阶段12：写入标签"""

    NAME = "写入标签"

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """写入元数据标签"""
        if not audio_file.output_path:
            return audio_file

        path = audio_file.output_path
        ext = path.suffix.lower()
        meta = audio_file.final_metadata
        cover_path = audio_file.scraped.get("_cover_path")

        try:
            if ext == ".mp3":
                self._write_mp3_tags(path, meta, cover_path, context)
            elif ext == ".flac":
                self._write_flac_tags(path, meta, cover_path, context)
            elif ext == ".wav":
                self._write_wav_tags(path, meta, cover_path, context)
            print("  ✓ 标签写入成功")
        except Exception:
            print(f"  ✗ 写入标签失败: {traceback.format_exc()}")

        return audio_file

    def _write_mp3_tags(self, path: Path, meta: dict, cover_path: Optional[Path], context):
        audio = MP3(path)
        if audio.tags is None:
            audio.add_tags()

        tags = audio.tags

        # 清理所有评论相关字段、copyright 和封面
        for frame_id in list(tags.keys()):
            if (
                frame_id.startswith("COMM")
                or frame_id.startswith("USLT")
                or frame_id.startswith("TXXX")
                or frame_id == "TCOP"
                or frame_id == "APIC"
            ):
                del tags[frame_id]

        # 写入标签
        if meta.get("title"):
            tags["TIT2"] = TIT2(encoding=3, text=meta["title"])
        elif "TIT2" in tags:
            del tags["TIT2"]

        if meta.get("artist"):
            tags["TPE1"] = TPE1(encoding=3, text=meta["artist"])
        elif "TPE1" in tags:
            del tags["TPE1"]

        if meta.get("album"):
            tags["TALB"] = TALB(encoding=3, text=meta["album"])
        elif "TALB" in tags:
            del tags["TALB"]

        if meta.get("year"):
            tags["TDRC"] = TDRC(encoding=3, text=meta["year"])
        elif "TDRC" in tags:
            del tags["TDRC"]

        if meta.get("composer"):
            tags["TCOM"] = TCOM(encoding=3, text=meta["composer"])
        elif "TCOM" in tags:
            del tags["TCOM"]

        if meta.get("genre"):
            tags["TCON"] = TCON(encoding=3, text=meta["genre"])
        elif "TCON" in tags:
            del tags["TCON"]

        if meta.get("albumartist"):
            tags["TPE2"] = TPE2(encoding=3, text=meta["albumartist"])
        elif "TPE2" in tags:
            del tags["TPE2"]

        if meta.get("description"):
            tags["COMM"] = COMM(
                encoding=3,
                lang="eng",
                desc="Description",
                text=self.clean_text(meta["description"]),
            )

        if cover_path and Path(cover_path).exists():
            with open(cover_path, "rb") as f:
                img_data = f.read()
            tags["APIC"] = APIC(
                encoding=3, mime="image/jpeg", type=3, desc="Cover", data=img_data
            )

        audio.save()

    def _write_flac_tags(self, path: Path, meta: dict, cover_path: Optional[Path], context):
        audio = FLAC(path)

        for field in ["COMMENT", "DESCRIPTION", "LYRICS", "NOTES", "COPYRIGHT"]:
            if field in audio:
                try:
                    del audio[field]
                except KeyError:
                    pass

        if meta.get("title"):
            audio["TITLE"] = self.clean_text(meta["title"])
        elif "TITLE" in audio:
            del audio["TITLE"]

        if meta.get("artist"):
            audio["ARTIST"] = self.clean_text(meta["artist"])
        elif "ARTIST" in audio:
            del audio["ARTIST"]

        if meta.get("album"):
            audio["ALBUM"] = self.clean_text(meta["album"])
        elif "ALBUM" in audio:
            del audio["ALBUM"]

        if meta.get("year"):
            audio["DATE"] = meta["year"]
        elif "DATE" in audio:
            del audio["DATE"]

        if meta.get("composer"):
            audio["COMPOSER"] = self.clean_text(meta["composer"])
        elif "COMPOSER" in audio:
            del audio["COMPOSER"]

        if meta.get("genre"):
            audio["GENRE"] = self.clean_text(meta["genre"])
        elif "GENRE" in audio:
            del audio["GENRE"]

        if meta.get("albumartist"):
            audio["ALBUMARTIST"] = self.clean_text(meta["albumartist"])
        elif "ALBUMARTIST" in audio:
            del audio["ALBUMARTIST"]

        if meta.get("description"):
            audio["DESCRIPTION"] = self.clean_text(meta["description"])

        if cover_path and Path(cover_path).exists():
            with open(cover_path, "rb") as f:
                img_data = f.read()
            audio.clear_pictures()
            pic = Picture()
            pic.data = img_data
            pic.type = 3
            pic.mime = "image/jpeg"
            audio.add_picture(pic)

        audio.save()

    def _write_wav_tags(self, path: Path, meta: dict, cover_path: Optional[Path], context):
        audio = WAVE(path)
        if audio.tags is None:
            audio.add_tags()

        tags = audio.tags

        for frame_id in list(tags.keys()):
            if (
                frame_id.startswith("COMM")
                or frame_id.startswith("USLT")
                or frame_id.startswith("TXXX")
                or frame_id == "TCOP"
                or frame_id == "APIC"
            ):
                del tags[frame_id]

        if meta.get("title"):
            tags["TIT2"] = TIT2(encoding=3, text=meta["title"])
        elif "TIT2" in tags:
            del tags["TIT2"]

        if meta.get("artist"):
            tags["TPE1"] = TPE1(encoding=3, text=meta["artist"])
        elif "TPE1" in tags:
            del tags["TPE1"]

        if meta.get("album"):
            tags["TALB"] = TALB(encoding=3, text=meta["album"])
        elif "TALB" in tags:
            del tags["TALB"]

        if meta.get("year"):
            tags["TDRC"] = TDRC(encoding=3, text=meta["year"])
        elif "TDRC" in tags:
            del tags["TDRC"]

        if meta.get("composer"):
            tags["TCOM"] = TCOM(encoding=3, text=meta["composer"])
        elif "TCOM" in tags:
            del tags["TCOM"]

        if meta.get("genre"):
            tags["TCON"] = TCON(encoding=3, text=meta["genre"])
        elif "TCON" in tags:
            del tags["TCON"]

        if meta.get("albumartist"):
            tags["TPE2"] = TPE2(encoding=3, text=meta["albumartist"])
        elif "TPE2" in tags:
            del tags["TPE2"]

        if meta.get("description"):
            tags["COMM"] = COMM(
                encoding=3,
                lang="eng",
                desc="Description",
                text=self.clean_text(meta["description"]),
            )

        audio.save()