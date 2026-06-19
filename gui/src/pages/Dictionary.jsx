import React, { useMemo, useState } from 'react';

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

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function Dictionary() {
  const [activeTab, setActiveTab] = useState('artists');
  const [searchQuery, setSearchQuery] = useState('');

  const artists = useMemo(() => mockDictionary.artists.filter((item) => (
    `${item.original} ${item.standardized}`.toLowerCase().includes(searchQuery.toLowerCase())
  )), [searchQuery]);

  const rules = useMemo(() => mockDictionary.rules.filter((item) => (
    `${item.pattern} ${item.description}`.toLowerCase().includes(searchQuery.toLowerCase())
  )), [searchQuery]);

  return (
    <div className="page animate-fadeIn">
      <header className="page-header">
        <div>
          <p className="page-kicker">Tag dictionary</p>
          <h1 className="page-title">标签库</h1>
          <p className="page-copy">
            管理艺人映射和文本清洗规则，让同一批音乐在写入标签前使用一致的命名。
          </p>
        </div>
        <button type="button" className="btn btn-primary">
          {activeTab === 'artists' ? '添加映射' : '添加规则'}
        </button>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
        <div className="toolbar">
          <button
            type="button"
            onClick={() => setActiveTab('artists')}
            className={`btn ${activeTab === 'artists' ? 'btn-primary' : 'btn-secondary'}`}
          >
            艺人映射
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
          >
            替换规则
          </button>
        </div>
        <div style={{ position: 'relative', width: 'min(420px, 100%)' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
            <SearchIcon />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'artists' ? '搜索艺人' : '搜索规则'}
            className="input"
            style={{ paddingLeft: 42 }}
          />
        </div>
      </div>

      {activeTab === 'artists' && (
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">艺人名称映射</h2>
              <p className="panel-subtitle">别名、英文名和标准中文名</p>
            </div>
            <span className="chip chip-blue">{artists.length} 条</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>原始名称</th>
                  <th>标准化名称</th>
                  <th>使用次数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {artists.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.original}</td>
                    <td style={{ fontWeight: 850, color: 'var(--ink)' }}>{item.standardized}</td>
                    <td>{item.count} 次</td>
                    <td>
                      <button type="button" className="btn btn-ghost" style={{ minHeight: 30, padding: '4px 8px' }}>编辑</button>
                      <button type="button" className="btn btn-ghost" style={{ minHeight: 30, padding: '4px 8px', color: 'var(--red)' }}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'rules' && (
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">文本替换规则</h2>
              <p className="panel-subtitle">广告、乱码和无效后缀清理</p>
            </div>
            <span className="chip chip-blue">{rules.length} 条</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>匹配模式</th>
                  <th>替换为</th>
                  <th>描述</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.pattern}</td>
                    <td>{item.replacement || '(空)'}</td>
                    <td>{item.description}</td>
                    <td>
                      <span className={`chip ${item.enabled ? 'chip-green' : ''}`}>
                        {item.enabled ? '启用' : '停用'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-ghost" style={{ minHeight: 30, padding: '4px 8px' }}>编辑</button>
                      <button type="button" className="btn btn-ghost" style={{ minHeight: 30, padding: '4px 8px', color: 'var(--red)' }}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
