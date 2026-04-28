import React, { useState } from 'react';
import useAppStore from '../stores/appStore';

// SVG Icons
const Icons = {
  MusicNote: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Cloud: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  ArrowDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Running: () => (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="3" />
    </svg>
  ),
};

// 统计卡片组件
function StatCard({ icon: Icon, label, value, subtext, color = 'blue' }) {
  const colorStyles = {
    green: { bg: '#ECFDF5', text: '#10B981', border: '#D1FAE5' },
    purple: { bg: '#F5F3FF', text: '#9333EA', border: '#EDE9FE' },
    orange: { bg: '#FEF7ED', text: '#EA580C', border: '#FDE8D8' },
  };
  const c = colorStyles[color] || colorStyles.blue;

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      border: '1px solid #F0F0F0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#6B7280' }}>
        <Icon />
        <span style={{ fontSize: '14px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937' }}>{value}</div>
      {subtext && <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>{subtext}</div>}
    </div>
  );
}

// 刮削活跃度图表组件
function ActivityChart({ data }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxValue = Math.max(...days.map(d => data[d] || 0), 1000);
  const chartHeight = 160;
  const barWidth = 32;
  const gap = 12;

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      border: '1px solid #F0F0F0',
    }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>刮削活跃度</span>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          background: '#F5F5F5',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          color: '#6B7280',
        }}>
          本周 <Icons.ArrowDown />
        </button>
      </div>

      {/* 图表区域 */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: `${chartHeight + 30}px`,
        position: 'relative',
      }}>
        {/* Y轴标签 */}
        <div style={{
          position: 'absolute',
          left: '-30px',
          top: '0',
          bottom: '30px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#9CA3AF',
        }}>
          <span>1000</span>
          <span>750</span>
          <span>500</span>
          <span>250</span>
          <span>0</span>
        </div>

        {/* 柱状图 */}
        <div style={{
          display: 'flex',
          gap: `${gap}px`,
          marginLeft: '20px',
          alignItems: 'flex-end',
        }}>
          {days.map((day, index) => {
            const value = data[day] || 0;
            const height = (value / maxValue) * chartHeight;
            return (
              <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: `${barWidth}px`,
                    height: `${Math.max(height, 4)}px`,
                    background: '#6366F1',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                  title={`${day}: ${value}`}
                />
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 近期任务卡片组件
function RecentTasksCard({ tasks }) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      border: '1px solid #F0F0F0',
    }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>近期任务</span>
        <a href="#" style={{
          fontSize: '13px',
          color: '#6366F1',
          textDecoration: 'none',
          cursor: 'pointer',
        }}>
          查看全部任务
        </a>
      </div>

      {/* 任务列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tasks.map((task, index) => {
          // 确定进度条颜色
          let progressBarColor = '#10B981'; // 绿色 - 完成
          let statusBadge = null;
          
          if (task.status === 'running') {
            progressBarColor = '#3B82F6'; // 蓝色 - 进行中
            statusBadge = (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                background: '#EFF6FF',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#3B82F6',
              }}>
                <Icons.Running /> 正在运行
              </span>
            );
          } else if (task.progress < 30) {
            progressBarColor = '#EF4444'; // 红色 - 低进度
          }

          return (
            <div key={index} style={{ padding: '12px', background: '#FAFAFA', borderRadius: '8px' }}>
              {/* 任务标题和状态 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>{task.title}</span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>{task.progress}%</span>
              </div>
              
              {/* 日期和状态标签 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{task.date}</span>
                {statusBadge}
              </div>
              
              {/* 进度条 */}
              <div style={{
                width: '100%',
                height: '6px',
                background: '#E5E5E5',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div
                  style={{
                    width: `${task.progress}%`,
                    height: '100%',
                    background: progressBarColor,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              
              {/* 歌曲数量 */}
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#9CA3AF' }}>
                {task.songCount} 首歌
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 顶部搜索栏组件
function TopBar() {
  return (
    <div style={{
      height: '64px',
      background: '#FFFFFF',
      borderBottom: '1px solid #F0F0F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
    }}>
      {/* 搜索框 */}
      <div style={{
        position: 'relative',
        width: '360px',
      }}>
        <div style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#9CA3AF',
        }}>
          <Icons.Search />
        </div>
        <input
          type="text"
          placeholder="快速定位任务或文件..."
          style={{
            width: '100%',
            padding: '10px 14px 10px 44px',
            background: '#F9FAFB',
            border: '1px solid #E5E5E5',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#1F2937',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 右侧用户信息 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* 通知铃铛 */}
        <button style={{
          position: 'relative',
          padding: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#6B7280',
        }}>
          <Icons.Bell />
          {/* 通知红点 */}
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '8px',
            height: '8px',
            background: '#EF4444',
            borderRadius: '50%',
            border: '2px solid #FFFFFF',
          }} />
        </button>

        {/* 用户信息 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 头像 */}
          <div style={{
            width: '36px',
            height: '36px',
            background: '#F0F2FF',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366F1',
            fontSize: '14px',
            fontWeight: 600,
          }}>
            AD
          </div>
          {/* 用户名 */}
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
            管理员 / Local Instance
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { setCurrentPage } = useAppStore();

  // 模拟数据
  const statsData = {
    totalSongs: '12,842',
    successRate: '98.2%',
    storage: '458 GB',
    pendingTasks: '3',
  };

  const weeklyData = {
    Mon: 150,
    Tue: 470,
    Wed: 300,
    Thu: 880,
    Fri: 600,
    Sat: 200,
    Sun: 170,
  };

  const recentTasks = [
    {
      title: '周杰伦全集刮削',
      date: '2024-02-05',
      progress: 100,
      songCount: '245',
      status: 'completed',
    },
    {
      title: 'Hi-Res 摇滚合集',
      date: '2024-02-05',
      progress: 65,
      songCount: '120',
      status: 'running',
    },
    {
      title: '动漫原声带',
      date: '2024-02-04',
      progress: 12,
      songCount: '50',
      status: 'in_progress',
    },
  ];

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100%' }}>
      {/* 顶部栏 */}
      <TopBar />

      {/* 主内容区 */}
      <div style={{ padding: '24px' }}>
        {/* 欢迎语和标题 */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>
            数据概览
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            欢迎回来！以下是您音乐库的整体统计信息。
          </p>
        </div>

        {/* 统计卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <StatCard
            icon={Icons.MusicNote}
            label="累计处理歌曲"
            value={statsData.totalSongs}
            color="blue"
          />
          <StatCard
            icon={Icons.Check}
            label="成功率"
            value={statsData.successRate}
            color="green"
          />
          <StatCard
            icon={Icons.Cloud}
            label="处理容量"
            value={statsData.storage}
            color="purple"
          />
          <StatCard
            icon={Icons.Clock}
            label="待处理任务"
            value={statsData.pendingTasks}
            color="orange"
          />
        </div>

        {/* 图表和任务区域 */}
        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-start',
        }}>
          {/* 左侧 - 刮削活跃度图表 (约65%宽度) */}
          <div style={{ flex: '0 0 65%' }}>
            <ActivityChart data={weeklyData} />
          </div>

          {/* 右侧 - 近期任务列表 (约35%宽度) */}
          <div style={{ flex: '0 0 35%' }}>
            <RecentTasksCard tasks={recentTasks} />
          </div>
        </div>
      </div>
    </div>
  );
}
