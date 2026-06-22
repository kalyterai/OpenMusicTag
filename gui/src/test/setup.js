// Vitest 全局测试初始化：注入 @testing-library/jest-dom 断言匹配器
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 每个用例后卸载渲染的组件，避免相互污染
afterEach(() => {
  cleanup();
});
