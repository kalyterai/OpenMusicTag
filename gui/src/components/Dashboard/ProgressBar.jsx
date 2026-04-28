import React from 'react';

export default function ProgressBar({ progress, text = '' }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-neutral-600">处理进度</span>
        <span className="text-primary-600 font-medium">{progress.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {text && (
        <p className="text-sm text-neutral-500 mt-2 animate-pulse">{text}</p>
      )}
    </div>
  );
}