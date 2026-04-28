import React, { useState } from 'react';

// 模拟词典数据
const mockDictionary = {
  artists: [
    { id: 1, original: 'G.E.M.', standardized: '邓紫棋', count: 42 },
    { id: 2, original: 'Jay Chou', standardized: '周杰伦', count: 128 },
    { id: 3, original: 'Eason Chan', standardized: '陈奕迅', count: 86 },
    { id: 4, original: 'JJ Lin', standardized: '林俊杰', count: 65 },
    { id: 5, original: 'Mayday', standardized: '五月天', count: 54 },
  ],
  rules: [
    { id: 1, pattern: '演唱会', replacement: '', description: '移除演唱会后缀', enabled: true },
    { id: 2, pattern: 'Live', replacement: '', description: '移除 Live 标识', enabled: true },
    { id: 3, pattern: 'www\\..*\\.com', replacement: '', description: '移除网站广告', enabled: true },
    { id: 4, pattern: 'QQ音乐', replacement: '', description: '移除平台标识', enabled: false },
  ],
};

export default function Dictionary() {
  const [activeTab, setActiveTab] = useState('artists');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="p-8 animate-fadeIn">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">词典</h1>
        <p className="text-neutral-500">管理艺人名称映射和文本替换规则</p>
      </div>

      {/* 标签页切换 */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab('artists')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'artists'
              ? 'bg-neutral-900 text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          艺人映射
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-neutral-900 text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          替换规则
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'artists' ? '搜索艺人...' : '搜索规则...'}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* 艺人映射 */}
      {activeTab === 'artists' && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">艺人名称映射</h2>
            <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
              添加映射
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">原始名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">标准化名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">使用次数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mockDictionary.artists.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-neutral-900 font-mono">{item.original}</td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{item.standardized}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{item.count} 次</td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-primary-600 hover:text-primary-700 mr-3">编辑</button>
                      <button className="text-sm text-red-600 hover:text-red-700">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 替换规则 */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">文本替换规则</h2>
            <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
              添加规则
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">匹配模式</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">替换为</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">描述</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mockDictionary.rules.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-neutral-900 font-mono">{item.pattern}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{item.replacement || '(空)'}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{item.description}</td>
                    <td className="px-6 py-4">
                      <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        item.enabled ? 'bg-primary-600' : 'bg-neutral-200'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          item.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-primary-600 hover:text-primary-700 mr-3">编辑</button>
                      <button className="text-sm text-red-600 hover:text-red-700">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}