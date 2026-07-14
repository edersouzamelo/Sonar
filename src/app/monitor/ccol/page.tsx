import { MonitorClient } from "@/components/presentations/monitor-client";
import { getPresentationWorkspaceSnapshot } from "@/lib/presentations/store";

export const dynamic = "force-dynamic";

export default function CcolMonitorPage() {
    const workspace = getPresentationWorkspaceSnapshot();
    const slides = workspace.presentations
        .filter(presentation => presentation.isConsolidated || presentation.classKey === "ccol")
        .flatMap(presentation => presentation.slides)
        .filter(slide => slide.publishToMonitor && !slide.isHidden)
        .sort((a, b) => a.position - b.position);

    return (
        <MonitorClient
            title="Monitor CCOL"
            subtitle="Briefing consolidado"
            slides={slides}
            exitHref="/apresentacoes"
        />
    );
}
