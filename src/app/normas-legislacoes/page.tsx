"use client"

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Download, FileText, RefreshCw, Scale, Tags, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/user-context";

interface LegalDocument {
    id: string;
    name: string;
    size: number;
    type: string;
    downloadUrl?: string;
    uploadedAt: string;
    uploadedBy: string;
    documentType: string;
    documentNumber: string;
    issuingBody: string;
    subject: string;
    effectiveDate: string;
    tags: string[];
    relevantDates: LegalDocumentDate[];
}

interface LegalDocumentDate {
    id: string;
    title: string;
    date: string;
    sourceFile: string;
    sourceDocumentId: string;
}

function formatSize(size: number) {
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function uniqueDocuments(items: LegalDocument[]) {
    const seen = new Set<string>();
    return items.filter(item => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
}

async function getAuthHeaders() {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const { data: { session } } = refreshed.session
        ? { data: { session: refreshed.session } }
        : await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Sessao expirada. Faca login novamente.");
    return { Authorization: `Bearer ${session.access_token}` };
}

export default function LegalDocumentsPage() {
    const { user } = useUser();
    const inputRef = useRef<HTMLInputElement>(null);
    const [documents, setDocuments] = useState<LegalDocument[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const uploadedBy = user?.email || "usuario nao identificado";

    const totalRelevantDates = useMemo(
        () => documents.reduce((acc, document) => acc + document.relevantDates.length, 0),
        [documents]
    );

    const loadDocuments = async () => {
        setErrorMessage("");
        setIsLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch("/api/legal-documents", { headers });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Falha ao carregar DIEx normativos, regulamentos e legislacoes.");
            setDocuments(uniqueDocuments(result.documents || []));
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDocuments();
    }, []);

    const buildFormData = (file: File, existingId?: string) => {
        const formData = new FormData();
        formData.append("file", file);
        if (existingId) formData.append("existingId", existingId);
        return formData;
    };

    const saveFile = async (file: File, existingId?: string) => {
        setErrorMessage("");
        setIsUploading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch("/api/legal-documents", {
                method: "POST",
                headers,
                body: buildFormData(file, existingId),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Falha no upload do documento.");

            setDocuments(prev => uniqueDocuments(existingId
                ? prev.map(document => document.id === existingId ? result.document : document)
                : [result.document, ...prev]
            ));
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const uploadFiles = async (files: File[]) => {
        for (const file of files) await saveFile(file);
    };

    const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length) await uploadFiles(files);
        event.target.value = "";
    };

    const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files || []);
        if (files.length) await uploadFiles(files);
    };

    const handleReplace = async (event: ChangeEvent<HTMLInputElement>, id: string) => {
        const file = event.target.files?.[0];
        if (file) await saveFile(file, id);
        event.target.value = "";
    };

    const removeDocument = async (id: string) => {
        setErrorMessage("");
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/legal-documents/${id}`, { method: "DELETE", headers });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Falha ao remover documento.");
            setDocuments(prev => prev.filter(document => document.id !== id));
        } catch (error: any) {
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-radar-dark">DIEx normativos, regulamentos e legislacoes</h1>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                        Solte arquivos aqui. O SONAR extrai texto, identifica metadados e deixa o Colosso pronto para consultar DIEx normativos, regulamentos e legislacoes.
                    </p>
                </div>
                <Button variant="outline" className="gap-2 rounded-lg" onClick={loadDocuments} disabled={isLoading}>
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                </Button>
            </div>

            {errorMessage && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {errorMessage}
                </div>
            )}

            <section className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Documentos carregados</p>
                    <p className="mt-2 text-2xl font-black text-radar-dark">{documents.length}</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Datas relevantes</p>
                    <p className="mt-2 text-2xl font-black text-radar-dark">{totalRelevantDates}</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Usuario atual</p>
                    <p className="mt-2 truncate text-sm font-bold text-radar-dark">{uploadedBy}</p>
                </div>
            </section>

            <section
                className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center shadow-sm transition-colors ${isDragging ? "border-radar-gold bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileInput} disabled={isUploading} />
                <UploadCloud className="h-12 w-12 text-radar-gold" />
                <h2 className="mt-4 text-lg font-bold text-radar-dark">
                    {isUploading ? "Processando documento..." : "Arraste arquivos ou clique para enviar"}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-slate-500">
                    PDF, DOCX, TXT e outros documentos. Tipo, numero, orgao, assunto, vigencia, tags e datas relevantes sao preenchidos automaticamente.
                </p>
            </section>

            <div className="grid gap-3">
                {isLoading ? (
                    <div className="rounded-lg border border-slate-100 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                        Carregando DIEx normativos, regulamentos e legislacoes...
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
                        <FileText className="h-12 w-12 text-slate-300" />
                        <h2 className="mt-4 text-lg font-bold text-radar-dark">Nenhum documento carregado</h2>
                        <p className="mt-1 max-w-lg text-sm text-slate-500">
                            Envie DIEx normativos, regulamentos e legislacoes para formar a base consultavel pelo Colosso.
                        </p>
                    </div>
                ) : documents.map(document => (
                    <article key={document.id} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-amber-700">
                                        <Scale className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-base font-bold text-radar-dark">{document.name}</h2>
                                        <p className="text-xs text-slate-500">
                                            Upload em {format(new Date(document.uploadedAt), "dd/MM/yy 'as' HH:mm", { locale: ptBR })}, por {document.uploadedBy}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                                    <p><span className="font-bold text-radar-dark">Tipo:</span> {document.documentType || "Nao identificado"}</p>
                                    <p><span className="font-bold text-radar-dark">Numero:</span> {document.documentNumber || "Nao identificado"}</p>
                                    <p><span className="font-bold text-radar-dark">Orgao:</span> {document.issuingBody || "Nao identificado"}</p>
                                    <p><span className="font-bold text-radar-dark">Vigencia:</span> {document.effectiveDate ? format(new Date(`${document.effectiveDate}T00:00:00`), "dd/MM/yyyy") : "Nao identificado"}</p>
                                </div>

                                {document.subject && (
                                    <p className="mt-2 text-sm text-slate-600">
                                        <span className="font-bold text-radar-dark">Assunto:</span> {document.subject}
                                    </p>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-500">{formatSize(document.size)}</span>
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-500">{document.type}</span>
                                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                                        {document.relevantDates.length} data(s) relevante(s)
                                    </span>
                                    {document.tags.map((tag, index) => (
                                        <span key={`${document.id}-${tag}-${index}`} className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 font-bold text-amber-700">
                                            <Tags className="h-3 w-3" />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button asChild variant="outline" className="gap-2 rounded-lg" disabled={!document.downloadUrl}>
                                    <a href={document.downloadUrl || "#"} download={document.name}>
                                        <Download className="h-4 w-4" />
                                        Baixar
                                    </a>
                                </Button>
                                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
                                    <RefreshCw className="h-4 w-4" />
                                    Atualizar
                                    <input type="file" className="hidden" onChange={(event) => handleReplace(event, document.id)} disabled={isUploading} />
                                </label>
                                <Button variant="outline" className="gap-2 rounded-lg text-red-600 hover:bg-red-50" onClick={() => removeDocument(document.id)}>
                                    <Trash2 className="h-4 w-4" />
                                    Remover
                                </Button>
                            </div>
                        </div>

                        {document.relevantDates.length > 0 && (
                            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Datas relevantes identificadas</p>
                                <div className="grid gap-2 md:grid-cols-2">
                                    {document.relevantDates.map((item, index) => (
                                        <div key={`${document.id}-${item.id}-${item.date}-${index}`} className="flex items-center gap-2 rounded-lg bg-white p-2 text-xs text-slate-600">
                                            <CalendarDays className="h-4 w-4 text-radar-gold" />
                                            <span className="font-bold">{format(new Date(`${item.date}T00:00:00`), "dd/MM/yyyy")}</span>
                                            <span className="truncate">{item.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </div>
    );
}
