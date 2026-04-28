import React from 'react';

// SVG Icons
const Icons = {
  Folder: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  List: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

const steps = [
  { id: 1, label: '选择目录', icon: Icons.Folder },
  { id: 2, label: '确认文件', icon: Icons.List },
  { id: 3, label: '处理设置', icon: Icons.Settings },
  { id: 4, label: '开始处理', icon: Icons.Play },
];

export default function WizardSteps({ currentStep, onStepClick, completedSteps = [] }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id);
          const isClickable = step.id <= Math.max(...completedSteps, currentStep);

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : isCompleted
                    ? 'bg-primary-50 text-primary-600'
                    : 'bg-neutral-50 text-neutral-400'
                } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive
                    ? 'bg-white text-primary-600'
                    : isCompleted
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-200 text-neutral-500'
                }`}>
                  {isCompleted ? <Icons.Check /> : step.id}
                </div>
                <span className="font-medium text-sm hidden sm:inline">{step.label}</span>
                <Icon />
              </button>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  isCompleted ? 'bg-primary-600' : 'bg-neutral-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
