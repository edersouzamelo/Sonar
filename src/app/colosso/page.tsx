import { ChatAssistant } from "@/components/chat-assistant";

export default function ColossoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-baseline gap-2 text-3xl font-bold text-radar-dark">
          Agente Colosso
          <span className="text-xs font-normal text-muted-foreground opacity-50">v1.3.0</span>
        </h1>
      </div>

      <div className="flex h-full flex-col">
        <ChatAssistant />
      </div>
    </div>
  );
}
