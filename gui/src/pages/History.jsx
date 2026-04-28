import React from 'react';
import useAppStore from '../stores/appStore';

// 模拟历史记录数据
const mockHistory = [
  { id: 1, date: '2024-01-15 14:30', input: '/音乐/待整理', output: '/音乐/已整理', files: 156, status: 'success', duration: '3分24秒' },
  { id: 2, date: '2024-01-14 10:15', input: '/下载/新歌', output: '/音乐/已整理', files: 23, status: 'success', duration: '45秒' },
  { id: 3, date: '2024-01-13 18:20', input: '/音乐/旧文件', output: '/音乐/备份', files: 892, status: 'partial', duration: '12分10秒' },
  { id: 4, date: '2024-01-12 09:00', input: '/音乐/待整理', output: '/音乐/已整理', files: 45, status: 'success', duration: '1分30秒' },
  { id: 5, date: '2024-01-10 16:45', input: '/下载/批量', output: '/音乐/已整理', files: 234, status: 'error', duration: '5分20秒' },
];

const statusMap = {
  success: { label: '成功', class: 'bg-green-50 text-green-600' },
  partial: { label: '部分成功', class: 'bg-yellow-50 text-yellow-600' },
  error: { label: '失败', class: 'bg-red-50 text-red-600' },
};

export default function History() {
  return (
    <div className="p-8 animate-fadeIn">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">历史记录</h1>
        <p className="text-neutral-500">查看所有处理任务的历史记录和状态</p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="text-sm text-neutral-500 mb-1">总任务数</div>
          <div className="text-2xl font-bold text-neutral-900">128</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="text-sm text-neutral-500 mb-1">成功任务</div>
          <div className="text-2xl font-bold text-green-600">115</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="text-sm text-neutral-500 mb-1">处理文件总数</div>
          <div className="text-2xl font-bold text-blue-600">15.2K</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="text-sm text-neutral-500 mb-1">总用时</div>
          <div className="text-2xl font-bold text-purple-600">4.2h</div>
        </div>
      </div>

      {/* 历史记录列表 */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">最近任务</h2>
          <button className="text-sm text-primary-600 hover:text-primary-700">
            导出记录
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">输入目录</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">输出目录</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">文件数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">用时</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {mockHistory.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-neutral-900">{item.date}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600 max-w-xs truncate">{item.input}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600 max-w-xs truncate">{item.output}</td>
                  <td className="px-6 py-4 text-sm text-neutral-900">{item.files}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{item.duration}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusMap[item.status].class}`}>
                      {statusMap[item.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
