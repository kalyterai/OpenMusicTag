import { describe, it, expect, beforeEach } from 'vitest';
import useAppStore from './appStore';

// appStore 业务逻辑测试：进度钳制、日志上限、历史去重/上限、配置合并等纯逻辑，
// 这些是真实业务规则（非 mock），保证状态层行为稳定。
describe('appStore 业务逻辑', () => {
  beforeEach(() => {
    useAppStore.setState({
      progress: 0,
      progressText: '',
      logs: [],
      progressLogs: [],
      history: [],
      taskStatus: 'idle',
    });
  });

  it('setProgress 将进度钳制在 0~100 并四舍五入', () => {
    const { setProgress } = useAppStore.getState();
    setProgress(150);
    expect(useAppStore.getState().progress).toBe(100);
    setProgress(-20);
    expect(useAppStore.getState().progress).toBe(0);
    setProgress(33.6, '处理中');
    expect(useAppStore.getState().progress).toBe(34);
    expect(useAppStore.getState().progressText).toBe('处理中');
  });

  it('addLog 最多保留 1000 条（防止日志无限增长）', () => {
    const { addLog } = useAppStore.getState();
    for (let i = 0; i < 1005; i += 1) {
      addLog({ type: 'info', message: `log-${i}` });
    }
    const { logs } = useAppStore.getState();
    expect(logs.length).toBe(1000);
    // 最新一条应在末尾
    expect(logs[logs.length - 1].message).toBe('log-1004');
    // 每条日志补齐 type/level/timestamp
    expect(logs[0]).toHaveProperty('timestamp');
    expect(logs[0].level).toBe('info');
  });

  it('addHistory 自动补 id/createdAt 并最多保留 100 条', () => {
    const { addHistory } = useAppStore.getState();
    for (let i = 0; i < 105; i += 1) {
      addHistory({ input: `/in/${i}`, output: '/out', files: i });
    }
    const { history } = useAppStore.getState();
    expect(history.length).toBe(100);
    // 最新的排在最前
    expect(history[0].input).toBe('/in/104');
    expect(history[0]).toHaveProperty('id');
    expect(history[0]).toHaveProperty('createdAt');
  });

  it('updateConfig 同步合并到 config 与 workflowConfig', () => {
    const { updateConfig } = useAppStore.getState();
    updateConfig({ threads: 8, enableCoverDownload: false });
    const state = useAppStore.getState();
    expect(state.config.threads).toBe(8);
    expect(state.config.enableCoverDownload).toBe(false);
    expect(state.workflowConfig.threads).toBe(8);
    expect(state.workflowConfig.enableCoverDownload).toBe(false);
  });

  it('resetTask 清空任务态与进度日志', () => {
    const { setProgress, addProgressLog, resetTask, updateStats } = useAppStore.getState();
    setProgress(50);
    addProgressLog({ type: 'info', message: 'x' });
    updateStats({ totalFiles: 10, processedFiles: 5 });
    resetTask();
    const s = useAppStore.getState();
    expect(s.progress).toBe(0);
    expect(s.progressLogs).toEqual([]);
    expect(s.totalFiles).toBe(0);
    expect(s.processedFiles).toBe(0);
    expect(s.taskStatus).toBe('idle');
  });
});
