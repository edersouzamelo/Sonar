"use client"

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowLeft, CheckCircle2, Download, FileText, Loader2, UploadCloud, Archive } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CmoOrganizationGroup, cmoOrganizationGroups } from "@/lib/cmo-organizations";
import { cn } from "@/lib/utils";
import { defaultSupplyClassKey, getSupplyClass } from "@/lib/supply-classes";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type ConsolidationColumn = {
    id: string;
    name: string;
    due_date?: string | null;
    consolidation_scope?: "om" | "command" | null;
    is_active?: boolean;
};

type ConsolidationFile = {
    id: string;
    row_id: string;
    row_name: string;
    column_id: string;
    file_name: string;
    uploaded_at: string;
};

const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
};

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

const shortName = (name: string) => name.split(" - ")[0] || name;

const formatDate = (date?: string | null) => {
    if (!date) return "sem prazo definido";
    const [year, month, day] = date.split("-");
    if (!year || !month || !day) return date;
    return `${day}/${month}/${year}`;
};

export default function ConsolidationStatusPage() {
    const params = useParams<{ columnId: string }>();
    const searchParams = useSearchParams();
    const classKey = searchParams.get("classe") || defaultSupplyClassKey;
    const selectedClass = getSupplyClass(classKey);
    const columnId = params.columnId;

    const [column, setColumn] = useState<ConsolidationColumn | null>(null);
    const [files, setFiles] = useState<ConsolidationFile[]>([]);
    const [organizationGroups, setOrganizationGroups] = useState<CmoOrganizationGroup[]>(cmoOrganizationGroups);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
    const [isZipping, setIsZipping] = useState(false);
    
    // Upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeUploadRow, setActiveUploadRow] = useState<{ id: string, name: string } | null>(null);
    const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);

    const organizations = useMemo(() => organizationGroups.flatMap(group => group.units), [organizationGroups]);
    const legacyIdByOrganizationId = useMemo(() => {
        const map = new Map<string, string>();
        organizations.forEach((organization, index) => map.set(organization.id, `om-${index + 1}`));
        return map;
    }, [organizations]);

    const filesByRow = useMemo(() => {
        const map = new Map<string, ConsolidationFile[]>();
        files
            .filter(file => file.column_id === columnId)
            .forEach(file => {
                map.set(file.row_id, [...(map.get(file.row_id) || []), file]);
            });
        return map;
    }, [files, columnId]);

    const statusRows = useMemo(() => {
        const isCommandScope = column?.consolidation_scope === "command";
        const relevantOrgs = isCommandScope 
            ? organizationGroups.map(group => group.units[0]).filter(Boolean)
            : organizations;

        return relevantOrgs.map(organization => {
            const rowFiles = filesByRow.get(organization.id) || filesByRow.get(legacyIdByOrganizationId.get(organization.id) || "") || [];
            return {
                organization,
                files: rowFiles,
                received: rowFiles.length > 0,
            };
        });
    }, [organizations, organizationGroups, filesByRow, legacyIdByOrganizationId, column?.consolidation_scope]);

    const receivedRows = statusRows.filter(row => row.received);
    const pendingRows = statusRows.filter(row => !row.received);
    const completionRate = statusRows.length ? Math.round((receivedRows.length / statusRows.length) * 100) : 0;

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

            const consolidationsResult = await readApiResponse(consolidationsResponse);
            const organizationsResult = await readApiResponse(organizationsResponse);
            if (!consolidationsResponse.ok) throw new Error(consolidationsResult.error || "Falha ao carregar consolidação.");
            if (!organizationsResponse.ok) throw new Error(organizationsResult.error || "Falha ao carregar relação oficial de OM.");

            const allColumns = [...(consolidationsResult.columns || []), ...(consolidationsResult.archivedColumns || [])];
            const currentColumn = allColumns.find((item: ConsolidationColumn) => item.id === columnId) || null;
            if (!currentColumn) throw new Error("Consolidação não encontrada.");

            setColumn(currentColumn);
            setFiles(consolidationsResult.files || []);
            setOrganizationGroups(organizationsResult.groups || cmoOrganizationGroups);
        } catch (err: any) {
            setError(err.message || "Falha ao carregar painel da consolidação.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [classKey, columnId]);

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

    const downloadConsolidated = async () => {
        if (!filesByRow.size) return;
        setIsZipping(true);
        setError("");
        try {
            const token = await getToken();
            const zip = new JSZip();
            
            const filePromises = files
                .filter(f => f.column_id === columnId)
                .map(async (file) => {
                    const response = await fetch(`/api/classes/consolidations?fileId=${file.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const result = await readApiResponse(response);
                    if (!response.ok) throw new Error(result.error || "Falha ao baixar arquivo");
                    
                    const fileRes = await fetch(result.downloadUrl);
                    if (!fileRes.ok) throw new Error("Falha ao obter conteúdo");
                    const blob = await fileRes.blob();
                    
                    const rowName = result.row_name || file.row_name || "Desconhecido";
                    const safeName = result.fileName || file.file_name || "arquivo";
                    
                    zip.file(`[${rowName.replace(/[\/\\?%*:|"<>]/g, '-').substring(0, 30)}] ${safeName}`, blob);
                });
                
            await Promise.all(filePromises);
            const zipBlob = await zip.generateAsync({ type: "blob" });
            saveAs(zipBlob, `Consolidado - ${column?.name || 'arquivos'}.zip`);
        } catch (err: any) {
            setError(err.message || "Falha ao gerar arquivo consolidado.");
        } finally {
            setIsZipping(false);
        }
    };

    const triggerUpload = (rowId: string, rowName: string) => {
        setActiveUploadRow({ id: rowId, name: rowName });
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !column || !activeUploadRow) return;
        
        const { id: rowId, name: rowName } = activeUploadRow;
        setUploadingRowId(rowId);
        setError("");
        
        try {
            const token = await getToken();
            
            const prepareRes = await fetch("/api/classes/consolidations", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "prepareUpload",
                    classKey,
                    rowId,
                    columnId,
                    fileName: file.name
                })
            });
            const prepareData = await readApiResponse(prepareRes);
            if (!prepareRes.ok) throw new Error(prepareData.error || "Falha ao preparar upload");
            
            const uploadRes = await fetch(prepareData.signedUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type || "application/octet-stream",
                    "x-upsert": "true"
                },
                body: file
            });
            if (!uploadRes.ok) throw new Error("Falha ao enviar arquivo para o storage");
            
            const finalizeRes = await fetch("/api/classes/consolidations", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "finalizeUpload",
                    classKey,
                    rowId,
                    rowName,
                    columnId,
                    filePath: prepareData.path,
                    fileName: file.name,
                    mimeType: file.type || "application/octet-stream",
                    sizeBytes: file.size,
                    batchIndex: 0,
                    batchTotal: 1,
                })
            });
            const finalizeData = await readApiResponse(finalizeRes);
            if (!finalizeRes.ok) throw new Error(finalizeData.error || "Falha ao finalizar upload");
            
            loadData();
        } catch (err: any) {
            setError(err.message || "Erro no upload do arquivo.");
        } finally {
            setUploadingRowId(null);
            setActiveUploadRow(null);
            e.target.value = "";
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Carregando painel da consolidação
            </div>
        );
    }

    const renderCard = (organization: any) => {
        const rowFiles = filesByRow.get(organization.id) || filesByRow.get(legacyIdByOrganizationId.get(organization.id) || "") || [];
        const received = rowFiles.length > 0;
        const isUploading = uploadingRowId === organization.id;

        return (
            <div
                key={organization.id}
                className={cn(
                    "flex aspect-square min-h-36 flex-col justify-between rounded-lg border p-3 shadow-[0_12px_0_rgba(15,23,42,0.10),0_18px_28px_rgba(15,23,42,0.14)] transition-transform hover:-translate-y-0.5",
                    received
                        ? "border-lime-300 bg-lime-300 text-lime-950"
                        : "border-slate-300 bg-slate-200 text-slate-600"
                )}
            >
                <div className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        {received ? <CheckCircle2 className="h-5 w-5 shrink-0 text-lime-800" /> : <FileText className="h-5 w-5 shrink-0 text-slate-500" />}
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", received ? "bg-lime-100 text-lime-800" : "bg-white/70 text-slate-500")}>
                            {received ? "Recebido" : "Pendente"}
                        </span>
                    </div>
                    <p className="text-[11px] font-black leading-tight">
                        {shortName(organization.name)}
                    </p>
                </div>

                {received ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {rowFiles.map(file => (
                            <button
                                key={file.id}
                                type="button"
                                onClick={() => downloadFile(file)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-lime-800 shadow-sm transition-colors hover:bg-white"
                                title={file.file_name}
                                aria-label={`Baixar ${file.file_name}`}
                            >
                                {downloadingFileId === file.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="mt-2 flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => triggerUpload(organization.id, organization.name)}
                            disabled={isUploading}
                            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-slate-300/80 px-2 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isUploading ? (
                                <><Loader2 className="h-3 w-3 animate-spin" /> Enviando...</>
                            ) : (
                                <><UploadCloud className="h-3.5 w-3.5" /> Enviar Arquivo</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-slate-50 pb-10">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                />
                <Link href={`/classes/consolidacoes?classe=${classKey}`} className="inline-flex w-fit items-center gap-2 text-sm font-black text-slate-500 transition-colors hover:text-radar-dark">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para Consolidações
                </Link>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                )}

                {column && (
                    <>
                        <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{selectedClass.label}</p>
                                    <h1 className="mt-2 text-2xl font-black leading-tight text-radar-dark md:text-3xl">
                                        Estado da consolidação do recebimento de {column.name}
                                    </h1>
                                    <p className="mt-2 text-sm font-bold text-slate-500">Prazo até {formatDate(column.due_date)}</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 lg:w-auto w-full lg:shrink-0">
                                    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                        <div className="flex flex-col gap-1 w-full min-w-[220px]">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Progresso da Demanda</span>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-4xl font-black tracking-tight text-slate-800">{completionRate}%</span>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-lime-600">
                                                        <div className="h-2 w-2 rounded-full bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.6)]" />
                                                        {receivedRows.length} Recebidas
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                                                        {pendingRows.length} Pendentes
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div 
                                                    className="h-full rounded-full bg-gradient-to-r from-lime-400 to-lime-500 transition-all duration-1000 ease-out" 
                                                    style={{ width: `${completionRate}%` }} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="grid gap-5">
                            {column.consolidation_scope === "command" ? (
                                <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Grandes Unidades</h2>
                                            <p className="text-xs font-semibold text-slate-500">Comandos Enquadrantes</p>
                                        </div>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                                            {organizationGroups.length} Grandes Unidades
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                                        {organizationGroups.map(group => {
                                            const organization = group.units[0];
                                            if (!organization) return null;
                                            return renderCard(organization);
                                        })}
                                    </div>
                                </div>
                            ) : (
                                organizationGroups.map(group => (
                                    <div key={group.id} className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">{group.name}</h2>
                                                <p className="text-xs font-semibold text-slate-500">{group.location}</p>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                                                {group.units.length} OMs
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                                            {group.units.map(organization => renderCard(organization))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </section>

                        {receivedRows.length > 0 && (
                            <div className="flex justify-center pt-4">
                                <button
                                    type="button"
                                    onClick={downloadConsolidated}
                                    disabled={isZipping}
                                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                                >
                                    {isZipping ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Compactando arquivos...</>
                                    ) : (
                                        <><Archive className="h-4 w-4" /> Baixar Consolidado ZIP</>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
