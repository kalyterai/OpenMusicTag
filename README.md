<div align="center">
  <!-- 建议在此处放置一个好看的 Logo -->
  <h1>🎵 OpenMusicTag</h1>
  <img src="./gui/src/assets/logo.png">

  <p>
    <strong>一款强大、优雅、跨平台的开源本地音乐刮削与标签整理工具</strong>
  </p>

  <p>
    <a href="https://github.com/kalyterai/OpenMusicTag/stargazers"><img src="https://img.shields.io/github/stars/kalyterai/OpenMusicTag?style=for-the-badge&color=f1c40f&logo=github" alt="Stars"></a>
    <a href="https://github.com/kalyterai/OpenMusicTag/network/members"><img src="https://img.shields.io/github/forks/kalyterai/OpenMusicTag?style=for-the-badge&color=3498db&logo=github" alt="Forks"></a>
    <a href="https://github.com/kalyterai/OpenMusicTag/releases"><img src="https://img.shields.io/github/v/release/kalyterai/OpenMusicTag?style=for-the-badge&color=2ecc71" alt="Release"></a>
    <a href="https://github.com/kalyterai/OpenMusicTag/blob/main/LICENSE"><img src="https://img.shields.io/github/license/kalyterai/OpenMusicTag?style=for-the-badge&color=9b59b6" alt="License"></a>
  </p>

  <h3>
    <a href="#-核心特性">核心特性</a>
    <span> | </span>
    <a href="#-快速开始">快速开始</a>
    <span> | </span>
    <a href="#-界面预览">界面预览</a>
    <span> | </span>
    <a href="#-贡献指南">贡献指南</a>
  </h3>
</div>

<br/>

> **💡 致访客：**  
> 如果这个项目拯救了你杂乱无章的本地音乐库，**请在右上角点亮一颗 ⭐ Star！**  
> 你的支持是我们持续维护和加入新功能的最大动力。

---

## 📖 什么是 OpenMusicTag？

随着流媒体版权的碎片化，越来越多的音乐爱好者选择回归本地播放。然而，从各处下载的本地音乐往往面临着**标签缺失、乱码、没有专辑封面和歌词**的窘境。

**OpenMusicTag** 致力于成为你本地音乐库的“终极管家”。它能自动识别音频文件，从海量互联网音乐数据库中（如网易云、QQ音乐、Spotify 等）精准“刮削”元数据，并将高清封面、内嵌歌词、歌手、专辑等信息**永久写入音频文件本身**。

让你的本地音乐库在任何播放器中，都能展现出完美的视觉与听觉体验！

---

## ✨ 核心特性 (Features)

*   🎯 **多源精准刮削**：内置强大的指纹识别与搜索算法，支持从网易云音乐、QQ音乐、Apple Music、Spotify、MusicBrainz 等多个权威音源获取元数据。
*   🖼️ **高清封面 & 滚动歌词**：自动抓取并内嵌最高分辨率的专辑封面，完美支持双语/多语滚动歌词 (LRC) 嵌入。
*   ⚡ **全自动批量处理**：一键扫描整个目录或硬盘，多线程并发处理，成千上万首歌曲只需喝杯咖啡的时间即可焕然一新。
*   🛠️ **智能重命名与目录整理**：支持根据获取到的标签信息（如 `[艺术家] - [专辑] - [音轨号] [标题]`）自动重命名文件，并可自动将文件归类到对应的歌手/专辑文件夹中。
*   💿 **全格式无损支持**：完美支持 FLAC, APE, WAV, ALAC 等无损格式，以及 MP3, OGG, M4A, AAC 等主流有损格式的标签写入。
*   💻 **跨平台原生体验**：提供 Windows, macOS, Linux 多端版本，界面优雅，开箱即用。

---

## 📸 界面预览 (Screenshots)

*(提示：此处强烈建议放 1-2 张极其精美、前后对比强烈的截图或 GIF 动图，这是转化 Star 的核心！)*

| 刮削前 (乱码/无封面) | 刮削后 (完美标签/高清封面) |
| :---: | :---: |
| <img src="https://via.placeholder.com/400x250?text=Before+Scraping" alt="Before" width="100%"> | <img src="https://via.placeholder.com/400x250?text=After+Scraping" alt="After" width="100%"> |

---

## 🚀 快速开始 (Quick Start)

### 1. 下载与安装

前往 [Releases 页面](https://github.com/kalyterai/OpenMusicTag/releases) 下载适合您操作系统的最新版本：

- **Windows**: 下载 `.exe` 或便携版 `.zip`
- **macOS**: 下载 `.zip` 后解压，移动到应用程序目录下 (支持 Apple Silicon & Intel)
- **Linux**: 提供 AppImage, deb 或 rpm 包

### 2. 基础使用

1. 打开 OpenMusicTag。
2. 将需要处理的音乐文件或整个文件夹**拖拽**至软件窗口。
3. （可选）在设置中勾选您偏好的数据源和刮削选项（如是否覆盖现有封面）。
4. 点击 **“开始刮削”**，等待魔法发生！✨

---

## 路线图 (Roadmap)

- [x] 支持 FLAC, MP3 格式内嵌歌词与封面
- [x] 批量处理与多线程优化
- [] 支持网易云音乐、QQ音乐源
- [ ] 增加 Spotify 和 Apple Music 源 (开发中 🚧)
- [ ] 支持按标签自动归档整理文件夹
- [ ] 开放插件系统，支持社区自定义音源

---

## 🤝 参与贡献 (Contributing)

我们非常欢迎任何形式的贡献！无论是一个小小的错别字修复、一个新的特性提议，还是核心代码的提交。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送至分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

---

## 📈 Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=kalyterai/OpenMusicTag&type=Date)](https://star-history.com/#kalyterai/OpenMusicTag&Date)

---

## 📄 许可证 (License)

本项目基于 [MIT License](LICENSE) 协议开源。请自由使用、修改和分发，但请保留原作者的版权声明。

---
<div align="center">
  <b>如果觉得好用，别忘了分享给同样热爱本地音乐的朋友们！</b><br>
  👇👇👇<br>
  ⭐ <b>求 Star，求 Fork！</b> ⭐
</div>
