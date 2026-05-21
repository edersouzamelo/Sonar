"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus, Download, FileText, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/user-context";

interface ServiceOrder {
    id: string;
    name: string;
    size: number;
    type: string;
    downloadUrl?: string;
    uploadedAt: string;
    uploadedBy: string;
    deadlines: ServiceOrderDeadline[];
}

interface ServiceOrderDeadline {
    id: string;
    title: string;
    date: string;
    sourceFile: string;
    sourceOrderId: string;
}

function formatSize(size: number) {
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

async function getAuthHeaders() {
    const { data: refreshed } = await supabase.auth.refreshSession();
    const { data: { session } } = refreshed.session
        ? { data: { session: refreshed.session } }
        : await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Sessao expirada. Faça login novamente.");
    return { Authorization: `Bearer ${session.access_token}` };
}

export default function ServiceOrdersPage() {
    const { user } = useUser();
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const uploadedBy = user?.email || "usuario nao identificado";

    const totalDeadlines = useMemo(() => orders.reduce((acc, order) => acc + order.deadlines.length, 0), [orders]);

    const loadOrders = async () => {
        setErrorMessage("");
        setIsLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/service-orders', { headers });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Falha ao carregar ordens de serviço.");
            setOrders(result.orders || []);
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const saveFile = async (file: File, existingId?: string) => {
        setErrorMessage("");
        setIsUploading(true);
        try {
            const headers = await getAuthHeaders();
            const formData = new FormData();
            formData.append('file', file);
            if (existingId) formData.append('existingId', existingId);

            const response = await fetch('/api/service-orders', {
                method: 'POST',
                headers,
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Falha no upload da OS.");

            setOrders(prev => existingId
                ? prev.map(order => order.id === existingId ? result.order : order)
                : [result.order, ...prev]
            );
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        for (const file of files) await saveFile(file);
        event.target.value = "";
    };

    const handleReplace = async (event: ChangeEvent<HTMLInputElement>, id: string) => {
        const file = event.target.files?.[0];
        if (file) await saveFile(file, id);
        event.target.value = "";
    };

    const removeOrder = async (id: string) => {
        setErrorMessage("");
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/service-orders/${id}`, { method: 'DELETE', headers });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Falha ao remover OS.");
            setOrders(prev => prev.filter(order => order.id !== id));
        } catch (error: any) {
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-radar-dark">Ordens de Serviço</h1>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                        Repositório persistente das OS do CCOL, com upload no Supabase Storage,
                        atualização, download e extração preliminar de datas para lançamento na Agenda.
                    </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-radar-dark bg-radar-dark px-4 py-3 text-sm font-bold text-radar-gold shadow-sm transition-colors hover:bg-radar-gold hover:text-radar-dark">
                    <UploadCloud className="h-4 w-4" />
                    {isUploading ? "Enviando..." : "Enviar OS"}
                    <input type="file" multiple className="hidden" onChange={handleUpload} disabled={isUploading} />
                </label>
            </div>

            {errorMessage && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {errorMessage}
                </div>
            )}

            <section className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Arquivos carregados</p>
                    <p className="mt-2 text-2xl font-black text-radar-dark">{orders.length}</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Prazos extraídos</p>
                    <p className="mt-2 text-2xl font-black text-radar-dark">{totalDeadlines}</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Usuário atual</p>
                    <p className="mt-2 truncate text-sm font-bold text-radar-dark">{uploadedBy}</p>
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <div className="grid gap-3">
                    {isLoading ? (
                        <div className="rounded-lg border border-slate-100 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                            Carregando ordens de serviço...
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
                            <FileText className="h-12 w-12 text-slate-300" />
                            <h2 className="mt-4 text-lg font-bold text-radar-dark">Nenhuma OS carregada</h2>
                            <p className="mt-1 max-w-lg text-sm text-slate-500">
                                Envie arquivos de Ordem de Serviço. Eles serão persistidos no Supabase e ficarão
                                disponíveis para usuários autenticados.
                            </p>
                        </div>
                    ) : orders.map(order => (
                        <article key={order.id} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-700">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="truncate text-base font-bold text-radar-dark">{order.name}</h2>
                                            <p className="text-xs text-slate-500">
                                                Upload em {format(new Date(order.uploadedAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}, por {order.uploadedBy}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-500">{formatSize(order.size)}</span>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-500">{order.type}</span>
                                        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                                            {order.deadlines.length} prazo(s) para Agenda
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button asChild variant="outline" className="gap-2 rounded-lg" disabled={!order.downloadUrl}>
                                        <a href={order.downloadUrl || "#"} download={order.name}>
                                            <Download className="h-4 w-4" />
                                            Baixar
                                        </a>
                                    </Button>
                                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
                                        <RefreshCw className="h-4 w-4" />
                                        Atualizar
                                        <input type="file" className="hidden" onChange={(event) => handleReplace(event, order.id)} disabled={isUploading} />
                                    </label>
                                    <Button variant="outline" className="rounded-lg text-red-600 hover:bg-red-50" onClick={() => removeOrder(order.id)}>
                                        Remover
                                    </Button>
                                </div>
                            </div>

                            {order.deadlines.length > 0 && (
                                <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Prazos identificados</p>
                                    <div className="grid gap-2 md:grid-cols-2">
                                        {order.deadlines.map(deadline => (
                                            <div key={deadline.id} className="flex items-center gap-2 rounded-lg bg-white p-2 text-xs text-slate-600">
                                                <CalendarPlus className="h-4 w-4 text-radar-gold" />
                                                <span className="font-bold">{format(new Date(`${deadline.date}T00:00:00`), "dd/MM/yyyy")}</span>
                                                <span className="truncate">{deadline.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </article>
                    ))}
                </div>

                <aside className="space-y-4">
                    <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                        <h2 className="text-base font-bold text-radar-dark">Configuração necessária</h2>
                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                            <p>1. Execute o SQL `supabase_service_orders.sql` no Supabase.</p>
                            <p>2. O bucket privado `service-orders` armazenará os arquivos.</p>
                            <p>3. As tabelas guardam metadados e prazos extraídos.</p>
                            <p>4. A API grava usando a sessão autenticada do usuário.</p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 shadow-sm">
                        <h2 className="text-base font-bold text-amber-900">Próxima etapa técnica</h2>
                        <p className="mt-2 text-sm leading-relaxed text-amber-800">
                            PDF/DOCX já ficam persistidos. A extração inteligente do conteúdo será a próxima camada:
                            parser de documento + OpenAI para assunto, prazo, responsável, prioridade e providência.
                        </p>
                    </div>
                </aside>
            </section>
        </div>
    );
}
