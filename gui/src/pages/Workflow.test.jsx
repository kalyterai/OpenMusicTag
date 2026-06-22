import { describe, expect, it } from 'vitest';
import { deriveOutputPath } from './Workflow';

describe('Workflow 输出目录默认规则', () => {
  it('使用输入目录同级目录并追加 _OUTPUT', () => {
    expect(deriveOutputPath('/Users/demo/Music/test')).toBe('/Users/demo/Music/test_OUTPUT');
  });

  it('兼容 Windows 风格路径', () => {
    expect(deriveOutputPath('D:\\Music\\test')).toBe('D:\\Music\\test_OUTPUT');
  });

  it('忽略末尾路径分隔符', () => {
    expect(deriveOutputPath('/Users/demo/Music/test/')).toBe('/Users/demo/Music/test_OUTPUT');
  });
});
