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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
      {steps.map((step) => {
        const active = currentStep === step.id;
        const done = currentStep > step.id;
        return (
          <div
            key={step.id}
            className="panel"
            style={{
              padding: 14,
              boxShadow: 'none',
              background: active || done ? 'var(--groove-soft)' : 'var(--panel)',
              borderColor: active || done ? 'rgba(31, 95, 99, 0.32)' : 'var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={done ? 'chip chip-green' : (active ? 'chip chip-blue' : 'chip')} style={{ width: 32, height: 32, justifyContent: 'center', padding: 0 }}>
                {done ? <Icons.Check /> : step.id}
              </span>
              <span>
                <span style={{ display: 'block', fontWeight: 850, color: 'var(--ink)' }}>{step.title}</span>
                <span style={{ display: 'block', marginTop: 2, color: 'var(--muted)', fontSize: 12 }}>{step.note}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [localConfig, setLocalConfig] = useState(workflowConfig);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setLocalConfig(workflowConfig);
  }, [workflowConfig]);

  const handleConfigChange = (key, value) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectInput = async () => {
    const path = await selectDirectory(localConfig.inputPath);
    if (path) {
      handleConfigChange('inputPath', path);
      updateWorkflowConfig({ inputPath: path });
    }
  };

  const handleSelectOutput = async () => {
    const path = await selectDirectory(localConfig.outputPath);
    if (path) {
      handleConfigChange('outputPath', path);
      updateWorkflowConfig({ outputPath: path });
    }
  };

  const canContinue = Boolean(localConfig.inputPath && localConfig.outputPath);

  const clampThreads = (value) => Math.max(1, Math.min(16, parseInt(value, 10) || 1));

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
        <span className="chip chip-blue">{localConfig.threads} 线程</span>
      </header>

      <StepRail currentStep={workflowStep} />

      <section className="panel" style={{ overflow: 'hidden' }}>
        {workflowStep === 1 ? (
          <div className="workflow-grid">
            <div style={{ padding: 22, borderRight: '1px solid var(--line)' }}>
              <h2 className="panel-title" style={{ marginBottom: 18 }}>输入目录</h2>
              <div style={{ display: 'grid', gap: 18 }}>
                <PathPicker
                  label="输入目录"
                  value={localConfig.inputPath}
                  placeholder="选择包含音乐文件的目录"
                  onChange={(value) => handleConfigChange('inputPath', value)}
                  onPick={handleSelectInput}
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div style={{ padding: 22 }}>
              <h2 className="panel-title" style={{ marginBottom: 18 }}>输出目录</h2>
              <div style={{ display: 'grid', gap: 18 }}>
                <PathPicker
                  label="输出目录"
                  value={localConfig.outputPath}
                  placeholder="选择整理后的保存位置"
                  onChange={(value) => handleConfigChange('outputPath', value)}
                  onPick={handleSelectOutput}
                  disabled={isProcessing}
                />
                <div className="waveform" />
                <p style={{ color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
                  输出文件会按「歌手/专辑」结构整理。建议输出到新目录，保留原文件作为备份。
                </p>
              </div>
            </div>
          </div>
        ) : workflowStep === 2 ? (
          <div className="workflow-grid">
            <div style={{ padding: 22 }}>
              <h2 className="panel-title" style={{ marginBottom: 18 }}>处理线程数</h2>
              <div className="panel" style={{ padding: 16, boxShadow: 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 96px', gap: 12, alignItems: 'center' }}>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    value={localConfig.threads}
                    onChange={(e) => handleConfigChange('threads', clampThreads(e.target.value))}
                    disabled={isProcessing}
                    style={{ width: '100%', accentColor: 'var(--groove)' }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={localConfig.threads}
                    onChange={(e) => handleConfigChange('threads', clampThreads(e.target.value))}
                    disabled={isProcessing}
                    className="input"
                  />
                </div>
                <p style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 12 }}>
                  网络共享目录建议使用较低线程数，本地 SSD 可适当提高。
                </p>
              </div>
            </div>

            <div style={{ padding: 22, borderLeft: '1px solid var(--line)' }}>
              <h2 className="panel-title" style={{ marginBottom: 18 }}>刮削运行配置</h2>
              <div style={{ display: 'grid', gap: 10 }}>
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
                  icon={Icons.Database}
                  title="元数据刮削"
                  description="从 MusicBrainz 补全标签"
                  checked={localConfig.enableMetadataScrape}
                  onChange={(e) => handleConfigChange('enableMetadataScrape', e.target.checked)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 22 }}>
            <div className="waveform" style={{ marginBottom: 18 }} />
            <div className="review-grid">
              <div className="panel" style={{ padding: 16, boxShadow: 'none' }}>
                <h2 className="panel-title" style={{ marginBottom: 14 }}>路径复核</h2>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 800 }}>输入</div>
                    <div className="mono" style={{ marginTop: 4, overflowWrap: 'anywhere' }}>{localConfig.inputPath}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 800 }}>输出</div>
                    <div className="mono" style={{ marginTop: 4, overflowWrap: 'anywhere' }}>{localConfig.outputPath}</div>
                  </div>
                </div>
              </div>
              <div className="panel" style={{ padding: 16, boxShadow: 'none' }}>
                <h2 className="panel-title" style={{ marginBottom: 14 }}>启用规则</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {localConfig.enableCoverDownload && <span className="chip chip-green">封面</span>}
                  {localConfig.enableSimplifiedChinese && <span className="chip chip-green">繁简</span>}
                  {localConfig.enableDuplicateCheck && <span className="chip chip-green">查重</span>}
                  {localConfig.enableFilenameParse && <span className="chip chip-green">文件名解析</span>}
                  {localConfig.enableMetadataScrape && <span className="chip chip-green">MusicBrainz</span>}
                  <span className="chip chip-amber">{localConfig.threads} 线程</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: 16, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div className="toolbar">
            {workflowStep > 1 && (
              <button type="button" onClick={() => setWorkflowStep(Math.max(1, workflowStep - 1))} className="btn btn-secondary">
                <Icons.Back />
                上一步
              </button>
            )}
          </div>
          <div className="toolbar">
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
