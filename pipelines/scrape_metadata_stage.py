# -*- coding: utf-8 -*-
"""阶段7：从 MusicBrainz 刮削元数据"""

import musicbrainzngs
from typing import TYPE_CHECKING, Dict, Optional, Any

from base import PipelineStage

if TYPE_CHECKING:
    from context import PipelineContext
    from models import AudioFile


class MusicBrainzClient:
    """MusicBrainz 客户端"""

    def __init__(self):
        musicbrainzngs.set_useragent("MusicOrganizer", "1.0", "user@localhost")

    def search(self, title: str, artist: str) -> Dict[str, Any]:
        """搜索歌曲元数据"""
        try:
            result = musicbrainzngs.search_recordings(
                recording=title, artist=artist, limit=5
            )
            return result if result.get("recording-list") else {}
        except Exception as e:
            print(f"  ⚠ MusicBrainz 搜索失败: {e}")
            return {}

    def search_with_album(self, title: str, artist: str, album: str) -> Dict[str, Any]:
        """用 album 辅助搜索歌曲元数据（更准确）"""
        try:
            release_result = musicbrainzngs.search_releases(
                release=album, artist=artist, limit=10
            )
            if not release_result.get("release-list"):
                return {}

            official_releases = [
                r for r in release_result["release-list"] if r.get("status") == "Official"
            ]
            sorted_releases = official_releases or release_result["release-list"]

            for release in sorted_releases:
                release_id = release["id"]
                try:
                    release_data = musicbrainzngs.get_release_by_id(
                        release_id, includes=["recordings", "release-groups"]
                    )
                except TypeError:
                    release_data = musicbrainzngs.get_release_by_id(
                        release_id, inc=["recordings", "release-groups"]
                    )

                if "release" in release_data:
                    media_list = release_data["release"].get("medium-list", [])
                    for media in media_list:
                        track_list = media.get("track-list", [])
                        for track in track_list:
                            recording = track.get("recording", {})
                            rec_title = recording.get("title", "").lower()
                            if title.lower() in rec_title or rec_title in title.lower():
                                return {"recording-list": [recording]}
            return {}
        except Exception as e:
            print(f"  ⚠ MusicBrainz 带专辑搜索失败: {e}")
            return {}

    def get_cover_art(self, release_id: str) -> Optional[str]:
        """获取专辑封面"""
        try:
            cover_art = musicbrainzngs.get_image_list(release_id)
            if "images" in cover_art:
                for img in cover_art["images"]:
                    if img.get("front", False):
                        return img.get("thumbnails", {}).get("large") or img.get("image")
        except:
            pass
        return None


@PipelineStage.register("ScrapeMetadataStage")
class ScrapeMetadataStage(PipelineStage):
    """阶段7：从 MusicBrainz 刮削元数据"""

    NAME = "MusicBrainz刮削"

    def _initialize(self):
        self.client = MusicBrainzClient()
        self.live_keywords = set([
            "演唱会", "演唱會", "concert", "tour", "live", "巡回", "巡迴", "现场", "現場",
            "电影原声", "電影原聲", "soundtrack", "ost", "原声大碟", "原聲大碟"
        ])
        self.edition_keywords = set([
            "珍藏版", "精选", "精選", "special", "edition", "remaster", "deluxe"
        ])

    def _is_official_title(self, title: str) -> bool:
        """判断是否是官方正式版标题（不在 live_keywords 也不在 edition_keywords 中）"""
        title_lower = title.lower()
        if any(kw.lower() in title_lower for kw in self.live_keywords):
            return False
        if any(kw.lower() in title_lower for kw in self.edition_keywords):
            return False
        return True

    def process(self, audio_file: "AudioFile", context: "PipelineContext") -> "AudioFile":
        """刮削元数据"""
        tags = audio_file.raw_tags
        title = tags.get("title", "")
        artist = tags.get("artist", "")
        original_album = tags.get("album", "").strip()

        if not title or not artist:
            return audio_file

        print(f"  正在刮削: {artist} - {title}")

        # 判断是否是官方正式版专辑
        is_official_album = self._is_official_title(original_album)

        # 1. 优先：使用 album 搜索
        if original_album and is_official_album:
            result = self.client.search_with_album(title, artist, original_album)
            if result:
                release = self._select_best_release(result)
                scraped = self._build_scraped(result, release)
                audio_file.scraped = scraped
                return audio_file

        # 2. 降级：用 title + artist 搜索
        result = self.client.search(title, artist)

        if not result or "recording-list" not in result:
            return audio_file

        recordings = result["recording-list"]

        # 选择第一个官方正式版的 recording
        for rec in recordings:
            rec_album = self._get_album(rec) or ""
            if self._is_official_title(rec_album):
                release = self._select_best_release(rec)
                scraped = self._build_scraped(rec, release)
                audio_file.scraped = scraped
                return audio_file

        # 如果全是演唱会版本，返回第一个
        release = self._select_best_release(recordings[0])
        scraped = self._build_scraped(recordings[0], release)
        audio_file.scraped = scraped
        return audio_file

    def _build_scraped(self, recording: Dict, release: Optional[Dict] = None) -> Dict:
        """构建刮削数据"""
        return {
            "title": self._get_text(recording, "title"),
            "artist": self._get_artist(recording),
            "album": self._get_album_from_release(release),
            "year": self._get_year_from_release(release),
            "genre": self._get_genre_from_release(release),
            "composer": self._get_composer(recording),
            "description": "",
            "cover_url": self._get_cover_url_from_release(release),
            "confidence": int(recording.get("ext:score", 0)),
        }

    def _is_official_release(self, release: Dict) -> bool:
        """判断是否是官方正式版"""
        if not release:
            return False
        if release.get("status") != "Official":
            return False

        title = release.get("title", "")
        return self._is_official_title(title)

    def _select_best_release(self, recording: Dict) -> Optional[Dict]:
        """选择最佳匹配的发行版"""
        if "release-list" not in recording or not recording["release-list"]:
            return None

        releases = recording["release-list"]
        official_releases = [r for r in releases if self._is_official_release(r)]

        if official_releases:
            for release in official_releases:
                if release.get("date"):
                    return release
            return official_releases[0]

        for release in releases:
            if release.get("date"):
                return release

        return releases[0] if releases else None

    def _get_album_from_release(self, release: Optional[Dict]) -> str:
        return self.clean_text(release.get("title", "")) if release else ""

    def _get_year_from_release(self, release: Optional[Dict]) -> str:
        if not release:
            return ""
        date = release.get("date", "")
        return date[:4] if date and len(date) >= 4 else ""

    def _get_genre_from_release(self, release: Optional[Dict]) -> str:
        if not release:
            return ""
        rg = release.get("release-group", {})
        return rg.get("primary-type", "")

    def _get_cover_url_from_release(self, release: Optional[Dict]) -> Optional[str]:
        if not release or "id" not in release:
            return None
        return self.client.get_cover_art(release["id"])

    def _get_text(self, obj: Dict, key: str) -> str:
        return self.clean_text(obj.get(key, ""))

    def _get_artist(self, recording: Dict) -> str:
        if "artist-credit-phrase" in recording:
            phrase = recording["artist-credit-phrase"]
            if " & " in phrase:
                artists = phrase.split(" & ")
                cleaned_artists = [self.clean_text(a.strip()) for a in artists]
                return " & ".join(cleaned_artists)
            return self.clean_text(phrase)

        if "artist-credit" not in recording:
            return ""
        artists = []
        for ac in recording["artist-credit"]:
            if isinstance(ac, dict) and "artist" in ac:
                artists.append(self.clean_text(ac["artist"]["name"]))
        return ", ".join(artists)

    def _get_album(self, recording: Dict) -> str:
        release = self._select_best_release(recording)
        return self.clean_text(release.get("title", "")) if release else ""

    def _get_composer(self, recording: Dict) -> str:
        if "artist-relation-list" not in recording:
            return ""
        for rel in recording["artist-relation-list"]:
            rel_type = rel.get("type", "").lower()
            if "composer" in rel_type:
                return self.clean_text(rel["artist"]["name"])
        return ""
