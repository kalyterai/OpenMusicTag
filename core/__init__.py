# -*- coding: utf-8 -*-
"""OpenMusicTag 核心引擎包

包含 Pipeline 架构的全部核心模块：
- base:      PipelineStage 抽象基类
- config:    AppConfig 配置 + PipelineRegistry 注册表
- context:   PipelineContext 运行时上下文
- models:    AudioFile 数据模型
- pipeline:  MusicOrganizerPipeline 调度器
- pipelines: 各处理阶段（*_stage）
"""
