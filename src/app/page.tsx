import { ChatAssistant } from "@/components/chat-assistant";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-radar-dark dark:text-radar-cream flex items-baseline gap-2">
          Dashboard
          <span className="text-xs font-normal text-muted-foreground opacity-50">v1.3.0</span>
        </h1>
      </div>

      <div className="flex flex-col h-full">
        <ChatAssistant />
      </div>
    </div>
  );
}
