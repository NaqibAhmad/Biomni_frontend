import { DualPaneLayout } from '@/components/DualPaneLayout';
import { ChatPanel } from '@/components/ChatPanel';
import { ExecutorPanel } from '@/components/ExecutorPanel';
import { useAgentStore } from '@/store/agentStore';

export function Chat() {
  const { streamingLogs, isStreaming } = useAgentStore();
  
  return (
    <DualPaneLayout
      leftPanel={<ChatPanel />}
      rightPanel={<ExecutorPanel streamingLogs={streamingLogs} isStreaming={isStreaming} />}
    />
  );
}
