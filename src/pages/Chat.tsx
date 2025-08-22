import { DualPaneLayout } from '@/components/DualPaneLayout';
import { ChatPanel } from '@/components/ChatPanel';
import { ExecutorPanel } from '@/components/ExecutorPanel';

export function Chat() {
  return (
    <DualPaneLayout
      leftPanel={<ChatPanel />}
      rightPanel={<ExecutorPanel />}
    />
  );
}
