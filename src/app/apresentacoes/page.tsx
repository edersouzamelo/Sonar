"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown, Monitor, Plus, Presentation, RefreshCw } from "lucide-react";
import { PresentationSlidePreview } from "@/components/presentations/slide-preview";
import { supabase } from "@/lib/supabase";
import type { ClassPresentation, PresentationSlide, PresentationWorkspace } from "@/lib/presentations/types";

type ApiPayload = {
    workspace: PresentationWorkspace;
    presentation?: ClassPresentation;
    error?: string;
};

const pptxName = (title: string) =>
    `${title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "briefing-ccol"}.pptx`;

export default function PresentationsHubPage() {
    const [workspace, setWorkspace] = useState<PresentationWorkspace | null>(null);
    const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
    const [title, setTitle] = useState("Briefing logistico consolidado");
    const [context, setContext] = useState("Consolidacao CCOL");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    const getAuthHeaders = async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Sessao ausente. Entre novamente no SONAR.");
        return { Authorization: `Bearer ${token}` };
    };

    const loadWorkspace = async () => {
        setBusy(true);
        setError("");
        try {
            const headers = await getAuthHeaders();
            const response = await fetch("/api/classes/presentations", { headers, cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "Falha ao carregar apresentacoes.");
            setWorkspace(payload.workspace);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao carregar apresentacoes.");
        } finally {
            setBusy(false);
        }
    };

    const createConsolidated = async () => {
        setBusy(true);
        setError("");
        try {
            const headers = await getAuthHeaders();
            const response = await fetch("/api/classes/presentations", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ action: "createConsolidated", title, context, selectedSlideIds }),
            });
            const payload: ApiPayload = await response.json();
            if (!response.ok) throw new Error(payload.error || "Falha ao consolidar.");
            setWorkspace(payload.workspace);
            setSelectedSlideIds([]);
            setNotice("Apresentacao consolidada criada.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao consolidar.");
        } finally {
            setBusy(false);
        }
    };

    const exportPptx = async (presentation: ClassPresentation) => {
        setBusy(true);
        setError("");
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/classes/presentations/${presentation.id}/export`, { headers, cache: "no-store" });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || "Falha ao exportar PPTX.");
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = pptxName(presentation.title);
            link.click();
            URL.revokeObjectURL(url);
            setNotice("PPTX exportado.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao exportar PPTX.");
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        void loadWorkspace();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sourceSlides = useMemo(() => {
        return (workspace?.presentations || [])
            .filter(presentation => !presentation.isConsolidated && presentation.classKey !== "ccol")
            .flatMap(presentation => presentation.slides
                .filter(slide => !slide.isHidden)
                .map(slide => ({ presentation, slide })));
    }, [workspace]);

    const consolidated = useMemo(() => {
        return (workspace?.presentations || [])
            .filter(presentation => presentation.isConsolidated || presentation.classKey === "ccol")
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }, [workspace]);

    const previewSlide: PresentationSlide | undefined =
        sourceSlides.find(item => selectedSlideIds.includes(item.slide.id))?.slide || sourceSlides[0]?.slide;

    const toggleSlide = (slideId: string) => {
        setSelectedSlideIds(current =>
            current.includes(slideId)
                ? current.filter(id => id !== slideId)
                : [...current, slideId],
        );
    };

    return (
        <div className="space-y-5 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href="/classes" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-radar-dark">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para Classes
                </Link>
                <Link href="/monitor/ccol" className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-radar-dark shadow-sm transition hover:border-radar-gold">
                    <Monitor className="h-4 w-4" />
                    Monitor CCOL
                </Link>
            </div>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-radar-gold">SONAR / CCOL</p>
                        <h1 className="mt-2 text-3xl font-black text-radar-dark">Consolidacao de apresentacoes</h1>
                        <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                            Selecione slides preparados pelas classes, gere um briefing consolidado e envie para palco, PPTX ou monitor.
                        </p>
                    </div>
                    <button type="button" onClick={loadWorkspace} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-radar-dark transition hover:border-radar-gold disabled:opacity-50">
                        <RefreshCw className="h-4 w-4" />
                        Atualizar
                    </button>
                </div>
                {(notice || error) && (
                    <div className={`mt-4 rounded-md px-3 py-2 text-sm font-bold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {error || notice}
                    </div>
                )}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1fr_24rem]">
                <main className="space-y-4">
                    {previewSlide && <PresentationSlidePreview slide={previewSlide} />}

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Slides das classes</h2>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{selectedSlideIds.length} selecionado(s)</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <input value={title} onChange={event => setTitle(event.target.value)} className="h-10 rounded-md border border-slate-200 px-3 text-sm font-bold text-radar-dark" />
                                <input value={context} onChange={event => setContext(event.target.value)} className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-700" />
                                <button type="button" onClick={createConsolidated} disabled={busy || selectedSlideIds.length === 0} className="inline-flex h-10 items-center gap-2 rounded-md bg-radar-dark px-3 text-sm font-black text-white transition hover:bg-black disabled:opacity-50">
                                    <Plus className="h-4 w-4" />
                                    Consolidar
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-2 md:grid-cols-2">
                            {sourceSlides.map(({ presentation, slide }) => (
                                <label key={slide.id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${selectedSlideIds.includes(slide.id) ? "border-radar-gold bg-radar-gold/10" : "border-slate-200 hover:border-radar-gold/60"}`}>
                                    <input type="checkbox" checked={selectedSlideIds.includes(slide.id)} onChange={() => toggleSlide(slide.id)} className="mt-1" />
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-black text-radar-dark">{slide.content.title || slide.title}</span>
                                        <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{presentation.title} | {presentation.classKey}</span>
                                    </span>
                                </label>
                            ))}
                            {!sourceSlides.length && <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhum slide disponivel para consolidacao.</p>}
                        </div>
                    </div>
                </main>

                <aside className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Briefings consolidados</h2>
                        <div className="mt-3 space-y-2">
                            {consolidated.map(presentation => (
                                <div key={presentation.id} className="rounded-md border border-slate-200 p-3">
                                    <div className="flex items-start gap-2">
                                        <Presentation className="mt-0.5 h-4 w-4 shrink-0 text-radar-gold" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-radar-dark">{presentation.title}</p>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">{presentation.slides.length} slides | {presentation.status}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <Link href={`/apresentacoes/${presentation.id}/apresentar`} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                            Palco
                                        </Link>
                                        <button type="button" onClick={() => void exportPptx(presentation)} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                            <FileDown className="h-4 w-4" />
                                            PPTX
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {!consolidated.length && <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhum briefing consolidado ainda.</p>}
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    );
}
