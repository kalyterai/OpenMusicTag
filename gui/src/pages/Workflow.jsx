import React, { useEffect, useState } from 'react';
import useAppStore, { useWorkflowConfig } from '../stores/appStore';
import { useQtBridge } from '../bridge';

const Icon = ({ children }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const Icons = {
  Folder: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.5 7.5A2.5 2.5 0 016 5h4l2 2h6a2.5 2.5 0 012.5 2.5v7A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5v-9z" />
    </Icon>
  ),
  Arrow: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Back: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Check: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </Icon>
  ),
  Cover: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15l2.6-2.6a1.5 1.5 0 012.1 0L16 15M15 9h.01" />
    </Icon>
  ),
  Text: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h12M8 4v2m2 10c-2.2-1.6-3.8-3.6-4.8-6M18 20l-3-7-3 7M13 17h4" />
    </Icon>
  ),
  Fingerprint: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12a5 5 0 0110 0M4 12a8 8 0 1116 0M9 12c0 4-1.5 6-3 8M12 12c0 4-1 6.5-2.5 8M15 12c0 3 .7 5.5 2.5 8" />
    </Icon>
  ),
  Database: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
    </Icon>
  ),
};

function StepRail({ currentStep }) {
  const steps = [
    { id: 1, title: '选择目录', note: '输入与输出' },
    { id: 2, title: '运行配置', note: '线程与规则' },
    { id: 3, title: '启动前复核', note: '确认写入方式' },
  ];

  return (
    <div className="workflow-rail">
      {steps.map((step) => {
        const active = currentStep === step.id;
        const done = currentStep > step.id;
        return (
          <div
            key={step.id}
            className={`workflow-step ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
          >
            <span className="workflow-step-dot">{step.id}</span>
            <span>
              <span className="workflow-step-title">{step.title}</span>
              <span className="workflow-step-note">{step.note}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function deriveOutputPath(inputPath) {
  const raw = String(inputPath || '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/[\\/]+$/, '');
  const slashIndex = normalized.lastIndexOf('/');
  const backslashIndex = normalized.lastIndexOf('\\');
  const index = Math.max(slashIndex, backslashIndex);
  const separator = backslashIndex > slashIndex ? '\\' : '/';

  const folderName = index >= 0 ? normalized.slice(index + 1) : normalized;
  if (!folderName) return '';

  const outputName = `${folderName}_OUTPUT`;
  if (index < 0) return outputName;

  const parent = normalized.slice(0, index);
  if (!parent) return `${separator}${outputName}`;
  return `${parent}${separator}${outputName}`;
}

function withDerivedOutputPath(config) {
  return {
    ...config,
    outputPath: config.outputPath || deriveOutputPath(config.inputPath),
  };
}

function sameWorkflowConfig(a, b) {
  return Object.keys({ ...a, ...b }).every((key) => a[key] === b[key]);
}

function SwitchRow({ icon: IconComponent, title, description, checked, onChange }) {
  return (
    <label
      className="panel"
      style={{
        display: 'grid',
        gridTemplateColumns: '34px minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        boxShadow: 'none',
        cursor: 'pointer',
      }}
    >
      <span className={checked ? 'chip chip-green' : 'chip'} style={{ width: 34, height: 34, padding: 0, justifyContent: 'center' }}>
        <IconComponent />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 850, color: 'var(--ink)' }}>{title}</span>
        <span style={{ display: 'block', marginTop: 3, color: 'var(--muted)', fontSize: 12 }}>{description}</span>
      </span>
      <span
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          padding: 3,
          background: checked ? 'var(--groove)' : 'var(--line)',
          transition: 'background 160ms ease',
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <span
          style={{
            display: 'block',
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fffdf7',
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
            transition: 'transform 160ms ease',
          }}
        />
      </span>
    </label>
  );
}

function NumberSetting({ label, description, value, min, max, suffix, onChange, disabled }) {
  return (
    <div className="workflow-setting-row">
      <div>
        <label className="workflow-setting-label">{label}</label>
        <p className="workflow-setting-copy">{description}</p>
      </div>
      <div className="workflow-number-control">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{ width: '100%', accentColor: 'var(--groove)' }}
        />
        <div className="workflow-number-input">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="input"
          />
          {suffix && <span>{suffix}</span>}
        </div>
      </div>
    </div>
  );
}

function ReviewLine({ label, children }) {
  return (
    <div className="workflow-review-line">
      <div className="workflow-setting-label">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function PathPicker({ label, value, placeholder, onChange, onPick, disabled }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 8, color: 'var(--ink)', fontWeight: 850 }}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="input"
        />
        <button type="button" onClick={onPick} disabled={disabled} className="btn btn-secondary">
          <Icons.Folder />
          选择
        </button>
      </div>
    </div>
  );
}

export default function Workflow() {
  const {
    workflowStep,
    setWorkflowStep,
    updateWorkflowConfig,
    setCurrentPage,
    resetWorkflow,
    setTaskStatus,
    addHistory,
  } = useAppStore();
  const workflowConfig = useWorkflowConfig();
  const { selectDirectory, startProcess } = useQtBridge();
  const [localConfig, setLocalConfig] = useState(() => withDerivedOutputPath(workflowConfig));
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputPathManuallyChanged, setOutputPathManuallyChanged] = useState(false);

  useEffect(() => {
    const nextConfig = withDerivedOutputPath(workflowConfig);
    setLocalConfig((prev) => (sameWorkflowConfig(prev, nextConfig) ? prev : nextConfig));
    setOutputPathManuallyChanged(false);
  }, [workflowConfig]);

  const handleConfigChange = (key, value) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleInputPathChange = (value) => {
    setLocalConfig((prev) => ({
      ...prev,
      inputPath: value,
      outputPath: outputPathManuallyChanged ? prev.outputPath : deriveOutputPath(value),
    }));
  };

  const handleSelectInput = async () => {
    const path = await selectDirectory(localConfig.inputPath);
    if (path) {
      const nextOutputPath = outputPathManuallyChanged && localConfig.outputPath
        ? localConfig.outputPath
        : deriveOutputPath(path);
      setLocalConfig((prev) => ({
        ...prev,
        inputPath: path,
        outputPath: nextOutputPath,
      }));
      updateWorkflowConfig({ inputPath: path, outputPath: nextOutputPath });
    }
  };

  const handleSelectOutput = async () => {
    const path = await selectDirectory(localConfig.outputPath);
    if (path) {
      setOutputPathManuallyChanged(true);
      handleConfigChange('outputPath', path);
      updateWorkflowConfig({ outputPath: path });
    }
  };

  const canContinue = Boolean(localConfig.inputPath && localConfig.outputPath);

  const clampNumber = (value, min, max) => Math.max(min, Math.min(max, parseInt(value, 10) || min));
  const clampThreads = (value) => clampNumber(value, 1, 16);
  const clampConfidence = (value) => clampNumber(value, 1, 100);
  const clampTimeout = (value) => clampNumber(value, 1, 60);
  const clampQuality = (value) => clampNumber(value, 50, 100);

  const handleNextStep = () => {
    if (workflowStep === 1 && !canContinue) return;
    updateWorkflowConfig(localConfig);
    setWorkflowStep(Math.min(workflowStep + 1, 3));
  };

  const handleStartProcessing = async () => {
    if (!canContinue) return;
    setIsProcessing(true);
    setTaskStatus('processing');

    try {
      await startProcess(localConfig.inputPath, localConfig.outputPath, localConfig.threads, {
        enableCoverDownload: localConfig.enableCoverDownload,
        enableSimplifiedChinese: localConfig.enableSimplifiedChinese,
        enableDuplicateCheck: localConfig.enableDuplicateCheck,
        enableFilenameParse: localConfig.enableFilenameParse,
        enableMetadataScrape: localConfig.enableMetadataScrape,
        preserveOriginal: localConfig.preserveOriginal,
        autoOrganize: localConfig.autoOrganize,
        confidenceThreshold: localConfig.confidenceThreshold,
        coverTimeout: localConfig.coverTimeout,
        coverQuality: localConfig.coverQuality,
      });

      addHistory({
        title: '音乐整理任务',
        status: 'processing',
        count: 0,
        config: localConfig,
      });
      setCurrentPage('progress');
    } catch (error) {
      console.error('处理失败:', error);
      setTaskStatus('error');
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    resetWorkflow();
    setCurrentPage('dashboard');
  };

  return (
    <div className="page page-narrow animate-fadeIn">
      <header className="page-header">
        <div>
          <p className="page-kicker">Batch setup</p>
          <h1 className="page-title">新建刮削任务</h1>
          <p className="page-copy">
            选择输入与输出目录，启用需要的清洗、刮削和整理规则，然后交给 Pipeline 批量处理。
          </p>
        </div>
      </header>

      <StepRail currentStep={workflowStep} />

      <section className="panel workflow-panel">
        {workflowStep === 1 ? (
          <div className="workflow-path-stack">
            <div className="workflow-path-section">
              <PathPicker
                label="输入目录"
                value={localConfig.inputPath}
                placeholder="选择包含音乐文件的目录"
                onChange={handleInputPathChange}
                onPick={handleSelectInput}
                disabled={isProcessing}
              />
            </div>

            <div className="workflow-path-section">
              <PathPicker
                label="输出目录"
                value={localConfig.outputPath}
                placeholder="选择整理后的保存位置"
                onChange={(value) => {
                  setOutputPathManuallyChanged(true);
                  handleConfigChange('outputPath', value);
                }}
                onPick={handleSelectOutput}
                disabled={isProcessing}
              />
              <p style={{ color: 'var(--muted)', lineHeight: 1.7, margin: '14px 0 0' }}>
                默认使用输入目录的同级目录，并在目录名后追加 _OUTPUT。输出文件会按「歌手/专辑」结构整理。
              </p>
            </div>
          </div>
        ) : workflowStep === 2 ? (
          <div className="workflow-config-stack">
            <section className="workflow-config-section">
              <h2 className="panel-title">处理性能</h2>
              <NumberSetting
                label="处理线程数"
                description="网络共享目录建议使用较低线程数，本地 SSD 可适当提高。"
                value={localConfig.threads}
                min="1"
                max="16"
                suffix="线程"
                onChange={(value) => handleConfigChange('threads', clampThreads(value))}
                disabled={isProcessing}
              />
            </section>

            <section className="workflow-config-section">
              <h2 className="panel-title">处理规则</h2>
              <div className="workflow-switch-stack">
                <SwitchRow
                  icon={Icons.Cover}
                  title="下载专辑封面"
                  description="写入可用的专辑图像"
                  checked={localConfig.enableCoverDownload}
                  onChange={(e) => handleConfigChange('enableCoverDownload', e.target.checked)}
                />
                <SwitchRow
                  icon={Icons.Text}
                  title="繁简转换"
                  description="清理台湾/香港繁体歌词"
                  checked={localConfig.enableSimplifiedChinese}
                  onChange={(e) => handleConfigChange('enableSimplifiedChinese', e.target.checked)}
                />
                <SwitchRow
                  icon={Icons.Fingerprint}
                  title="重复检测"
                  description="跳过已处理的相同文件"
                  checked={localConfig.enableDuplicateCheck}
                  onChange={(e) => handleConfigChange('enableDuplicateCheck', e.target.checked)}
                />
                <SwitchRow
                  icon={Icons.Text}
                  title="文件名解析"
                  description="标签为空时从文件名补出艺人和标题"
                  checked={localConfig.enableFilenameParse}
                  onChange={(e) => handleConfigChange('enableFilenameParse', e.target.checked)}
                />
                <SwitchRow
                  icon={Icons.Database}
                  title="元数据刮削"
                  description="从 MusicBrainz 补全标签"
                  checked={localConfig.enableMetadataScrape}
                  onChange={(e) => handleConfigChange('enableMetadataScrape', e.target.checked)}
                />
                <SwitchRow
                  icon={Icons.Folder}
                  title="保留原文件"
                  description="输出到新目录，原始文件继续作为备份"
                  checked={localConfig.preserveOriginal}
                  onChange={(e) => handleConfigChange('preserveOriginal', e.target.checked)}
                />
                <SwitchRow
                  icon={Icons.Database}
                  title="按歌手/专辑整理"
                  description="输出目录使用统一的音乐库层级"
                  checked={localConfig.autoOrganize}
                  onChange={(e) => handleConfigChange('autoOrganize', e.target.checked)}
                />
              </div>
            </section>

            <section className="workflow-config-section">
              <h2 className="panel-title">刮削参数</h2>
              <NumberSetting
                label="匹配可信度阈值"
                description="低于阈值的候选元数据不会作为高可信结果使用。"
                value={localConfig.confidenceThreshold}
                min="1"
                max="100"
                suffix="%"
                onChange={(value) => handleConfigChange('confidenceThreshold', clampConfidence(value))}
                disabled={isProcessing}
              />
              <NumberSetting
                label="封面下载超时"
                description="封面服务响应过慢时自动跳过，避免拖慢整批任务。"
                value={localConfig.coverTimeout}
                min="1"
                max="60"
                suffix="秒"
                onChange={(value) => handleConfigChange('coverTimeout', clampTimeout(value))}
                disabled={isProcessing}
              />
              <NumberSetting
                label="封面写入质量"
                description="控制下载封面转为 JPEG 后的压缩质量。"
                value={localConfig.coverQuality}
                min="50"
                max="100"
                suffix="%"
                onChange={(value) => handleConfigChange('coverQuality', clampQuality(value))}
                disabled={isProcessing}
              />
            </section>
          </div>
        ) : (
          <div className="workflow-config-stack">
            <section className="workflow-config-section">
              <h2 className="panel-title">启动前复核</h2>
              <ReviewLine label="输入目录">
                <div className="mono" style={{ overflowWrap: 'anywhere' }}>{localConfig.inputPath}</div>
              </ReviewLine>
              <ReviewLine label="输出目录">
                <div className="mono" style={{ overflowWrap: 'anywhere' }}>{localConfig.outputPath}</div>
              </ReviewLine>
              <ReviewLine label="启用规则">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {localConfig.enableCoverDownload && <span className="chip chip-green">封面</span>}
                  {localConfig.enableSimplifiedChinese && <span className="chip chip-green">繁简</span>}
                  {localConfig.enableDuplicateCheck && <span className="chip chip-green">查重</span>}
                  {localConfig.enableFilenameParse && <span className="chip chip-green">文件名解析</span>}
                  {localConfig.enableMetadataScrape && <span className="chip chip-green">MusicBrainz</span>}
                  {localConfig.preserveOriginal && <span className="chip chip-green">保留原文件</span>}
                  {localConfig.autoOrganize && <span className="chip chip-green">整理目录</span>}
                </div>
              </ReviewLine>
              <ReviewLine label="执行参数">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span className="chip chip-amber">{localConfig.threads} 线程</span>
                  <span className="chip chip-amber">可信度 {localConfig.confidenceThreshold}%</span>
                  <span className="chip chip-amber">封面超时 {localConfig.coverTimeout}s</span>
                  <span className="chip chip-amber">封面质量 {localConfig.coverQuality}%</span>
                </div>
              </ReviewLine>
            </section>
          </div>
        )}

        <div className="workflow-actions">
          <div className="workflow-actions-group">
            {workflowStep > 1 && (
              <button type="button" onClick={() => setWorkflowStep(Math.max(1, workflowStep - 1))} className="btn btn-secondary">
                <Icons.Back />
                上一步
              </button>
            )}
          </div>
          <div className="workflow-actions-group">
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              取消
            </button>
            {workflowStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={(workflowStep === 1 && !canContinue) || isProcessing}
                className="btn btn-primary"
              >
                {workflowStep === 1 ? '继续配置' : '继续复核'}
                <Icons.Arrow />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartProcessing}
                disabled={isProcessing}
                className="btn btn-primary"
              >
                {isProcessing ? '准备中...' : '开始处理'}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
