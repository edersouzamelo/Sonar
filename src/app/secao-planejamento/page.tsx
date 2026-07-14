"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Download, Eye, FileImage, FileUp, Plus, RefreshCw } from "lucide-react";
import { PresentationSlidePreview } from "@/components/presentations/slide-preview";
import { supabase } from "@/lib/supabase";
import { supplyClasses } from "@/lib/supply-classes";
import type { ClassPresentation, PresentationStatus, PresentationWorkspace } from "@/lib/presentations/types";

type ApiPayload = {
    workspace: PresentationWorkspace;
    error?: string;
};

const statusLabel: Record<PresentationStatus, string> = {
    Rascunho: "Pendente",
    "Em elaboracao": "Em elaboracao",
    Pronta: "Pronto",
    Conferido: "Conferido",
    Arquivada: "Arquivada",
};

const statusTone: Record<PresentationStatus, string> = {
    Rascunho: "bg-slate-100 text-slate-700",
    "Em elaboracao": "bg-amber-100 text-amber-800",
    Pronta: "bg-emerald-100 text-emerald-800",
    Conferido: "bg-blue-100 text-blue-800",
    Arquivada: "bg-slate-800 text-white",
};

const groupKey = (presentation: ClassPresentation) => `${presentation.title.trim()}::${presentation.context.trim()}`;

export default function SecaoPlanejamentoPage() {
    const [workspace, setWorkspace] = useState<PresentationWorkspace | null>(null);
    const [title, setTitle] = useState("Briefing do CMO");
    const [context, setContext] = useState("Palestra consolidada por classes");
    const [presentationDate, setPresentationDate] = useState(new Date().toISOString().slice(0, 10));
    const [selectedKey, setSelectedKey] = useState("");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    const getAuthHeaders = async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const isLocalHost = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
        if (isLocalHost) return { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-sonar-local-dev": "true" };
        if (!token) throw new Error("Sessao ausente. Entre novamente no SONAR.");
        return { Authorization: `Bearer ${token}` };
    };

    const loadWorkspace = async () => {
        setBusy(true);
        setError("");
        try {
            const headers = await getAuthHeaders();
            const response = await fetch("/api/classes/presentations", { headers, cache: "no-store" });
            const payload: ApiPayload = await response.json();
            if (!response.ok) throw new Error(payload.error || "Falha ao carregar apresentacoes.");
            setWorkspace(payload.workspace);
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
            const payload: ApiPayload = await response.json();
            if (!response.ok) throw new Error(payload.error || "Falha ao salvar.");
            setWorkspace(payload.workspace);
            setNotice(successMessage);
            return payload;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Falha ao salvar.");
            return null;
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        void loadWorkspace();
    }, []);

    const groups = useMemo(() => {
        const source = workspace?.presentations.filter(item => !item.isConsolidated) || [];
        const map = new Map<string, ClassPresentation[]>();
        source.forEach(presentation => {
            const key = groupKey(presentation);
            map.set(key, [...(map.get(key) || []), presentation]);
        });
        return Array.from(map.entries()).map(([key, presentations]) => ({
            key,
            title: presentations[0]?.title || "Apresentacao",
            context: presentations[0]?.context || "",
            updatedAt: presentations.map(item => item.updatedAt).sort().at(-1) || "",
            presentations: presentations.sort((a, b) => a.classKey.localeCompare(b.classKey)),
        })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }, [workspace]);

    useEffect(() => {
        if (!selectedKey && groups[0]) setSelectedKey(groups[0].key);
    }, [groups, selectedKey]);

    const selectedGroup = groups.find(group => group.key === selectedKey) || groups[0];
    const presentationsByClass = new Map((selectedGroup?.presentations || []).map(item => [item.classKey, item]));

    const createDemand = async () => {
        const payload = await sendJson({
            action: "createPlanningDemand",
            title,
            context,
            presentationDate,
        }, "Apresentacao demandada para todas as classes.");
        const created = (payload as any)?.presentations?.[0] as ClassPresentation | undefined;
        if (created) setSelectedKey(groupKey(created));
    };

    const markChecked = (presentation: ClassPresentation) => sendJson({
        action: "updatePresentation",
        presentationId: presentation.id,
        patch: { status: "Conferido" },
    }, `${presentation.title} conferida.`);

    const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
        reader.readAsDataURL(file);
    });

    const updateGroupAsset = async (group: { title: string; context: string }, patch: Record<string, unknown>, message: string) => {
        await sendJson({
            action: "updatePlanningGroup",
            title: group.title,
            context: group.context,
            patch,
        }, message);
        setSelectedKey(`${group.title.trim()}::${group.context.trim()}`);
    };

    const ensureGroupDemand = async (group: { title: string; context: string }) => {
        await updateGroupAsset(group, {}, "Demandas criadas para todas as classes desta palestra.");
    };

    const handleOpeningDeckInput = async (event: ChangeEvent<HTMLInputElement>, group: { title: string; context: string }) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        await updateGroupAsset(group, {
            openingDeck: {
                fileName: file.name,
                mimeType: file.type || "application/octet-stream",
                contentBase64: dataUrl.split(",")[1] || "",
                uploadedAt: new Date().toISOString(),
            },
        }, "Capa/slides iniciais vinculados a esta palestra.");
    };

    const handleStandardBackgroundInput = async (event: ChangeEvent<HTMLInputElement>, group: { title: string; context: string }) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Selecione uma imagem para o fundo padronizado.");
            return;
        }
        const dataUrl = await readFileAsDataUrl(file);
        await updateGroupAsset(group, {
            backgroundImage: { dataUrl, fileName: file.name },
        }, "Fundo padronizado replicado para todas as classes desta palestra.");
    };

    const downloadConsolidated = async (group = selectedGroup) => {
        if (!group) return;
        const selectedSlideIds = group.presentations
            .sort((a, b) => {
                const classA = supplyClasses.findIndex(item => item.key === a.classKey);
                const classB = supplyClasses.findIndex(item => item.key === b.classKey);
                return classA - classB;
            })
            .flatMap(presentation => presentation.slides.filter(slide => !slide.isHidden).sort((a, b) => a.position - b.position).map(slide => slide.id));

        const payload = await sendJson({
            action: "createConsolidated",
            title: `${group.title} - consolidado`,
            context: group.context,
            selectedSlideIds,
        }, "PPT consolidado preparado.");
        const presentation = (payload as any)?.presentation as ClassPresentation | undefined;
        if (!presentation) return;

        const headers = await getAuthHeaders();
        const response = await fetch(`/api/classes/presentations/${presentation.id}/export`, { headers, cache: "no-store" });
        if (!response.ok) {
            setError("Falha ao baixar PPT consolidado.");
            return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${group.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").toLowerCase()}-consolidado.pptx`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-5 pb-8">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-radar-gold">SONAR</p>
                        <h1 className="mt-2 text-3xl font-black text-radar-dark">Secao de Planejamento</h1>
                        <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-slate-500">
                            Controle consolidador das apresentacoes: a SecPlnj cria a palestra, demanda as classes, acompanha elaboracao e baixa o PPT em sequencia.
                        </p>
                    </div>
                    <button type="button" onClick={loadWorkspace} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-radar-dark transition hover:border-radar-gold disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                        Atualizar
                    </button>
                </div>
                {(notice || error) && (
                    <div className={`mt-4 rounded-md px-3 py-2 text-sm font-bold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {error || notice}
                    </div>
                )}
            </section>

            <section className="grid gap-4 xl:grid-cols-[24rem_1fr]">
                <aside className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Criar apresentacao</h2>
                        <input value={title} onChange={event => setTitle(event.target.value)} className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-radar-dark" />
                        <input value={context} onChange={event => setContext(event.target.value)} className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" />
                        <input type="date" value={presentationDate} onChange={event => setPresentationDate(event.target.value)} className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" />
                        <button type="button" onClick={createDemand} disabled={busy || !title.trim()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-black bg-black px-3 py-2 text-sm font-black text-white shadow-sm transition hover:border-slate-800 hover:bg-slate-800 disabled:opacity-50">
                            <Plus className="h-4 w-4" />
                            Criar e demandar as classes
                        </button>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Palestras</h2>
                        <div className="mt-3 space-y-3">
                            {groups.map(group => {
                                const leadPresentation = group.presentations[0];
                                const isSelected = selectedGroup?.key === group.key;
                                const missingCount = Math.max(0, supplyClasses.length - group.presentations.length);

                                return (
                                    <div key={group.key} className={`rounded-md border p-3 transition ${isSelected ? "border-radar-gold bg-radar-gold/10" : "border-slate-200"}`}>
                                        <button type="button" onClick={() => setSelectedKey(group.key)} className="w-full text-left">
                                            <p className="line-clamp-2 text-sm font-black text-radar-dark">{group.title}</p>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">{group.presentations.length} classes demandadas</p>
                                        </button>

                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-[11px] font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                                <FileUp className="mb-1 h-4 w-4" />
                                                Capa/slides iniciais
                                                <input type="file" accept=".ppt,.pptx,.pdf,image/*" className="hidden" onChange={event => void handleOpeningDeckInput(event, group)} />
                                            </label>
                                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center text-[11px] font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                                <FileImage className="mb-1 h-4 w-4" />
                                                Fundo padronizado
                                                <input type="file" accept="image/*" className="hidden" onChange={event => void handleStandardBackgroundInput(event, group)} />
                                            </label>
                                        </div>

                                        {(leadPresentation?.openingDeck || leadPresentation?.backgroundImage) && (
                                            <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-500">
                                                {leadPresentation.openingDeck && <p className="truncate">Capa: {leadPresentation.openingDeck.fileName}</p>}
                                                {leadPresentation.backgroundImage && <p className="truncate">Fundo: {leadPresentation.backgroundImage.fileName}</p>}
                                            </div>
                                        )}

                                        {missingCount > 0 && (
                                            <button type="button" onClick={() => void ensureGroupDemand(group)} disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black uppercase text-amber-800 transition hover:bg-amber-100 disabled:opacity-50">
                                                Completar {missingCount} demandas
                                            </button>
                                        )}

                                        <button type="button" onClick={() => void downloadConsolidated(group)} disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-black bg-black px-3 py-2 text-xs font-black uppercase text-white shadow-sm transition hover:border-slate-800 hover:bg-slate-800 disabled:opacity-50">
                                            <Download className="h-4 w-4" />
                                            Download PPT
                                        </button>
                                    </div>
                                );
                            })}
                            {!groups.length && <p className="rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhuma palestra demandada ainda.</p>}
                        </div>
                    </div>
                </aside>

                <main className="space-y-4">
                    {selectedGroup && (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                <div>
                                    <h2 className="text-xl font-black text-radar-dark">{selectedGroup.title}</h2>
                                    <p className="mt-1 text-sm font-medium text-slate-500">{selectedGroup.context}</p>
                                </div>
                                <button type="button" onClick={() => void downloadConsolidated()} disabled={busy} className="inline-flex items-center gap-2 rounded-md border border-black bg-black px-4 py-2 text-sm font-black text-white shadow-sm transition hover:border-slate-800 hover:bg-slate-800 disabled:opacity-50">
                                    <Download className="h-4 w-4" />
                                    Baixar PPT consolidado
                                </button>
                            </div>

                            <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                {supplyClasses.map(supplyClass => {
                                    const presentation = presentationsByClass.get(supplyClass.key);
                                    const firstSlide = presentation?.slides.find(slide => !slide.isHidden) || presentation?.slides[0];
                                    const previewSlide = firstSlide ? { ...firstSlide, backgroundImage: firstSlide.backgroundImage || presentation?.backgroundImage } : null;

                                    return (
                                        <div key={supplyClass.key} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-black text-radar-dark">{supplyClass.shortLabel}</h3>
                                                    <p className="truncate text-xs font-semibold text-slate-500">{supplyClass.label}</p>
                                                </div>
                                                <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black uppercase ${presentation ? statusTone[presentation.status] : "bg-slate-100 text-slate-500"}`}>
                                                    {presentation ? statusLabel[presentation.status] : "Nao demandada"}
                                                </span>
                                            </div>
                                            <div className="bg-slate-50 p-3">
                                                {previewSlide ? (
                                                    <PresentationSlidePreview slide={previewSlide} className="rounded-md shadow-none" />
                                                ) : (
                                                    <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-xs font-bold text-slate-400">
                                                        Sem slides
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 p-3">
                                                {presentation && (
                                                    <>
                                                        <Link href={`/classes/apresentacoes?classe=${supplyClass.key}`} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-black uppercase text-radar-dark transition hover:border-radar-gold">
                                                            <Eye className="h-4 w-4" />
                                                            Abrir classe
                                                        </Link>
                                                        <button type="button" onClick={() => markChecked(presentation)} disabled={busy || presentation.status === "Conferido"} className="inline-flex items-center gap-2 rounded-md border border-blue-200 px-3 py-2 text-xs font-black uppercase text-blue-700 transition hover:bg-blue-50 disabled:opacity-50">
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            Conferir
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </section>
                        </>
                    )}

                    {selectedGroup && (
                        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-radar-gold" />
                                <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Checklist de elaboracao e conferencia</h2>
                            </div>
                            <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">Classe</th>
                                            <th className="px-3 py-2">Situacao</th>
                                            <th className="px-3 py-2">Slides</th>
                                            <th className="px-3 py-2">Atualizado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplyClasses.map(supplyClass => {
                                            const presentation = presentationsByClass.get(supplyClass.key);
                                            return (
                                                <tr key={supplyClass.key} className="border-t border-slate-100">
                                                    <td className="px-3 py-2 font-black text-radar-dark">{supplyClass.label}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`rounded-md px-2 py-1 text-[11px] font-black uppercase ${presentation ? statusTone[presentation.status] : "bg-slate-100 text-slate-500"}`}>
                                                            {presentation ? statusLabel[presentation.status] : "Nao demandada"}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 font-semibold text-slate-500">{presentation?.slides.length || 0}</td>
                                                    <td className="px-3 py-2 font-semibold text-slate-500">{presentation ? new Date(presentation.updatedAt).toLocaleString("pt-BR") : "-"}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </main>
            </section>
        </div>
    );
}
