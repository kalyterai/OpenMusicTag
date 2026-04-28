import React, { useState } from 'react';
import useAppStore from '../stores/appStore';

// Icons
const Icons = {
  Music: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M12 13c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3 2 3 .895 3 2zM8.5 4v7.5a.5.5 0 00.5.5h1a.5.5 0 00.5-.5V4a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5z"/>
      <path d="M1 13h1c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1H1c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1z"/>
      <path d="M15 2v11h-1V2h1z"/>
    </svg>
  ),
  Folder: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
};

// 文件树项组件
function FileTreeItem({ item, level = 0, selected, onSelect }) {
  const [expanded, setExpanded] = useState(item.expanded || false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    }
    onSelect(item);
  };

  const paddingLeft = `${12 + level * 16}px`;

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          paddingLeft: paddingLeft,
          cursor: 'pointer',
          background: selected ? '#EEF2FF' : 'transparent',
          borderLeft: selected ? '3px solid #635BFF' : '3px solid transparent',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!selected) e.currentTarget.style.background = '#F5F7FA';
        }}
        onMouseLeave={(e) => {
          if (!selected) e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* 展开/收起箭头 */}
        <span style={{ marginRight: '6px', color: '#94A3B8' }}>
          {hasChildren ? (
            expanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />
          ) : (
            <span style={{ width: '16px' }} />
          )}
        </span>

        {/* 图标 */}
        <span style={{ 
          marginRight: '8px', 
          color: item.type === 'file' ? '#4361EE' : '#718096',
          display: 'flex',
        }}>
          {item.type === 'file' ? <Icons.Music /> : <Icons.Folder />}
        </span>

        {/* 名称 */}
        <span style={{
          fontSize: '13px',
          color: selected ? '#1A2027' : '#4A5568',
          fontWeight: selected ? 500 : 400,
        }}>
          {item.name}
        </span>

        {/* 年份标签 */}
        {item.year && (
          <span style={{
            marginLeft: '8px',
            fontSize: '11px',
            color: '#A0AEC0',
          }}>
            ({item.year})
          </span>
        )}
      </div>

      {/* 子项 */}
      {hasChildren && expanded && (
        <div>
          {item.children.map((child, index) => (
            <FileTreeItem
              key={index}
              item={child}
              level={level + 1}
              selected={selected?.path === child.path}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 右侧资源详情面板组件
function ResourcePanel({ selectedFile }) {
  const [searchQuery, setSearchQuery] = useState('');

  // 模拟文件树数据
  const fileTree = [
    {
      name: 'Jay Chou',
      type: 'folder',
      path: 'jay-chou',
      expanded: true,
      children: [
        {
          name: '七',
          type: 'folder',
          path: 'jay-chou/qili',
          children: [
            { name: '叶美.mp3', type: 'file', path: 'jay-chou/qili/ye-mei.mp3' },
          ],
        },
        {
          name: 'Unknown Album',
          type: 'folder',
          path: 'jay-chou/unknown',
        },
      ],
    },
  ];

  const handleSelectFile = (item) => {
    // 处理文件选择
  };

  return (
    <div style={{
      position: 'fixed',
      right: '24px',
      top: '80px',
      bottom: '40px',
      width: '280px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* 标题栏 */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A2027' }}>
          资源库详情
        </span>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          background: '#F0F3FF',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#4361EE',
        }}>
          <Icons.Plus />
        </button>
      </div>

      {/* 搜索框 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#A0AEC0',
          }}>
            <Icons.Search />
          </div>
          <input
            type="text"
            placeholder="搜索目录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              background: '#F7FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* 文件树列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {fileTree.map((item, index) => (
          <FileTreeItem
            key={index}
            item={item}
            selected={selectedFile}
            onSelect={handleSelectFile}
          />
        ))}
      </div>
    </div>
  );
}

export default function FilesPage() {
  const { currentPage, setCurrentPage } = useAppStore();

  return (
    <div style={{ 
      height: '100%', 
      background: '#F8F9FA',
      position: 'relative',
    }}>
      {/* 右侧资源详情面板 - 浮动侧边栏 */}
      <ResourcePanel />
    </div>
  );
}
