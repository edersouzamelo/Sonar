"use client"

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, Fragment, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { Archive, ArrowLeft, CheckCircle2, ChevronDown, Download, ExternalLink, FileSpreadsheet, Loader2, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CmoOrganization, CmoOrganizationGroup, cmoOrganizationGroups } from "@/lib/cmo-organizations";
import { cn } from "@/lib/utils";
import { defaultSupplyClassKey, getSupplyClass } from "@/lib/supply-classes";

type ConsolidationScope = "om" | "command";

type ConsolidationColumn = {
    id: string;
    name: string;
    position: number;
    due_date?: string | null;
    consolidation_scope?: ConsolidationScope | null;
    is_active?: boolean;
};

type ConsolidationFile = {
    id: string;
    row_id: string;
    row_name: string;
    column_id: string;
    file_name: string;
    uploaded_by: string;
    uploaded_at: string;
};

type UploadProgress = {
    active: number;
    completed: number;
    total: number;
    fileName: string;
};

const CONSOLIDATION_BUCKET = "class-consolidations";

const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
};

const formatFileName = (name: string) => name.length > 24 ? `${name.slice(0, 21)}...` : name;

const readApiResponse = async (response: Response) => {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return {
            error: text.slice(0, 220) || "Resposta inesperada do servidor.",
        };
    }
};

const readOptionalApiResponse = async (response: Response) => {
    const result = await readApiResponse(response);
    return response.ok ? result : {};
};

const runWithConcurrency = async <T,>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) => {
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            await worker(items[index], index);
        }
    });
    await Promise.all(workers);
};

const describeUploadError = (file: File, response: Response, result: any) => {
    const serverMessage = String(result?.error || result?.message || "").trim();
    const statusText = response.statusText ? ` ${response.statusText}` : "";
    const reason = serverMessage || `HTTP ${response.status}${statusText}`;
    return `${file.name}: ${reason}`;
};

export default function ConsolidacoesPage() {
    const searchParams = useSearchParams();
    const selectedClass = getSupplyClass(searchParams.get("classe") || defaultSupplyClassKey);
    const classKey = selectedClass.key;
    const [columns, setColumns] = useState<ConsolidationColumn[]>([]);
    const [archivedColumns, setArchivedColumns] = useState<ConsolidationColumn[]>([]);
    const [files, setFiles] = useState<ConsolidationFile[]>([]);
    const [organizationGroups, setOrganizationGroups] = useState<CmoOrganizationGroup[]>(cmoOrganizationGroups);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(cmoOrganizationGroups.map(group => [group.id, false]))
    );
    const [closingGroups, setClosingGroups] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [savingColumnId, setSavingColumnId] = useState<string | null>(null);
    const [uploadingCells, setUploadingCells] = useState<Record<string, UploadProgress>>({});
    const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
    const [removingFileId, setRemovingFileId] = useState<string | null>(null);
    const [showArchivedColumns, setShowArchivedColumns] = useState(false);

    const organizations = useMemo(() => organizationGroups.flatMap(group => group.units), [organizationGroups]);
    const legacyIdByOrganizationId = useMemo(() => {
        const map = new Map<string, string>();
        organizations.forEach((organization, index) => map.set(organization.id, `om-${index + 1}`));
        return map;
    }, [organizations]);

    const filesByCell = useMemo(() => {
        const map = new Map<string, ConsolidationFile[]>();
        files.forEach(file => {
            const key = `${file.row_id}:${file.column_id}`;
            map.set(key, [...(map.get(key) || []), file]);
        });
        return map;
    }, [files]);

    const activeColumnIds = useMemo(() => new Set(columns.map(column => column.id)), [columns]);
    const completedCells = useMemo(() => {
        const visibleCells = new Set<string>();
        files.forEach(file => {
            if (activeColumnIds.has(file.column_id)) visibleCells.add(`${file.row_id}:${file.column_id}`);
        });
        return visibleCells.size;
    }, [files, activeColumnIds]);
    const totalCells = organizations.length * Math.max(columns.length, 1);

    const loadData = async () => {
        setLoading(true);
        setError("");
        try {
            const token = await getToken();
            const [consolidationsResponse, organizationsResponse] = await Promise.all([
                fetch(`/api/classes/consolidations?classKey=${classKey}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch("/api/official-organizations", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const result = await readApiResponse(consolidationsResponse);
            const organizationsResult = await readOptionalApiResponse(organizationsResponse);
            if (!consolidationsResponse.ok) throw new Error(result.error || "Falha ao carregar consolidacoes.");

            const loadedGroups = organizationsResult.groups || cmoOrganizationGroups;
            setColumns(result.columns || []);
            setArchivedColumns(result.archivedColumns || []);
            setFiles(result.files || []);
            setOrganizationGroups(loadedGroups);
            setOpenGroups(current =>
                Object.fromEntries(loadedGroups.map((group: CmoOrganizationGroup) => [group.id, current[group.id] ?? false]))
            );
        } catch (err: any) {
            setError(err.message || "Falha ao carregar consolidacoes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [classKey]);

    const addColumn = async () => {
        setError("");
        try {
            const token = await getToken();
            const response = await fetch("/api/classes/consolidations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: "addColumn",
                    classKey,
                    name: `Nova demanda ${columns.length + 1}`,
                }),
            });
            const result = await readApiResponse(response);
            if (!response.ok) throw new Error(result.error || "Falha ao criar coluna.");
            setColumns(current => [...current, result.column].sort((a, b) => a.position - b.position));
        } catch (err: any) {
            setError(err.message || "Falha ao criar coluna.");
        }
    };

    const updateColumn = async (columnId: string, patch: Partial<ConsolidationColumn>) => {
        const currentColumn = columns.find(column => column.id === columnId);
        if (!currentColumn) return;

        const nextColumn = {
            ...currentColumn,
            ...patch,
            name: (patch.name ?? currentColumn.name).trim() || "Demanda sem nome",
            consolidation_scope: (patch.consolidation_scope ?? currentColumn.consolidation_scope ?? "om") as ConsolidationScope,
            due_date: patch.due_date === undefined ? currentColumn.due_date : patch.due_date,
        };

        setSavingColumnId(columnId);
        setError("");
        setColumns(current => current.map(column => column.id === columnId ? nextColumn : column));

        try {
            const token = await getToken();
            const response = await fetch("/api/classes/consolidations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: "updateColumn",
                    classKey,
                    columnId,
                    name: nextColumn.name,
                    dueDate: nextColumn.due_date || null,
                    scope: nextColumn.consolidation_scope,
                }),
            });
            const result = await readApiResponse(response);
            if (!response.ok) throw new Error(result.error || "Falha ao atualizar coluna.");
            setColumns(current => current.map(column => column.id === columnId ? result.column : column));
        } catch (err: any) {
            setError(err.message || "Falha ao atualizar coluna.");
            setColumns(current => current.map(column => column.id === columnId ? currentColumn : column));
        } finally {
            setSavingColumnId(null);
        }
    };

    const handleColumnKeyDown = (event: KeyboardEvent<HTMLInputElement>, columnId: string) => {
        if (event.key === "Enter") {
            event.currentTarget.blur();
            updateColumn(columnId, { name: event.currentTarget.value });
        }
    };

    const postColumnAction = async (payload: Record<string, any>) => {
        const token = await getToken();
        const response = await fetch("/api/classes/consolidations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ classKey, ...payload }),
        });
        const result = await readApiResponse(response);
        if (!response.ok) throw new Error(result.error || "Falha ao atualizar coluna.");
        return result;
    };

    const archiveColumn = async (column: ConsolidationColumn) => {
        setSavingColumnId(column.id);
        setError("");
        try {
            const result = await postColumnAction({ action: "archiveColumn", columnId: column.id });
            setColumns(current => current.filter(item => item.id !== column.id));
            setArchivedColumns(current => [result.column, ...current.filter(item => item.id !== column.id)]);
        } catch (err: any) {
            setError(err.message || "Falha ao arquivar coluna.");
        } finally {
            setSavingColumnId(null);
        }
    };

    const restoreColumn = async (column: ConsolidationColumn) => {
        setSavingColumnId(column.id);
        setError("");
        try {
            const result = await postColumnAction({ action: "restoreColumn", columnId: column.id });
            setArchivedColumns(current => current.filter(item => item.id !== column.id));
            setColumns(current => [...current, result.column].sort((a, b) => a.position - b.position));
        } catch (err: any) {
            setError(err.message || "Falha ao restaurar coluna.");
        } finally {
            setSavingColumnId(null);
        }
    };

    const deleteColumn = async (column: ConsolidationColumn) => {
        const typed = window.prompt(`Eliminar a coluna "${column.name}" apagara a demanda e todos os anexos vinculados a ela. Digite ELIMINAR para confirmar.`);
        if (typed !== "ELIMINAR") return;

        setSavingColumnId(column.id);
        setError("");
        try {
            await postColumnAction({ action: "deleteColumn", columnId: column.id, confirmation: typed });
            setColumns(current => current.filter(item => item.id !== column.id));
            setArchivedColumns(current => current.filter(item => item.id !== column.id));
            setFiles(current => current.filter(file => file.column_id !== column.id));
        } catch (err: any) {
            setError(err.message || "Falha ao eliminar coluna.");
        } finally {
            setSavingColumnId(null);
        }
    };

    const startCellUpload = (cellKey: string, selectedFiles: File[]) => {
        setUploadingCells(current => {
            const previous = current[cellKey];
            return {
                ...current,
                [cellKey]: {
                    active: (previous?.active || 0) + selectedFiles.length,
                    completed: previous?.completed || 0,
                    total: (previous?.total || 0) + selectedFiles.length,
                    fileName: selectedFiles[0]?.name || previous?.fileName || "arquivo",
                },
            };
        });
    };

    const markCellUploadActive = (cellKey: string, fileName: string) => {
        setUploadingCells(current => {
            const previous = current[cellKey];
            if (!previous) return current;
            return {
                ...current,
                [cellKey]: {
                    ...previous,
                    fileName,
                },
            };
        });
    };

    const finishCellUploadFile = (cellKey: string) => {
        setUploadingCells(current => {
            const previous = current[cellKey];
            if (!previous) return current;

            const nextActive = Math.max(previous.active - 1, 0);
            const nextCompleted = previous.completed + 1;
            if (nextActive === 0) {
                const next = { ...current };
                delete next[cellKey];
                return next;
            }

            return {
                ...current,
                [cellKey]: {
                    ...previous,
                    active: nextActive,
                    completed: nextCompleted,
                },
            };
        });
    };

    const uploadCellFile = async (event: ChangeEvent<HTMLInputElement>, row: CmoOrganization, column: ConsolidationColumn) => {
        const selectedFiles = Array.from(event.target.files || []);
        event.target.value = "";
        if (!selectedFiles.length) return;

        const cellKey = `${row.id}:${column.id}`;
        startCellUpload(cellKey, selectedFiles);
        setError("");

        try {
            const token = await getToken();
            let uploadedCount = 0;
            const failedUploads: string[] = [];
            const primaryDocumentLabel = selectedFiles[0]?.name || "";

            await runWithConcurrency(selectedFiles, 4, async (file, index) => {
                markCellUploadActive(cellKey, file.name);
                try {
                    const prepareResponse = await fetch("/api/classes/consolidations", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            action: "prepareUpload",
                            classKey,
                            rowId: row.id,
                            rowName: row.name,
                            columnId: column.id,
                            fileName: file.name,
                            mimeType: file.type || "application/octet-stream",
                            sizeBytes: file.size,
                        }),
                    });
                    const prepareResult = await readApiResponse(prepareResponse);
                    if (!prepareResponse.ok) throw new Error(describeUploadError(file, prepareResponse, prepareResult));
                    if (!prepareResult.path || !prepareResult.token) {
                        throw new Error(`${file.name}: nao foi possivel preparar o envio direto ao Supabase.`);
                    }

                    const directUpload = await supabase.storage
                        .from(CONSOLIDATION_BUCKET)
                        .uploadToSignedUrl(prepareResult.path, prepareResult.token, file, {
                            contentType: file.type || "application/octet-stream",
                        });

                    if (directUpload.error) {
                        throw new Error(`${file.name}: Supabase Storage - ${directUpload.error.message}`);
                    }

                    const finalizeResponse = await fetch("/api/classes/consolidations", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            action: "finalizeUpload",
                            classKey,
                            rowId: row.id,
                            rowName: row.name,
                            columnId: column.id,
                            filePath: prepareResult.path,
                            fileName: file.name,
                            mimeType: file.type || "application/octet-stream",
                            sizeBytes: file.size,
                            batchIndex: index,
                            batchTotal: selectedFiles.length,
                            primaryDocumentLabel: index > 0 ? primaryDocumentLabel : "",
                        }),
                    });
                    const result = await readApiResponse(finalizeResponse);
                    if (!finalizeResponse.ok) throw new Error(describeUploadError(file, finalizeResponse, result));
                    if (result.file) {
                        uploadedCount += 1;
                        setFiles(current => [result.file, ...current.filter(item => item.id !== result.file.id)]);
                    }
                } catch (fileError: any) {
                    const failureMessage = fileError.message || "falha de rede, tempo limite ou resposta interrompida";
                    failedUploads.push(failureMessage.includes(file.name) ? failureMessage : `${file.name}: ${failureMessage}`);
                } finally {
                    finishCellUploadFile(cellKey);
                }
            });

            if (failedUploads.length > 0) {
                const uploadedMessage = uploadedCount > 0 ? `${uploadedCount} arquivo(s) enviado(s). ` : "";
                throw new Error(`${uploadedMessage}Falha em ${failedUploads.length} arquivo(s): ${failedUploads.join(" | ")}`);
            }
        } catch (err: any) {
            setError(err.message || "Falha no upload.");
        }
    };

    const downloadFile = async (file: ConsolidationFile) => {
        setDownloadingFileId(file.id);
        setError("");
        try {
            const token = await getToken();
            const response = await fetch(`/api/classes/consolidations?fileId=${file.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await readApiResponse(response);
            if (!response.ok) throw new Error(result.error || "Falha ao gerar download.");
            const anchor = document.createElement("a");
            anchor.href = result.downloadUrl;
            anchor.download = result.fileName || file.file_name;
            anchor.target = "_blank";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        } catch (err: any) {
            setError(err.message || "Falha ao gerar download.");
        } finally {
            setDownloadingFileId(null);
        }
    };

    const removeFile = async (file: ConsolidationFile) => {
        const confirmed = window.confirm(`Remover somente o arquivo "${file.file_name}" desta celula?`);
        if (!confirmed) return;

        setRemovingFileId(file.id);
        setError("");
        try {
            const token = await getToken();
            const response = await fetch(`/api/classes/consolidations?fileId=${file.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await readApiResponse(response);
            if (!response.ok) throw new Error(result.error || "Falha ao remover arquivo.");
            setFiles(current => current.filter(item => item.id !== file.id));
        } catch (err: any) {
            setError(err.message || "Falha ao remover arquivo.");
        } finally {
            setRemovingFileId(null);
        }
    };

    const toggleGroup = (groupId: string, isOpen: boolean) => {
        if (isOpen) {
            setClosingGroups(current => ({ ...current, [groupId]: true }));
            window.setTimeout(() => {
                setOpenGroups(current => ({ ...current, [groupId]: false }));
                setClosingGroups(current => ({ ...current, [groupId]: false }));
            }, 360);
            return;
        }

        setOpenGroups(current => ({ ...current, [groupId]: true }));
    };

    const renderCell = (row: CmoOrganization, column: ConsolidationColumn, disabled: boolean) => {
        const cellKey = `${row.id}:${column.id}`;
        const legacyCellKey = `${legacyIdByOrganizationId.get(row.id)}:${column.id}`;
        const cellFiles = filesByCell.get(cellKey) || filesByCell.get(legacyCellKey) || [];
        const uploadStatus = uploadingCells[cellKey];
        const isUploading = Boolean(uploadStatus);
        const progressLabel = uploadStatus?.total && uploadStatus.total > 1
            ? `Enviando ${uploadStatus.completed + 1}/${uploadStatus.total}`
            : "Enviando";

        if (disabled) {
            return (
                <div className="flex h-full min-h-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-200/70 px-3 text-center text-xs font-bold text-slate-400">
                    Travado por Cmdo
                </div>
            );
        }

        if (cellFiles.length) {
            return (
                <div className="flex h-full min-h-14 flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-800">
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        ✅ Recebido
                    </span>
                    <div className="flex flex-col gap-1">
                        {cellFiles.map(cellFile => {
                            const isDownloadingFile = downloadingFileId === cellFile.id;
                            const isRemovingFile = removingFileId === cellFile.id;

                            return (
                                <div key={cellFile.id} className="flex min-w-0 items-center gap-1 rounded-md bg-white/80 px-2 py-1 shadow-sm">
                                    <span className="min-w-0 flex-1 truncate text-[11px] text-emerald-900" title={cellFile.file_name}>
                                        {formatFileName(cellFile.file_name)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => downloadFile(cellFile)}
                                        disabled={isRemovingFile}
                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                                        title="Baixar arquivo"
                                        aria-label={`Baixar ${cellFile.file_name}`}
                                    >
                                        {isDownloadingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(cellFile)}
                                        disabled={isDownloadingFile || isRemovingFile}
                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                                        title="Remover arquivo"
                                        aria-label={`Remover ${cellFile.file_name}`}
                                    >
                                        {isRemovingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md bg-emerald-700 px-2 text-[11px] font-black text-white shadow-sm transition-colors hover:bg-emerald-800">
                            <input type="file" multiple className="sr-only" onChange={event => uploadCellFile(event, row, column)} />
                            Adicionar anexo
                        </label>
                        {isUploading && (
                            <span className="inline-flex h-7 items-center gap-1 rounded-md bg-amber-600 px-2 text-[11px] font-black text-white shadow-sm">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {progressLabel}
                            </span>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className={cn(
                "flex h-full min-h-14 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 text-center text-xs font-bold text-slate-500 transition-colors hover:border-radar-gold hover:bg-amber-50",
                isUploading && "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-200 hover:bg-amber-50"
            )}>
                <label className="cursor-pointer">
                    <input type="file" multiple className="sr-only" onChange={event => uploadCellFile(event, row, column)} />
                    <span className="inline-flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload
                    </span>
                </label>
                {isUploading && (
                    <span className="inline-flex max-w-full items-center gap-2 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800" title={uploadStatus?.fileName} aria-live="polite">
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                        <span className="truncate">{progressLabel}</span>
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-5 pb-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <Link href={`/classes?classe=${classKey}`} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-radar-dark">
                        <ArrowLeft className="h-4 w-4" />
                        {selectedClass.shortLabel}
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
                            <FileSpreadsheet className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-radar-dark">Consolidacoes</h1>
                            <p className="mt-1 text-sm text-slate-500">{selectedClass.label} · {organizations.length} OM oficiais</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Celulas recebidas</p>
                        <p className="mt-1 text-xl font-black text-emerald-700">{completedCells}<span className="text-sm text-slate-400">/{totalCells}</span></p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowArchivedColumns(current => !current)}
                        className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-radar-dark"
                    >
                        <Archive className="h-4 w-4" />
                        Arquivadas
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{archivedColumns.length}</span>
                    </button>
                    <button
                        type="button"
                        onClick={addColumn}
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-radar-dark px-4 text-sm font-black text-radar-gold shadow-sm transition-colors hover:bg-black"
                    >
                        <Plus className="h-4 w-4" />
                        Nova coluna
                    </button>
                </div>
            </div>

            {showArchivedColumns && (
                <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Colunas arquivadas</h2>
                            <p className="text-xs text-slate-500">Arquivar tira da planilha principal sem apagar arquivos. Eliminar apaga tudo.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowArchivedColumns(false)}
                            className="rounded-md px-3 py-1.5 text-xs font-black text-slate-500 transition-colors hover:bg-slate-100"
                        >
                            Fechar
                        </button>
                    </div>
                    {archivedColumns.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-400">
                            Nenhuma coluna arquivada.
                        </div>
                    ) : (
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {archivedColumns.map(column => (
                                <div key={column.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-radar-dark" title={column.name}>{column.name}</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            {column.due_date ? `Prazo: ${column.due_date}` : "Sem prazo"} · {column.consolidation_scope === "command" ? "Por Cmdo" : "Por OM"}
                                        </p>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => restoreColumn(column)}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-700 px-2.5 text-xs font-black text-white transition-colors hover:bg-emerald-800"
                                        >
                                            {savingColumnId === column.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                            Restaurar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteColumn(column)}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 text-xs font-black text-red-600 transition-colors hover:bg-red-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            <section className="min-h-[560px] overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
                {loading ? (
                    <div className="flex min-h-[560px] items-center justify-center text-slate-500">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Carregando consolidacoes
                    </div>
                ) : (
                    <div className="force-scrollbar max-h-[calc(100vh-14rem)] overflow-auto">
                        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                            <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="sticky left-0 z-30 w-80 min-w-80 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-black text-radar-dark">
                                        OM do CMO
                                    </th>
                                    {columns.map(column => (
                                        <th key={column.id} className="min-w-64 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 align-top">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        defaultValue={column.name}
                                                        onBlur={event => updateColumn(column.id, { name: event.target.value })}
                                                        onKeyDown={event => handleColumnKeyDown(event, column.id)}
                                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-black normal-case tracking-normal text-radar-dark outline-none transition-colors focus:border-radar-gold focus:ring-2 focus:ring-radar-gold/20"
                                                        aria-label={`Renomear coluna ${column.name}`}
                                                    />
                                                    {savingColumnId === column.id && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                                                    <Link
                                                        href={`/classes/consolidacoes/${column.id}?classe=${classKey}`}
                                                        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-black normal-case tracking-normal text-slate-600 transition-colors hover:bg-slate-100 hover:text-radar-dark"
                                                        title="Abrir painel desta consolidação"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Painel
                                                    </Link>
                                                </div>
                                                <div className="grid grid-cols-[1fr_auto] gap-2">
                                                    <input
                                                        type="date"
                                                        value={column.due_date || ""}
                                                        onChange={event => updateColumn(column.id, { due_date: event.target.value || null })}
                                                        className="h-8 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-radar-gold focus:ring-2 focus:ring-radar-gold/20"
                                                        aria-label={`Prazo de ${column.name}`}
                                                    />
                                                    <select
                                                        value={column.consolidation_scope || "om"}
                                                        onChange={event => updateColumn(column.id, { consolidation_scope: event.target.value as ConsolidationScope })}
                                                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black normal-case tracking-normal text-radar-dark outline-none focus:border-radar-gold focus:ring-2 focus:ring-radar-gold/20"
                                                        aria-label={`Tipo de consolidação de ${column.name}`}
                                                    >
                                                        <option value="om">Por OM</option>
                                                        <option value="command">Por Cmdo</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => archiveColumn(column)}
                                                        className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-black normal-case tracking-normal text-slate-500 transition-colors hover:bg-slate-100 hover:text-radar-dark"
                                                        title="Arquivar coluna"
                                                    >
                                                        <Archive className="h-3.5 w-3.5" />
                                                        Arquivar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteColumn(column)}
                                                        className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-[11px] font-black normal-case tracking-normal text-red-600 transition-colors hover:bg-red-50"
                                                        title="Eliminar coluna e todos os anexos"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {organizationGroups.map(group => {
                                    const isOpen = openGroups[group.id] ?? false;
                                    const isClosing = closingGroups[group.id] ?? false;
                                    const shouldRenderRows = isOpen || isClosing;
                                    return (
                                        <Fragment key={group.id}>
                                            <tr className="bg-slate-100">
                                                <th className="sticky left-0 z-10 w-80 min-w-80 border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-left">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleGroup(group.id, isOpen)}
                                                        className="flex w-full items-center gap-2 text-sm font-black uppercase tracking-wide text-radar-dark"
                                                    >
                                                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", !isOpen && "-rotate-90")} />
                                                        <span className="truncate">{group.name}</span>
                                                        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-600">{group.units.length} OM</span>
                                                    </button>
                                                </th>
                                                {columns.map(column => (
                                                    <td key={`${group.id}-${column.id}`} className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
                                                        {column.consolidation_scope === "command" ? "Consolidado por grande comando" : column.name}
                                                    </td>
                                                ))}
                                            </tr>
                                            {shouldRenderRows && group.units.map((row, rowIndex) => (
                                                <tr
                                                    key={row.id}
                                                    className={cn(
                                                        "collapsible-table-row",
                                                        rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                                                    )}
                                                    data-closing={isClosing ? "true" : "false"}
                                                >
                                                    <th className="sticky left-0 z-10 w-80 min-w-80 border-b border-r border-slate-100 bg-inherit p-0 text-xs font-medium text-slate-600">
                                                        <div
                                                            className={cn(
                                                                "overflow-hidden px-4 transition-all duration-300 ease-out",
                                                                isClosing ? "max-h-0 -translate-y-1 py-0 opacity-0" : "max-h-24 translate-y-0 py-3 opacity-100"
                                                            )}
                                                        >
                                                            {row.name}
                                                        </div>
                                                    </th>
                                                    {columns.map(column => {
                                                        const commandOnly = column.consolidation_scope === "command";
                                                        const disabled = commandOnly && rowIndex !== 0;
                                                        const cellKey = `${row.id}:${column.id}`;
                                                        const file = filesByCell.get(cellKey) || filesByCell.get(`${legacyIdByOrganizationId.get(row.id)}:${column.id}`);

                                                        return (
                                                            <td
                                                                key={cellKey}
                                                                className={cn(
                                                                    "min-w-64 border-b border-r border-slate-100 p-0 align-middle",
                                                                    file && !disabled && "bg-emerald-50",
                                                                    disabled && "bg-slate-100/80 opacity-70"
                                                                )}
                                                            >
                                                                <div
                                                                    className={cn(
                                                                        "overflow-hidden transition-all duration-300 ease-out",
                                                                        isClosing ? "max-h-0 -translate-y-1 p-0 opacity-0" : "max-h-96 translate-y-0 p-2 opacity-100"
                                                                    )}
                                                                >
                                                                    {renderCell(row, column, disabled)}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
