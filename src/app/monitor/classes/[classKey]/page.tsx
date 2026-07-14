import { MonitorClient } from "@/components/presentations/monitor-client";
import { getPresentationWorkspaceSnapshot } from "@/lib/presentations/store";
import { getSupplyClass } from "@/lib/supply-classes";

export const dynamic = "force-dynamic";

export default async function ClassMonitorPage({ params }: { params: Promise<{ classKey: string }> }) {
    const { classKey } = await params;
    const selectedClass = getSupplyClass(classKey);
    const workspace = getPresentationWorkspaceSnapshot();
    const slides = workspace.presentations
        .filter(presentation => presentation.classKey === selectedClass.key && !presentation.isConsolidated)
        .flatMap(presentation => presentation.slides)
        .filter(slide => slide.publishToMonitor && !slide.isHidden)
        .sort((a, b) => a.position - b.position);

    return (
        <MonitorClient
            title={`Monitor ${selectedClass.shortLabel}`}
            subtitle="Slides publicados"
            slides={slides}
            exitHref={`/classes/apresentacoes?classe=${selectedClass.key}`}
        />
    );
}
