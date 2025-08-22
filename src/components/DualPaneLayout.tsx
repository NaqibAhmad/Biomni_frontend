import { ReactNode } from 'react';

interface DualPaneLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  className?: string;
}

export function DualPaneLayout({ leftPanel, rightPanel, className = '' }: DualPaneLayoutProps) {
  return (
    <div className={`h-full flex ${className}`}>
      {/* Left Panel - Chat Interface */}
      <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
        {leftPanel}
      </div>
      
      {/* Right Panel - Executor */}
      <div className="w-1/2 flex flex-col">
        {rightPanel}
      </div>
    </div>
  );
}
