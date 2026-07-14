import { notFound } from "next/navigation";
import { MonitorClient } from "@/components/presentations/monitor-client";
import { findPresentation } from "@/lib/presentations/store";

export const dynamic = "force-dynamic";

export default async function PresentationStagePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const presentation = findPresentation(id);
    if (!presentation) notFound();

    const slides = presentation.slides
        .filter(slide => !slide.isHidden)
        .sort((a, b) => a.position - b.position)
        .map(slide => ({
            ...slide,
            backgroundImage: slide.backgroundImage || presentation.backgroundImage,
            textColor: slide.textColor || "#FFFFFF",
        }));

    return (
        <MonitorClient
            title={presentation.title}
            subtitle={presentation.context}
            slides={slides}
            exitHref={`/classes/apresentacoes?classe=${presentation.classKey}`}
        />
    );
}
