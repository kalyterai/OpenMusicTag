import React, { useEffect, useMemo, useState } from 'react';
import { useQtBridge } from '../bridge';

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const emptyAlias = { original: '', standardized: '' };
const emptyRule = { pattern: '', replacement: '', description: '', enabled: true };

export default function Dictionary() {
  const { callQt } = useQtBridge();
  const [activeTab, setActiveTab] = useState('artists');
  const [searchQuery, setSearchQuery] = useState('');
  const [aliases, setAliases] = useState([]);
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [aliasForm, setAliasForm] = useState(emptyAlias);
  const [ruleForm, setRuleForm] = useState(emptyRule);

  const loadData = async () => {
    const [aliasRows, ruleRows] = await Promise.all([
      callQt('list_artist_aliases'),
      callQt('list_cleanup_rules'),
    ]);
    setAliases(aliasRows || []);
    setRules(ruleRows || []);
  };

  useEffect(() => {
    loadData().catch(() => {});
  }, [callQt]);

  const artists = useMemo(() => aliases.filter((item) => (
    `${item.original} ${item.standardized}`.toLowerCase().includes(searchQuery.toLowerCase())
  )), [aliases, searchQuery]);

  const filteredRules = useMemo(() => rules.filter((item) => (
    `${item.pattern} ${item.description}`.toLowerCase().includes(searchQuery.toLowerCase())
  )), [rules, searchQuery]);

  const handleAdd = async () => {
    if (activeTab === 'artists') {
      if (!aliasForm.original.trim() || !aliasForm.standardized.trim()) return;
      await callQt('add_artist_alias', aliasForm.original, aliasForm.standardized);
      setAliasForm(emptyAlias);
    } else {
      if (!ruleForm.pattern.trim()) return;
      await callQt('add_cleanup_rule', ruleForm.pattern, ruleForm.replacement, ruleForm.description, ruleForm.enabled);
      setRuleForm(emptyRule);
    }
    setShowForm(false);
    await loadData();
  };

  const handleToggleRule = async (rule) => {
    await callQt('update_cleanup_rule', rule.id, rule.pattern, rule.replacement || '', rule.description || '', !rule.enabled);
    await loadData();
  };

  const handleDeleteRule = async (id) => {
    await callQt('delete_cleanup_rule', id);
    await loadData();
  };

  const handleDeleteAlias = async (id) => {
    await callQt('delete_artist_alias', id);
    await loadData();
  };

  return (
    <div className="page animate-fadeIn">
      <header className="page-header">
        <div>
          <p className="page-kicker">Tag dictionary</p>
          <h1 className="page-title">标签库</h1>
          <p className="page-copy">
            使用 SQLite 管理艺人映射和文本清洗规则。默认数据会在数据库初始化时写入，后续可以按你的音乐库继续沉淀。
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '收起' : (activeTab === 'artists' ? '添加映射' : '添加规则')}
        </button>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
        <div className="toolbar">
          <button type="button" onClick={() => { setActiveTab('artists'); setShowForm(false); }} className={`btn ${activeTab === 'artists' ? 'btn-primary' : 'btn-secondary'}`}>
            艺人映射
          </button>
          <button type="button" onClick={() => { setActiveTab('rules'); setShowForm(false); }} className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}`}>
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

      {showForm && (
        <section className="panel" style={{ padding: 16, marginBottom: 16 }}>
          {activeTab === 'artists' ? (
            <div className="review-grid">
              <input className="input" placeholder="原始名称，例如 G.E.M." value={aliasForm.original} onChange={(e) => setAliasForm({ ...aliasForm, original: e.target.value })} />
              <input className="input" placeholder="标准名称，例如 邓紫棋" value={aliasForm.standardized} onChange={(e) => setAliasForm({ ...aliasForm, standardized: e.target.value })} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, .45fr) minmax(0, .8fr) auto', gap: 10 }}>
              <input className="input" placeholder="匹配模式" value={ruleForm.pattern} onChange={(e) => setRuleForm({ ...ruleForm, pattern: e.target.value })} />
              <input className="input" placeholder="替换为" value={ruleForm.replacement} onChange={(e) => setRuleForm({ ...ruleForm, replacement: e.target.value })} />
              <input className="input" placeholder="说明" value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} />
              <label className="chip" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={ruleForm.enabled} onChange={(e) => setRuleForm({ ...ruleForm, enabled: e.target.checked })} />
                启用
              </label>
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>取消</button>
            <button type="button" className="btn btn-primary" onClick={handleAdd}>保存</button>
          </div>
        </section>
      )}

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
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {artists.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.original}</td>
                    <td style={{ fontWeight: 850, color: 'var(--ink)' }}>{item.standardized}</td>
                    <td>{item.usage_count || 0} 次</td>
                    <td><span className={`chip ${item.enabled ? 'chip-green' : ''}`}>{item.enabled ? '启用' : '停用'}</span></td>
                    <td>
                      <button type="button" className="btn btn-ghost" style={{ minHeight: 30, padding: '4px 8px', color: 'var(--red)' }} onClick={() => handleDeleteAlias(item.id)}>删除</button>
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
            <span className="chip chip-blue">{filteredRules.length} 条</span>
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
                {filteredRules.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.pattern}</td>
                    <td>{item.replacement || '(空)'}</td>
                    <td>{item.description}</td>
                    <td>
                      <button type="button" className={`chip ${item.enabled ? 'chip-green' : ''}`} onClick={() => handleToggleRule(item)}>
                        {item.enabled ? '启用' : '停用'}
                      </button>
                    </td>
                    <td>
                      <button type="button" className="btn btn-ghost" style={{ minHeight: 30, padding: '4px 8px', color: 'var(--red)' }} onClick={() => handleDeleteRule(item.id)}>删除</button>
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
