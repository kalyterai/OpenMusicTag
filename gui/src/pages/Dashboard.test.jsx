import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

// 用模拟的 bridge 返回「后端真实形状」的数据，验证 Dashboard 接线与格式化。
vi.mock('../bridge', () => ({
  useQtBridge: () => ({
    callQt: async (method) => {
      if (method === 'get_dashboard_stats') {
        return {
          total_songs: 1234,
          success: 1234,
          failed: 18,
          success_rate: 98.5,
          total_bytes: 1073741824, // 1 GB
          total_tasks: 7,
          pending_tasks: 2,
        };
      }
      if (method === 'get_daily_activity') {
        return [
          { date: '2026-06-19', weekday: 'Thu', count: 12 },
        ];
      }
      if (method === 'get_recent_tasks') {
        return [
          { input_path: '/music/周杰伦', started_at: '2026-06-19T10:00:00', status: 'completed', total: 10, success: 10 },
        ];
      }
      return null;
    },
  }),
}));

describe('Dashboard 真实数据接线', () => {
  it('展示来自后端的聚合统计（含格式化）', async () => {
    render(<Dashboard />);
    expect(await screen.findByText('1,234')).toBeInTheDocument();
    expect(await screen.findByText('98.5%')).toBeInTheDocument();
    expect(await screen.findByText('1.0 GB')).toBeInTheDocument();
    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('展示来自后端的近期任务', async () => {
    render(<Dashboard />);
    // 任务标题取自 input_path 的末级目录名
    expect(await screen.findByText('周杰伦')).toBeInTheDocument();
  });
});
