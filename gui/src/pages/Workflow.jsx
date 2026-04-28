import React, { useState, useEffect } from 'react';
import useAppStore from '../stores/appStore';
import { useQtBridge } from '../bridge';

// SVG Icons
const Icons = {
  Folder: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Image: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Language: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

// 步骤指示器
function StepIndicator({ currentStep }) {
  const steps = [
    { id: 1, title: '选择目录', description: '选择输入和输出目录' },
    { id: 2, title: '确认参数', description: '配置处理参数' },
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
              currentStep >= step.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {currentStep > step.id ? <Icons.Check /> : step.id}
            </div>
            <div className="mt-2 text-center">
              <div className={`text-sm font-medium ${
                currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.title}
              </div>
              <div className="text-xs text-gray-400 mt-1">{step.description}</div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-4 ${
              currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// 参数开关组件
function ParameterSwitch({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex-1">
        <h4 className="font-medium text-neutral-900 mb-1">{title}</h4>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
}

export default function Workflow({ bridgeReady }) {
  const { 
    workflowStep, 
    setWorkflowStep, 
    updateWorkflowConfig, 
    setCurrentPage,
    resetWorkflow,
    setTaskStatus,
    addHistory
  } = useAppStore();
  const workflowConfig = useWorkflowConfig();
  const { selectDirectory, startProcess } = useQtBridge();
  const [localConfig, setLocalConfig] = useState(workflowConfig);
  const [isProcessing, setIsProcessing] = useState(false);

  // 当全局配置改变时更新本地配置
  useEffect(() => {
    setLocalConfig(workflowConfig);
  }, [workflowConfig]);

  const handleSelectInput = async () => {
    const path = await selectDirectory(localConfig.inputPath);
    if (path) {
      const newConfig = { ...localConfig, inputPath: path };
      setLocalConfig(newConfig);
      updateWorkflowConfig({ inputPath: path });
    }
  };

  const handleSelectOutput = async () => {
    const path = await selectDirectory(localConfig.outputPath);
    if (path) {
      const newConfig = { ...localConfig, outputPath: path };
      setLocalConfig(newConfig);
      updateWorkflowConfig({ outputPath: path });
    }
  };

  const handleNextStep = () => {
    if (workflowStep === 1 && localConfig.inputPath && localConfig.outputPath) {
      updateWorkflowConfig(localConfig);
      setWorkflowStep(2);
    }
  };

  const handlePreviousStep = () => {
    setWorkflowStep(1);
  };

  const handleStartProcessing = async () => {
    if (!localConfig.inputPath || !localConfig.outputPath) {
      return;
    }

    setIsProcessing(true);
    setTaskStatus('processing');

    try {
      // 开始处理
      await startProcess(localConfig.inputPath, localConfig.outputPath, localConfig.threads);
      
      // 记录历史
      addHistory({
        title: '音乐整理任务',
        status: 'processing',
        count: 0, // 将在处理过程中更新
        config: localConfig,
      });

      // 跳转到进度页面
      setCurrentPage('progress');
    } catch (error) {
      console.error('处理失败:', error);
      setTaskStatus('error');
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    resetWorkflow();
    setCurrentPage('home');
  };

  // 更新配置参数
  const handleConfigChange = (key, value) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
  };

  return (
    <div className="p-8 animate-fadeIn max-w-4xl mx-auto">
      {/* 标题 */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">音乐整理工作流</h1>
        <p className="text-neutral-500">按照步骤配置，开始整理您的音乐库</p>
      </div>

      {/* 步骤指示器 */}
      <StepIndicator currentStep={workflowStep} />

      {/* 步骤内容 */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8">
        {workflowStep === 1 ? (
          // 第一步：选择目录
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">选择目录</h3>
              <p className="text-neutral-500 mb-6">请选择要处理的音乐文件目录和输出目录</p>
            </div>

            {/* 输入目录 */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                输入目录（音乐源文件）
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localConfig.inputPath}
                  onChange={(e) => handleConfigChange('inputPath', e.target.value)}
                  placeholder="选择包含音乐文件的目录"
                  className="input flex-1"
                />
                <button
                  onClick={handleSelectInput}
                  disabled={isProcessing}
                  className="btn btn-secondary whitespace-nowrap flex items-center gap-2"
                >
                  <Icons.Folder />
                  选择
                </button>
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                支持格式：MP3, FLAC, M4A, APE, OGG, WAV
              </p>
            </div>

            {/* 输出目录 */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                输出目录（整理后的文件）
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localConfig.outputPath}
                  onChange={(e) => handleConfigChange('outputPath', e.target.value)}
                  placeholder="选择输出目录"
                  className="input flex-1"
                />
                <button
                  onClick={handleSelectOutput}
                  disabled={isProcessing}
                  className="btn btn-secondary whitespace-nowrap flex items-center gap-2"
                >
                  <Icons.Folder />
                  选择
                </button>
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                整理后的文件将按「歌手/专辑」结构存放
              </p>
            </div>

            {/* 线程数 */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                处理线程数
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="16"
                  value={localConfig.threads}
                  onChange={(e) => handleConfigChange('threads', parseInt(e.target.value))}
                  disabled={isProcessing}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-sm font-medium text-neutral-700 min-w-[3rem]">
                  {localConfig.threads}
                </span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400 mt-1">
                <span>1</span>
                <span>8</span>
                <span>16</span>
              </div>
            </div>
          </div>
        ) : (
          // 第二步：确认参数
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">确认参数</h3>
              <p className="text-neutral-500 mb-6">确认处理参数，开始整理您的音乐库</p>
            </div>

            {/* 目录预览 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-neutral-900 mb-3">目录设置</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-500">输入目录：</span>
                  <span className="text-neutral-900 ml-2">{localConfig.inputPath}</span>
                </div>
                <div>
                  <span className="text-neutral-500">输出目录：</span>
                  <span className="text-neutral-900 ml-2">{localConfig.outputPath}</span>
                </div>
                <div>
                  <span className="text-neutral-500">处理线程：</span>
                  <span className="text-neutral-900 ml-2">{localConfig.threads} 个</span>
                </div>
              </div>
            </div>

            {/* 处理选项 */}
            <div className="space-y-4">
              <ParameterSwitch
                title="下载专辑封面"
                description="自动从网络下载高清专辑封面并嵌入到音乐文件中"
                checked={localConfig.enableCoverDownload}
                onChange={(e) => handleConfigChange('enableCoverDownload', e.target.checked)}
              />
              <ParameterSwitch
                title="繁简转换"
                description="将台湾/香港繁体歌词转换为大陆简体"
                checked={localConfig.enableSimplifiedChinese}
                onChange={(e) => handleConfigChange('enableSimplifiedChinese', e.target.checked)}
              />
              <ParameterSwitch
                title="重复检测"
                description="跳过已处理的重复文件，避免重复整理"
                checked={localConfig.enableDuplicateCheck}
                onChange={(e) => handleConfigChange('enableDuplicateCheck', e.target.checked)}
              />
              <ParameterSwitch
                title="元数据刮削"
                description="从 MusicBrainz 数据库获取最准确的歌曲信息"
                checked={localConfig.enableMetadataScrape}
                onChange={(e) => handleConfigChange('enableMetadataScrape', e.target.checked)}
              />
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-between pt-6 border-t border-neutral-100">
          <div>
            {workflowStep > 1 && (
              <button
                onClick={handlePreviousStep}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Icons.ArrowLeft />
                上一步
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="btn bg-gray-500 hover:bg-gray-600 text-white"
            >
              取消
            </button>
            {workflowStep === 1 ? (
              <button
                onClick={handleNextStep}
                disabled={!localConfig.inputPath || !localConfig.outputPath || isProcessing}
                className="btn btn-primary flex items-center gap-2"
              >
                下一步 <Icons.ArrowRight />
              </button>
            ) : (
              <button
                onClick={handleStartProcessing}
                disabled={isProcessing}
                className="btn btn-primary flex items-center gap-2"
              >
                {isProcessing ? '准备中...' : '开始处理'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}