/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Typeless 风格配色
        // 主背景色 - 浅灰
        'app-bg': '#F5F5F7',
        
        // 侧边栏背景 - 稍深的灰色
        'sidebar-bg': '#EBEBEB',
        'sidebar-active': '#E0E0E0',
        
        // 卡片背景 - 白色
        'card-bg': '#FFFFFF',
        'card-hover': '#F9F9F9',
        
        // 中性灰系
        'neutral': {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        
        // 主色调 - 蓝色
        primary: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        
        // 功能色
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        
        // 推广卡片渐变
        'promo-blue': {
          start: '#E0F2FE',
          end: '#DBEAFE',
        },
        'promo-pink': {
          start: '#FCE7F3',
          end: '#FDF2F8',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}