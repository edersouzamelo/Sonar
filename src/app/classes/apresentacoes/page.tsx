"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, BarChart3, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Copy, Eye, FileDown, FileText, Library, Monitor, Plus, RefreshCw, Save, Table2, Trash2, Type, UploadCloud } from "lucide-react";
import { PresentationSlidePreview } from "@/components/presentations/slide-preview";
import { supabase } from "@/lib/supabase";
import { defaultSupplyClassKey, getSupplyClass, supplyClasses } from "@/lib/supply-classes";
import type { ClassPresentation, PresentationAsset, PresentationSlide, PresentationStatus, PresentationWorkspace, SlideType } from "@/lib/presentations/types";

type ApiPayload = {
    workspace: PresentationWorkspace;
    statuses: PresentationStatus[];
    slideTypes: SlideType[];
    presentation?: ClassPresentation;
    slide?: PresentationSlide;
    asset?: PresentationAsset;
    error?: string;
};

const statusTone: Record<PresentationStatus, string> = {
    Rascunho: "bg-slate-100 text-slate-700",
    "Em elaboracao": "bg-amber-100 text-amber-800",
    Pronta: "bg-emerald-100 text-emerald-800",
    Conferido: "bg-blue-100 text-blue-800",
    Arquivada: "bg-slate-800 text-white",
};

const initialPresentationDraft = {
    title: "",
    context: "",
    presentationDate: "",
    status: "Rascunho" as PresentationStatus,
    responsible: "",
    notes: "",
};

const normalizeFileName = (title: string) =>
    `${title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "apresentacao-sonar"}.pptx`;

export default function ApresentacoesPage() {
    const searchParams = useSearchParams();
    const initialClassKey = searchParams.get("classe") || defaultSupplyClassKey;
    const [classKey, setClassKey] = useState(initialClassKey);
    const selectedClass = getSupplyClass(classKey);
    const [workspace, setWorkspace] = useState<PresentationWorkspace | null>(null);
    const [selectedPresentationId, setSelectedPresentationId] = useState("");
    const [selectedSlideId, setSelectedSlideId] = useState("");
    const [slideType, setSlideType] = useState<SlideType>("livre");
    const [newTitle, setNewTitle] = useState(`Briefing ${selectedClass.shortLabel}`);
    const [newContext, setNewContext] = useState("Briefing logistico");
    const [presentationDraft, setPresentationDraft] = useState(initialPresentationDraft);
    const [slideDraft, setSlideDraft] = useState<PresentationSlide | null>(null);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const assetInputRef = useRef<HTMLInputElement | null>(null);
    const templateInputRef = useRef<HTMLInputElement | null>(null);
    const backgroundInputRef = useRef<HTMLInputElement | null>(null);

    const presentations = useMemo(
        () => (workspace?.presentations || []).filter(presentation => presentation.classKey === classKey && !presentation.isConsolidated),
        [workspace, classKey],
    );
    const selectedPresentation = useMemo(
        () => presentations.find(presentation => presentation.id === selectedPresentationId) || presentations[0],
        [presentations, selectedPresentationId],
    );
    const selectedSlide = useMemo(
        () => selectedPresentation?.slides.find(slide => slide.id === selectedSlideId) || selectedPresentation?.slides[0],
        [selectedPresentation, selectedSlideId],
    );
    const sortedSlides = useMemo(
        () => [...(selectedPresentation?.slides || [])].sort((a, b) => a.position - b.position),
        [selectedPresentation],
    );
    const selectedSlideIndex = useMemo(
        () => sortedSlides.findIndex(slide => slide.id === selectedSlide?.id),
        [selectedSlide?.id, sortedSlides],
    );
    const previewSlide = useMemo(
        () => slideDraft ? ({
            ...slideDraft,
            backgroundImage: slideDraft.backgroundImage || selectedPresentation?.backgroundImage,
            textColor: slideDraft.textColor || "#FFFFFF",
        }) : null,
        [selectedPresentation?.backgroundImage, slideDraft],
    );

    const applyPayload = (payload: ApiPayload) => {
        setWorkspace(payload.workspace);
        if (payload.presentation?.id) setSelectedPresentationId(payload.presentation.id);
        if (payload.slide?.id) setSelectedSlideId(payload.slide.id);
    };

    const getAuthHeaders = async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const isLocalHost = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
        if (isLocalHost) {
            return {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                "x-sonar-local-dev": "true",
            };
        }
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
            applyPayload(payload);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao carregar apresentacoes.");
        } finally {
            setBusy(false);
        }
    };

    const sendJson = async (body: Record<string, unknown>, successMessage: string) => {
        setBusy(true);
        setError("");
        try {
            const headers = await getAuthHeaders();
            const response = await fetch("/api/classes/presentations", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "Falha ao salvar.");
            applyPayload(payload);
            setNotice(successMessage);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao salvar.");
        } finally {
            setBusy(false);
        }
    };

    const uploadFile = async (file: File, action: "uploadAsset" | "uploadTemplate") => {
        if (!selectedPresentation && action === "uploadAsset") return;
        setBusy(true);
        setError("");
        try {
            const headers = await getAuthHeaders();
            const formData = new FormData();
            formData.append("action", action);
            formData.append("file", file);
            formData.append("classKey", classKey);
            if (selectedPresentation) formData.append("presentationId", selectedPresentation.id);
            if (selectedSlide) formData.append("slideId", selectedSlide.id);
            if (action === "uploadTemplate") {
                formData.append("name", file.name.replace(/\.[^.]+$/, ""));
                formData.append("purpose", `Modelo importado para ${selectedClass.shortLabel}`);
            }

            const response = await fetch("/api/classes/presentations", { method: "POST", headers, body: formData });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "Falha ao enviar arquivo.");
            applyPayload(payload);
            setNotice(action === "uploadTemplate" ? "Modelo importado." : "Arquivo anexado.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao enviar arquivo.");
        } finally {
            setBusy(false);
        }
    };

    const handleFileInput = (event: ChangeEvent<HTMLInputElement>, action: "uploadAsset" | "uploadTemplate") => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void uploadFile(file, action);
    };

    const handleBackgroundInput = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Selecione uma imagem para o fundo do slide.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || "");
            if (!selectedPresentation) return;
            void sendJson({
                action: "updatePresentation",
                presentationId: selectedPresentation.id,
                patch: { backgroundImage: { dataUrl, fileName: file.name } },
            }, "Imagem de fundo salva para toda a apresentacao.");
        };
        reader.onerror = () => setError("Falha ao carregar imagem de fundo.");
        reader.readAsDataURL(file);
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
            link.download = normalizeFileName(presentation.title);
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

    useEffect(() => {
        setNewTitle(`Briefing ${selectedClass.shortLabel}`);
    }, [selectedClass.shortLabel]);

    useEffect(() => {
        if (!selectedPresentation && presentations[0]) setSelectedPresentationId(presentations[0].id);
    }, [presentations, selectedPresentation]);

    useEffect(() => {
        if (!selectedPresentation) {
            setPresentationDraft(initialPresentationDraft);
            return;
        }
        setPresentationDraft({
            title: selectedPresentation.title,
            context: selectedPresentation.context,
            presentationDate: selectedPresentation.presentationDate || "",
            status: selectedPresentation.status,
            responsible: selectedPresentation.responsible,
            notes: selectedPresentation.notes || "",
        });
        if (!selectedSlide && selectedPresentation.slides[0]) setSelectedSlideId(selectedPresentation.slides[0].id);
    }, [selectedPresentation, selectedSlide]);

    useEffect(() => {
        setSlideDraft(selectedSlide ? JSON.parse(JSON.stringify(selectedSlide)) : null);
    }, [selectedSlide]);

    const createNewPresentation = () => sendJson({
        action: "createPresentation",
        title: newTitle,
        classKey,
        context: newContext,
        responsible: "Operador SONAR",
    }, "Apresentacao criada.");

    const savePresentation = () => selectedPresentation && sendJson({
        action: "updatePresentation",
        presentationId: selectedPresentation.id,
        patch: presentationDraft,
    }, "Dados da apresentacao salvos.");

    const saveSlide = () => selectedPresentation && slideDraft && sendJson({
        action: "updateSlide",
        presentationId: selectedPresentation.id,
        slideId: slideDraft.id,
        patch: slideDraft,
    }, "Slide salvo.");

    const persistSlidePatch = (patch: Partial<PresentationSlide>, message: string) => {
        if (!selectedPresentation || !slideDraft) return;
        const nextSlide = { ...slideDraft, ...patch };
        setSlideDraft(nextSlide);
        void sendJson({
            action: "updateSlide",
            presentationId: selectedPresentation.id,
            slideId: slideDraft.id,
            patch: nextSlide,
        }, message);
    };

    const goToSlide = (direction: "previous" | "next") => {
        if (!sortedSlides.length) return;
        const fallbackIndex = selectedSlideIndex >= 0 ? selectedSlideIndex : 0;
        const nextIndex = direction === "previous"
            ? Math.max(0, fallbackIndex - 1)
            : Math.min(sortedSlides.length - 1, fallbackIndex + 1);
        setSelectedSlideId(sortedSlides[nextIndex].id);
    };

    const addTextBox = () => {
        setSlideDraft(current => {
            if (!current) return current;
            const body = current.content.body?.trim()
                ? `${current.content.body}\n\nNova caixa de texto.`
                : "Nova caixa de texto.";
            return { ...current, content: { ...current.content, body } };
        });
    };

    const updateSlideContent = (field: keyof PresentationSlide["content"], value: string) => {
        setSlideDraft(current => current ? {
            ...current,
            title: field === "title" ? value : current.title,
            content: { ...current.content, [field]: value },
        } : current);
    };

    return (
        <div className="space-y-5 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/classes?classe=${classKey}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-radar-dark">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para {selectedClass.shortLabel}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/monitor/classes/${classKey}`} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-radar-dark shadow-sm transition hover:border-radar-gold">
                        <Monitor className="h-4 w-4" />
                        Monitor da classe
                    </Link>
                    <Link href="/apresentacoes" className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-radar-dark shadow-sm transition hover:border-radar-gold">
                        <Library className="h-4 w-4" />
                        Consolidar CCOL
                    </Link>
                </div>
            </div>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-radar-gold">SONAR / Classes</p>
                        <h1 className="mt-2 text-3xl font-black text-radar-dark">Apresentacoes</h1>
                        <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                            Editor de briefings por classe, com biblioteca de slides, anexos rastreados, monitor de TV e consolidacao para o CCOL.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select value={classKey} onChange={event => setClassKey(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-radar-dark">
                            {supplyClasses.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                        </select>
                        <button type="button" onClick={loadWorkspace} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-radar-dark transition hover:border-radar-gold disabled:opacity-50">
                            <RefreshCw className="h-4 w-4" />
                            Atualizar
                        </button>
                    </div>
                </div>
                {(notice || error) && (
                    <div className={`mt-4 rounded-md px-3 py-2 text-sm font-bold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {error || notice}
                    </div>
                )}
            </section>

            <section className="grid gap-4 xl:grid-cols-[18rem_1fr_22rem]">
                <aside className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Demandas da Secao</h2>
                        <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
                            Novas apresentacoes sao criadas pela Secao de Planejamento e aparecem aqui com o mesmo nome para edicao da classe.
                        </p>
                        <Link href="/secao-planejamento" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                            <ClipboardList className="h-4 w-4" />
                            Abrir planejamento
                        </Link>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Briefings</h2>
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{presentations.length}</span>
                        </div>
                        <div className="mt-3 space-y-2">
                            {presentations.map(presentation => (
                                <button
                                    key={presentation.id}
                                    type="button"
                                    onClick={() => setSelectedPresentationId(presentation.id)}
                                    className={`w-full rounded-md border p-3 text-left transition ${selectedPresentation?.id === presentation.id ? "border-radar-gold bg-radar-gold/10" : "border-slate-200 hover:border-radar-gold/60"}`}
                                >
                                    <p className="line-clamp-2 text-sm font-black text-radar-dark">{presentation.title}</p>
                                    <span className={`mt-2 inline-flex rounded-md px-2 py-1 text-[11px] font-black uppercase ${statusTone[presentation.status]}`}>{presentation.status}</span>
                                </button>
                            ))}
                            {!presentations.length && <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhuma apresentacao desta classe.</p>}
                        </div>
                    </div>

                    {selectedPresentation && (
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Slides</h2>
                            <div className="mt-3 space-y-2">
                                {sortedSlides.map(slide => (
                                    <button
                                        key={slide.id}
                                        type="button"
                                        onClick={() => setSelectedSlideId(slide.id)}
                                        className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition ${selectedSlide?.id === slide.id ? "border-radar-dark bg-slate-50" : "border-slate-200 hover:border-radar-gold/60"}`}
                                    >
                                        <span className="min-w-0 truncate text-sm font-bold text-radar-dark">{slide.position}. {slide.content.title || slide.title}</span>
                                        {slide.publishToMonitor && <Monitor className="h-4 w-4 shrink-0 text-emerald-600" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>

                <main className="space-y-4">
                    {previewSlide ? (
                        <div className="relative">
                            <PresentationSlidePreview
                                slide={previewSlide}
                                className="[&_.slide-preview-content]:pt-20"
                                onContentChange={updateSlideContent}
                                onTextBoxChange={textBox => setSlideDraft(current => current ? ({ ...current, textBox }) : current)}
                            />
                            {selectedPresentation && (
                                <div className="absolute left-5 right-5 top-5 z-10 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1 rounded-md border border-white/10 bg-black/60 p-1 text-white shadow-lg backdrop-blur">
                                        <button type="button" onClick={() => sendJson({ action: "addSlide", presentationId: selectedPresentation.id, slideType }, "Slide adicionado.")} disabled={busy} className="inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-black uppercase text-white/85 transition hover:bg-white/15 hover:text-white disabled:opacity-50" title="Criar slide">
                                            <Plus className="h-4 w-4" />
                                            Slide
                                        </button>
                                        <select value={slideType} onChange={event => setSlideType(event.target.value as SlideType)} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs font-bold text-radar-dark outline-none transition hover:border-radar-gold focus:border-radar-gold">
                                            {["livre", "indicadores", "tabela", "grafico", "processos", "alerta", "imagem", "branco"].map(type => <option key={type} value={type} className="bg-white text-radar-dark">{type}</option>)}
                                        </select>
                                        <span className="mx-1 h-5 w-px bg-white/15" />
                                        <button type="button" onClick={() => goToSlide("previous")} disabled={busy || selectedSlideIndex <= 0} className="inline-flex h-8 w-8 items-center justify-center rounded text-white/85 transition hover:bg-white/15 hover:text-white disabled:opacity-35" aria-label="Voltar slide" title="Voltar slide">
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button type="button" onClick={() => goToSlide("next")} disabled={busy || selectedSlideIndex < 0 || selectedSlideIndex >= sortedSlides.length - 1} className="inline-flex h-8 w-8 items-center justify-center rounded text-white/85 transition hover:bg-white/15 hover:text-white disabled:opacity-35" aria-label="Avancar slide" title="Avancar slide">
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                        <span className="px-2 text-xs font-black text-white/55">{selectedSlideIndex + 1}/{sortedSlides.length}</span>
                                        <span className="mx-1 h-5 w-px bg-white/15" />
                                        <button type="button" onClick={addTextBox} disabled={busy} className="inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-black uppercase text-white/85 transition hover:bg-white/15 hover:text-white disabled:opacity-50" title="Adicionar caixa de texto">
                                            <Type className="h-4 w-4" />
                                            Texto
                                        </button>
                                        <button type="button" onClick={() => sendJson({ action: "addSlide", presentationId: selectedPresentation.id, slideType: "tabela" }, "Slide de tabela adicionado.")} disabled={busy} className="inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-black uppercase text-white/85 transition hover:bg-white/15 hover:text-white disabled:opacity-50" title="Adicionar tabela">
                                            <Table2 className="h-4 w-4" />
                                            Tabela
                                        </button>
                                    </div>
                                    <button type="button" onClick={() => sendJson({ action: "deleteSlide", presentationId: selectedPresentation.id, slideId: previewSlide.id }, "Slide excluido.")} disabled={busy || sortedSlides.length <= 1} className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-black uppercase text-red-800 shadow-sm transition hover:bg-red-100 disabled:opacity-40" title="Remover slide">
                                        <Trash2 className="h-4 w-4" />
                                        Remover
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm font-bold text-slate-500">
                            Selecione ou crie uma apresentacao.
                        </div>
                    )}

                    {selectedPresentation && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Anexos e dados</h2>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <input ref={assetInputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls,.pdf,.docx,.pptx,.png,.jpg,.jpeg" onChange={event => handleFileInput(event, "uploadAsset")} />
                                    <input ref={templateInputRef} type="file" className="hidden" accept=".pptx" onChange={event => handleFileInput(event, "uploadTemplate")} />
                                    <button type="button" onClick={() => assetInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                        <UploadCloud className="h-4 w-4" />
                                        Anexar
                                    </button>
                                    <button type="button" onClick={() => templateInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                        <FileText className="h-4 w-4" />
                                        Modelo PPTX
                                    </button>
                                </div>
                                <div className="mt-3 space-y-2">
                                    {selectedPresentation.assets.map(asset => (
                                        <div key={asset.id} className="rounded-md border border-slate-200 p-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-black text-radar-dark">{asset.fileName}</p>
                                                    <p className="mt-1 text-xs font-semibold text-slate-500">{asset.processingStatus} | {(asset.sizeBytes / 1024).toFixed(1)} KB</p>
                                                </div>
                                                {asset.parsedPreview && (
                                                    <div className="flex gap-1">
                                                        <button type="button" onClick={() => sendJson({ action: "createTableFromAsset", presentationId: selectedPresentation.id, assetId: asset.id }, "Slide de tabela criado.")} className="rounded-md bg-slate-100 p-2 text-radar-dark" aria-label="Criar tabela">
                                                            <Table2 className="h-4 w-4" />
                                                        </button>
                                                        <button type="button" onClick={() => sendJson({ action: "createChartFromAsset", presentationId: selectedPresentation.id, assetId: asset.id }, "Slide de grafico criado.")} className="rounded-md bg-slate-100 p-2 text-radar-dark" aria-label="Criar grafico">
                                                            <BarChart3 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {!selectedPresentation.assets.length && <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-500">Sem anexos importados.</p>}
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Biblioteca da classe</h2>
                                <div className="mt-3 space-y-2">
                                    {(workspace?.slideLibrary || []).filter(item => item.classKey === classKey).map(item => (
                                        <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 p-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-radar-dark">{item.title}</p>
                                                <p className="text-xs font-semibold text-slate-500">{item.slideType}</p>
                                            </div>
                                            <button type="button" onClick={() => sendJson({ action: "addSlideFromLibrary", presentationId: selectedPresentation.id, libraryItemId: item.id }, "Slide inserido da biblioteca.")} className="rounded-md bg-radar-gold px-3 py-2 text-xs font-black text-radar-dark">Inserir</button>
                                        </div>
                                    ))}
                                    {!(workspace?.slideLibrary || []).some(item => item.classKey === classKey) && <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhum slide salvo ainda.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                <aside className="space-y-4">
                    {selectedPresentation && (
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Apresentacao</h2>
                                <button type="button" onClick={savePresentation} className="rounded-md bg-radar-dark p-2 text-white" aria-label="Salvar apresentacao">
                                    <Save className="h-4 w-4" />
                                </button>
                            </div>
                            <label className="mt-3 block text-xs font-black uppercase text-slate-500">Titulo</label>
                            <input value={presentationDraft.title} onChange={event => setPresentationDraft(current => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-bold" />
                            <label className="mt-3 block text-xs font-black uppercase text-slate-500">Contexto</label>
                            <input value={presentationDraft.context} onChange={event => setPresentationDraft(current => ({ ...current, context: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500">Data</label>
                                    <input type="date" value={presentationDraft.presentationDate} onChange={event => setPresentationDraft(current => ({ ...current, presentationDate: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500">Status</label>
                                    <select value={presentationDraft.status} onChange={event => setPresentationDraft(current => ({ ...current, status: event.target.value as PresentationStatus }))} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                                        {Object.keys(statusTone).map(status => <option key={status} value={status}>{status}</option>)}
                                    </select>
                                </div>
                            </div>
                            <label className="mt-3 block text-xs font-black uppercase text-slate-500">Notas</label>
                            <textarea value={presentationDraft.notes} onChange={event => setPresentationDraft(current => ({ ...current, notes: event.target.value }))} className="mt-1 h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => sendJson({ action: "updatePresentation", presentationId: selectedPresentation.id, patch: { status: "Pronta" } }, "Apresentacao marcada como pronta para conferencia.")} disabled={selectedPresentation.status === "Pronta" || selectedPresentation.status === "Conferido"} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-xs font-black uppercase text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Dar pronto
                                </button>
                                <button type="button" onClick={() => void exportPptx(selectedPresentation)} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                    <FileDown className="h-4 w-4" />
                                    PPTX
                                </button>
                                <Link href={`/apresentacoes/${selectedPresentation.id}/apresentar`} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                    <Eye className="h-4 w-4" />
                                    Palco
                                </Link>
                                <button type="button" onClick={() => sendJson({ action: "duplicatePresentation", presentationId: selectedPresentation.id }, "Apresentacao duplicada.")} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                    <Copy className="h-4 w-4" />
                                    Copiar
                                </button>
                                <button type="button" onClick={() => sendJson({ action: "deletePresentation", presentationId: selectedPresentation.id }, "Apresentacao excluida.")} className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-black uppercase text-red-700 transition hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                    Excluir
                                </button>
                            </div>
                        </div>
                    )}

                    {slideDraft && selectedPresentation && (
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Slide</h2>
                                <button type="button" onClick={saveSlide} className="rounded-md bg-radar-dark p-2 text-white" aria-label="Salvar slide">
                                    <Save className="h-4 w-4" />
                                </button>
                            </div>
                            <label className="mt-3 block text-xs font-black uppercase text-slate-500">Titulo</label>
                            <input value={slideDraft.content.title} onChange={event => updateSlideContent("title", event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-bold" />
                            <label className="mt-3 block text-xs font-black uppercase text-slate-500">Subtitulo</label>
                            <input value={slideDraft.content.subtitle || ""} onChange={event => updateSlideContent("subtitle", event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                            <label className="mt-3 block text-xs font-black uppercase text-slate-500">Texto</label>
                            <textarea value={slideDraft.content.body || ""} onChange={event => updateSlideContent("body", event.target.value)} className="mt-1 h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <label className="block text-xs font-black uppercase text-slate-500">
                                    Fundo
                                    <input type="color" value={slideDraft.backgroundColor} onChange={event => setSlideDraft(current => current ? ({ ...current, backgroundColor: event.target.value }) : current)} className="mt-1 h-10 w-full rounded-md border border-slate-200 p-1" />
                                </label>
                                <label className="block text-xs font-black uppercase text-slate-500">
                                    Letras
                                    <input
                                        type="color"
                                        value={slideDraft.textColor || "#FFFFFF"}
                                        onChange={event => setSlideDraft(current => current ? ({ ...current, textColor: event.target.value }) : current)}
                                        onBlur={event => persistSlidePatch({ textColor: event.target.value }, "Cor das letras salva.")}
                                        className="mt-1 h-10 w-full rounded-md border border-slate-200 p-1"
                                    />
                                </label>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <label className="block text-xs font-black uppercase text-slate-500">
                                    Tempo TV
                                    <input type="number" min={5} max={120} value={slideDraft.monitorDuration} onChange={event => setSlideDraft(current => current ? ({ ...current, monitorDuration: Number(event.target.value) || 15 }) : current)} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm" />
                                </label>
                            </div>
                            <div className="mt-3 rounded-md border border-slate-200 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase text-slate-500">Imagem de fundo</p>
                                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                            {selectedPresentation.backgroundImage?.fileName || "Nenhuma imagem selecionada"}
                                        </p>
                                    </div>
                                    <input ref={backgroundInputRef} type="file" accept="image/*" className="hidden" onChange={handleBackgroundInput} />
                                    <button type="button" onClick={() => backgroundInputRef.current?.click()} className="shrink-0 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                        Upload
                                    </button>
                                </div>
                                {selectedPresentation.backgroundImage?.dataUrl && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!selectedPresentation) return;
                                            void sendJson({
                                                action: "updatePresentation",
                                                presentationId: selectedPresentation.id,
                                                patch: { backgroundImage: null },
                                            }, "Imagem de fundo removida da apresentacao.");
                                        }}
                                        className="mt-2 w-full rounded-md border border-red-200 px-3 py-2 text-xs font-black uppercase text-red-700 transition hover:bg-red-50"
                                    >
                                        Remover fundo da apresentacao
                                    </button>
                                )}
                            </div>
                            <div className="mt-3 space-y-2">
                                {[
                                    ["publishToMonitor", "Publicar no monitor"],
                                    ["isHidden", "Ocultar da apresentacao"],
                                    ["showFooter", "Mostrar rodape"],
                                ].map(([field, label]) => (
                                    <label key={field} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-radar-dark">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(slideDraft[field as keyof PresentationSlide])}
                                            onChange={event => setSlideDraft(current => current ? ({ ...current, [field]: event.target.checked }) : current)}
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => sendJson({ action: "addSlide", presentationId: selectedPresentation.id, slideType: slideDraft.slideType, copyFromSlideId: slideDraft.id }, "Slide duplicado.")} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                    <Copy className="h-4 w-4" />
                                    Duplicar
                                </button>
                                <button type="button" onClick={() => sendJson({ action: "saveSlideToLibrary", presentationId: selectedPresentation.id, slideId: slideDraft.id }, "Slide salvo na biblioteca.")} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                    <Library className="h-4 w-4" />
                                    Biblioteca
                                </button>
                                <button type="button" onClick={() => sendJson({ action: "deleteSlide", presentationId: selectedPresentation.id, slideId: slideDraft.id }, "Slide excluido.")} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-black uppercase text-red-700 transition hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                    Excluir slide
                                </button>
                            </div>
                        </div>
                    )}
                </aside>
            </section>
        </div>
    );
}
