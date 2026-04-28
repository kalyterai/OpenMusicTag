import React, { useState } from 'react';
import { useLogs } from '../stores/appStore';

export default function Logs() {
  const logs = useLogs();
  const [filter, setFilter] = useState('all'); // all, success, error

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'success') return log.message.includes('✅');
    if (filter === 'error') return log.message.includes('❌');
    return true;
  });

  const handleExport = () => {
    const content = logs.map((log) =>
      `${new Date(log.timestamp).toLocaleString()} - ${log.message}`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openmusictag-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm('确定清空所有日志吗？')) {
      useAppStore.setState({ logs: [] });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'success', 'error'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                filter === type
                  ? 'bg-primary text-white'
                  : 'bg-dark-card text-text-secondary hover:text-white'
              }`}
            >
              {type === 'all' ? '全部' : type === 'success' ? '成功' : '错误'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={handleExport} className="btn btn-secondary">
            导出日志
          </button>
          <button onClick={handleClear} className="btn btn-danger">
            清空
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="card">
        <div className="h-[calc(100vh-200px)] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-text-muted">
              暂无日志
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-dark-bg sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                    消息
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-hover">
                {filteredLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-dark-hover/50">
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString()
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-white">{logs.length}</p>
          <p className="text-sm text-text-secondary">总日志数</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">
            {logs.filter((l) => l.message.includes('✅')).length}
          </p>
          <p className="text-sm text-text-secondary">成功</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-400">
            {logs.filter((l) => l.message.includes('❌')).length}
          </p>
          <p className="text-sm text-text-secondary">错误</p>
        </div>
      </div>
    </div>
  );
}
