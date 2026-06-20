import React, { useEffect, useState } from 'react';
import useAppStore from '../stores/appStore';
import { useQtBridge } from '../bridge';

function basename(p) {
  if (!p) return '';
  const parts = String(p).split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || String(p);
}

function formatBytes(n) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function mapTask(t) {
  const total = t.total || 0;
  const success = t.success || 0;
  const failed = t.failed || 0;
  let progress = 0;
  if (t.status === 'completed' || t.status === 'cancelled') progress = 100;
  else if (total > 0) progress = Math.round((success / total) * 100);

  return {
    title: basename(t.input_path) || '音乐整理任务',
    date: (t.started_at || t.created_at || '').replace('T', ' '),
    progress,
    songCount: success || total || 0,
    failed,
    status: t.status || 'pending',
  };
}

const Icon = ({ children }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const Icons = {
  Music: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2zm12-3c0 1.1-1.3 2-3 2s-3-.9-3-2 1.3-2 3-2 3 .9 3 2zM9 10l12-3" />
    </Icon>
  ),
  Check: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </Icon>
  ),
  Storage: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
    </Icon>
  ),
  Queue: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h7" />
    </Icon>
  ),
  Arrow: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Folder: () => (
    <Icon>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.5 7.5A2.5 2.5 0 016 5h4l2 2h6a2.5 2.5 0 012.5 2.5v7A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5v-9z" />
    </Icon>
  ),
};

function StatCard({ icon: IconComponent, label, value, note, tone = 'blue' }) {
  const toneClass = {
    green: 'chip-green',
    amber: 'chip-amber',
    red: 'chip-red',
    blue: 'chip-blue',
  }[tone] || 'chip-blue';

  return (
    <section className="metric-card">
      <div className="metric-label">
        <span className={`chip ${toneClass}`} style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }}>
          <IconComponent />
        </span>
        {label}
      </div>
      <div className="metric-value">{value}</div>
      {note && <div className="metric-note">{note}</div>}
    </section>
  );
}

function ActivityChart({ data }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const labels = {
    Mon: '一',
    Tue: '二',
    Wed: '三',
    Thu: '四',
    Fri: '五',
    Sat: '六',
    Sun: '日',
  };
  const maxValue = Math.max(...days.map((day) => data[day] || 0), 1);

  return (
    <section className="panel dashboard-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">刮削活跃度</h2>
          <p className="panel-subtitle">最近 7 天处理量</p>
        </div>
        <span className="chip chip-blue">本周</span>
      </div>
      <div className="dashboard-panel-body">
        <div className="dashboard-activity-chart">
          {days.map((day) => {
            const value = data[day] || 0;
            const height = Math.max((value / maxValue) * 132, 8);

            return (
              <div key={day} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div
                  title={`${day}: ${value}`}
                  className="dashboard-activity-bar"
                  style={{
                    height,
                    background: value > 0 ? 'linear-gradient(180deg, var(--groove), #3d8583)' : 'rgba(222, 212, 195, 0.72)',
                  }}
                />
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{labels[day]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RecentTasksCard({ tasks, onViewAll, isLoading }) {
  const hasTasks = tasks.length > 0;

  return (
    <section className="panel dashboard-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">近期任务</h2>
          <p className="panel-subtitle">完成、失败和正在处理的批次</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onViewAll}>
          查看资源库
        </button>
      </div>
      <div className="dashboard-panel-body dashboard-task-body">
        {isLoading && (
          <>
            {[0, 1, 2].map((item) => (
              <div key={item} className="dashboard-task-skeleton">
                <span />
                <span />
                <span />
              </div>
            ))}
          </>
        )}

        {!isLoading && !hasTasks && (
          <div className="empty-state" style={{ minHeight: 220 }}>
            <Icons.Folder />
            <div style={{ marginTop: 10, fontWeight: 800, color: 'var(--ink)' }}>还没有处理记录</div>
            <div style={{ marginTop: 4, fontSize: 13 }}>选择音乐目录后，这里会显示最近的刮削批次。</div>
          </div>
        )}

        {!isLoading && tasks.map((task, index) => {
          const isRunning = task.status === 'running' || task.status === 'processing';
          const statusClass = task.failed > 0 ? 'chip-red' : (isRunning ? 'chip-blue' : 'chip-green');
          const statusText = task.failed > 0 ? `${task.failed} 失败` : (isRunning ? '处理中' : '完成');

          return (
            <article key={`${task.title}-${index}`} className="panel" style={{ boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="truncate-1" style={{ fontWeight: 850, color: 'var(--ink)' }}>{task.title}</div>
                  <div className="truncate-1" style={{ marginTop: 4, color: 'var(--muted)', fontSize: 12 }}>{task.date || '未记录时间'}</div>
                </div>
                <span className={`chip ${statusClass}`}>{statusText}</span>
              </div>
              <div style={{ marginTop: 12, height: 7, borderRadius: 999, overflow: 'hidden', background: 'rgba(222, 212, 195, 0.72)' }}>
                <div
                  style={{
                    width: `${task.progress}%`,
                    height: '100%',
                    background: task.failed > 0 ? 'var(--red)' : 'var(--groove)',
                  }}
                />
              </div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: 12 }}>
                <span>{task.songCount} 首歌</span>
                <span>{task.progress}%</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { setCurrentPage, resetWorkflow } = useAppStore();
  const { callQt } = useQtBridge();
  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState({});
  const [recentTasks, setRecentTasks] = useState([]);
  const [dashboardReady, setDashboardReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, activity, tasks] = await Promise.all([
          callQt('get_dashboard_stats'),
          callQt('get_daily_activity', 7),
          callQt('get_recent_tasks', 5),
        ]);
        if (!active) return;
        setStats(s || {});
        const map = {};
        (activity || []).forEach((d) => { map[d.weekday] = d.count; });
        setWeeklyData(map);
        setRecentTasks((tasks || []).map(mapTask));
      } catch (e) {
        console.error('加载概览数据失败:', e);
      } finally {
        if (active) setDashboardReady(true);
      }
    })();
    return () => { active = false; };
  }, [callQt]);

  const totalSongs = stats?.total_songs ?? 0;
  const successRate = stats?.success_rate ?? 0;
  const failed = stats?.failed ?? 0;
  const handleNewScrape = () => {
    resetWorkflow();
    setCurrentPage('scrape');
  };

  return (
    <div className="page animate-fadeIn">
      <header className="page-header">
        <div>
          <p className="page-kicker">Music library control</p>
          <h1 className="page-title">音乐库控制面板</h1>
          <p className="page-copy">
            查看刮削结果、处理容量和近期任务状态，从这里继续整理你的本地或网络音乐目录。
          </p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-secondary" onClick={() => setCurrentPage('files')}>
            <Icons.Folder />
            查看资源库
          </button>
          <button type="button" className="btn btn-primary" onClick={handleNewScrape}>
            新建刮削
            <Icons.Arrow />
          </button>
        </div>
      </header>

      <div className="metric-grid">
        <StatCard icon={Icons.Music} label="累计歌曲" value={totalSongs.toLocaleString()} note="已写入数据库" tone="blue" />
        <StatCard icon={Icons.Check} label="成功率" value={`${successRate}%`} note={failed > 0 ? `${failed} 首需复核` : '处理结果稳定'} tone="green" />
        <StatCard icon={Icons.Storage} label="处理容量" value={formatBytes(stats?.total_bytes ?? 0)} note={`${stats?.total_tasks ?? 0} 个任务批次`} tone="amber" />
        <StatCard icon={Icons.Queue} label="待处理任务" value={String(stats?.pending_tasks ?? 0)} note="等待或正在运行" tone={(stats?.pending_tasks ?? 0) > 0 ? 'amber' : 'blue'} />
      </div>

      <section className="dashboard-grid">
        <ActivityChart data={weeklyData} />
        <RecentTasksCard tasks={recentTasks} isLoading={!dashboardReady} onViewAll={() => setCurrentPage('files')} />
      </section>
    </div>
  );
}
