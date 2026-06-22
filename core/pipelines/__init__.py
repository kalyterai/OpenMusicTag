# pipelines - 音乐整理管道阶段模块（已重构）
# 阶段文件保留在此目录，以 _stage.py 结尾
from core.pipelines.load_stage import LoadStage
from core.pipelines.extract_tags_stage import ExtractRawTagsStage
from core.pipelines.clean_tags_stage import CleanRawTagsStage
from core.pipelines.normalize_artist_stage import NormalizeArtistStage
from core.pipelines.check_duplicate_stage import CheckDuplicateStage
from core.pipelines.extract_filename_stage import ExtractFromFilenameStage
from core.pipelines.scrape_metadata_stage import ScrapeMetadataStage, MusicBrainzClient
from core.pipelines.merge_metadata_stage import MergeMetadataStage
from core.pipelines.calculate_path_stage import CalculateOutputPathStage
from core.pipelines.copy_file_stage import CopyFileStage
from core.pipelines.download_cover_stage import DownloadCoverStage, CoverDownloader
from core.pipelines.write_tags_stage import WriteTagsStage
from core.pipelines.cleanup_stage import CleanupStage
