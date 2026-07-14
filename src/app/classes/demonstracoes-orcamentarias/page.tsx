"use client"

import type { ChangeEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useEffect } from "react";
import { ArrowLeft, Banknote, BarChart3, CircleDollarSign, ClipboardList, FileSpreadsheet, FileText, TrendingUp, UploadCloud, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { defaultSupplyClassKey, getSupplyClass } from "@/lib/supply-classes";

const budgetAreas = [
    {
        label: "Credito previsto",
        value: "A informar",
        detail: "Valor planejado para a classe selecionada.",
        icon: Banknote,
        tone: "bg-emerald-50 text-emerald-700",
    },
    {
        label: "Empenhado",
        value: "A informar",
        detail: "Acompanhamento dos empenhos vinculados.",
        icon: TrendingUp,
        tone: "bg-blue-50 text-blue-700",
    },
    {
        label: "Liquidado",
        value: "A informar",
        detail: "Controle dos valores ja liquidados.",
        icon: CircleDollarSign,
        tone: "bg-amber-50 text-amber-700",
    },
];

const classeIIBudgetRows = [
    {
        scope: "ambito CMO",
        cards: [
            { label: "Total de recursos recebidos para Classe II ambito CMO", icon: Banknote, tone: "bg-emerald-50 text-emerald-700" },
            { label: "Total de creditos disponiveis de Classe II ambito CMO", icon: ClipboardList, tone: "bg-cyan-50 text-cyan-700" },
            { label: "Total de recursos empenhados em Classe II ambito CMO", icon: TrendingUp, tone: "bg-blue-50 text-blue-700" },
            { label: "Total de recursos a liquidar para Classe II ambito CMO", icon: BarChart3, tone: "bg-violet-50 text-violet-700" },
            { label: "Total de recursos liquidados e pagos para Classe II ambito CMO", icon: CircleDollarSign, tone: "bg-amber-50 text-amber-700" },
        ],
    },
    {
        scope: "ambito 9o Gpt Log",
        cards: [
            { label: "Total de recursos recebidos para Classe II ambito 9o Gpt Log", icon: Banknote, tone: "bg-emerald-50 text-emerald-700" },
            { label: "Total de creditos disponiveis Classe II ambito 9o Gpt Log", icon: ClipboardList, tone: "bg-cyan-50 text-cyan-700" },
            { label: "Total de recursos empenhados em Classe II ambito 9o Gpt Log", icon: TrendingUp, tone: "bg-blue-50 text-blue-700" },
            { label: "Total de recursos a liquidar para Classe II ambito 9o Gpt Log", icon: BarChart3, tone: "bg-violet-50 text-violet-700" },
            { label: "Total de recursos liquidados e pagos para Classe II ambito 9o Gpt Log", icon: CircleDollarSign, tone: "bg-amber-50 text-amber-700" },
        ],
    },
];

type SagUpload = {
    id: string;
    fileName: string;
    fileType: string;
    sizeBytes: number;
    uploadedAt: string;
    status: "Recebido" | "Pendente de processamento" | "Processando" | "Processado" | "Erro";
};

const formatFileSize = (sizeBytes: number) => {
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DemonstracoesOrcamentariasPage() {
    const searchParams = useSearchParams();
    const classKey = searchParams.get("classe") || defaultSupplyClassKey;
    const selectedClass = getSupplyClass(classKey);
    const isClasseII = selectedClass.key === "classe-ii-material-de-intendencia";
    const sagInputRef = useRef<HTMLInputElement | null>(null);
    const [sagUploads, setSagUploads] = useState<SagUpload[]>([]);
    const latestSagUpload = useMemo(() => sagUploads[0], [sagUploads]);
    const [totalDisponivelCmo, setTotalDisponivelCmo] = useState<number | null>(null);
    const [lastUploadDate, setLastUploadDate] = useState<string | null>(null);

    useEffect(() => {
        const storedTotal = localStorage.getItem('totalDisponivelCmo');
        const storedDate = localStorage.getItem('lastUploadDateCmo');
        if (storedTotal) setTotalDisponivelCmo(parseFloat(storedTotal));
        if (storedDate) setLastUploadDate(storedDate);
    }, []);

    const handleSagUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length) return;

        const uploads = files.map(file => ({
            id: `${file.name}-${file.size}-${file.lastModified}`,
            fileName: file.name,
            fileType: file.type || file.name.split(".").pop()?.toUpperCase() || "Arquivo",
            sizeBytes: file.size,
            uploadedAt: new Date().toISOString(),
            status: "Recebido" as const,
        }));
        setSagUploads(current => [...uploads, ...current]);

        try {
            const formData = new FormData();
            files.forEach(file => formData.append('file', file));
            
            setSagUploads(current => current.map(u => 
                uploads.find(up => up.id === u.id) ? { ...u, status: "Processando" as const } : u
            ));

            const res = await fetch('/api/parse-sag', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setTotalDisponivelCmo(data.totalDisponivel);
                const now = new Date().toISOString();
                setLastUploadDate(now);
                localStorage.setItem('totalDisponivelCmo', data.totalDisponivel.toString());
                localStorage.setItem('lastUploadDateCmo', now);
                
                setSagUploads(current => current.map(u => 
                    uploads.find(up => up.id === u.id) ? { ...u, status: "Processado" as const } : u
                ));
            } else {
                setSagUploads(current => current.map(u => 
                    uploads.find(up => up.id === u.id) ? { ...u, status: "Erro" as const } : u
                ));
            }
        } catch (error) {
            console.error(error);
            setSagUploads(current => current.map(u => 
                uploads.find(up => up.id === u.id) ? { ...u, status: "Erro" as const } : u
            ));
        }
    };

    return (
        <div className="space-y-6 pb-8">
            <Link href={`/classes?classe=${classKey}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-radar-dark">
                <ArrowLeft className="h-4 w-4" />
                Voltar para {selectedClass.shortLabel}
            </Link>

            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-radar-dark">Demonstrações Orçamentárias</h1>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                        Area de trabalho para acompanhamento de creditos, empenhos, liquidacoes e saldos orcamentarios da {selectedClass.label}.
                    </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-amber-700">
                    Novo modulo
                </span>
            </div>

            {isClasseII ? (
                <section className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Fonte SAG</p>
                                    <h2 className="mt-1 text-lg font-black text-radar-dark">Arquivos orcamentarios da Classe II</h2>
                                    <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
                                        Entrada para planilhas e PDFs extraidos do SAG, com preparacao posterior dos indicadores do CMO e do 9o Gpt Log.
                                    </p>
                                </div>
                                <input ref={sagInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple className="hidden" onChange={handleSagUpload} />
                                <button type="button" onClick={() => sagInputRef.current?.click()} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-radar-dark px-4 text-sm font-black uppercase text-white transition hover:bg-black">
                                    <UploadCloud className="h-4 w-4" />
                                    Importar SAG
                                </button>
                            </div>

                            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                                {latestSagUpload ? (
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                                                {latestSagUpload.fileName.toLowerCase().endsWith(".pdf") ? <FileText className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-radar-dark">{latestSagUpload.fileName}</p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">{formatFileSize(latestSagUpload.sizeBytes)} | {new Date(latestSagUpload.uploadedAt).toLocaleString("pt-BR")}</p>
                                            </div>
                                        </div>
                                        <span className="w-fit rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-black uppercase text-emerald-800">
                                            {latestSagUpload.status}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-5 text-center">
                                        <UploadCloud className="h-8 w-8 text-slate-300" />
                                        <p className="mt-2 text-sm font-black text-radar-dark">Nenhum arquivo SAG importado.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <aside className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-base font-black text-radar-dark">Pipeline de calculo</h2>
                                <ClipboardList className="h-5 w-5 text-radar-gold" />
                            </div>
                            <div className="mt-4 space-y-3">
                                {[
                                    "Leitura do arquivo SAG",
                                    "Normalizacao de colunas",
                                    "Filtros por UASG, PI e classe",
                                    "Conferencia dos totais",
                                ].map((item, index) => (
                                    <div key={item} className="flex items-center gap-3 rounded-md border border-slate-100 px-3 py-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-black text-slate-500">{index + 1}</span>
                                        <span className="text-sm font-bold text-slate-600">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>

                    {classeIIBudgetRows.map(row => (
                        <div key={row.scope} className="space-y-2">
                            <h2 className="text-xs font-black uppercase tracking-wide text-slate-500">{row.scope}</h2>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                {row.cards.map(item => {
                                    const Icon = item.icon;

                                    return (
                                        <div key={item.label} className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-start gap-2">
                                                        <p className="text-xs font-black uppercase leading-5 tracking-wide text-slate-400">{item.label}</p>
                                                        {item.label === "Total de creditos disponiveis de Classe II ambito CMO" && (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <button type="button" className="text-slate-300 hover:text-slate-500 transition-colors mt-0.5">
                                                                        <HelpCircle className="h-4 w-4" />
                                                                    </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-80 text-sm z-50 bg-white" side="right">
                                                                    <p className="font-bold mb-2">Heurística da Informação</p>
                                                                    <p className="text-slate-600 leading-relaxed">
                                                                        Dado obtido semiautomaticamente a partir do SAG. Para atualizar: Entre no SAG {'>'} SIAFI/Gestão {'>'} Saldos Gerenciais Exercício Corrente. Clique em &quot;exibir filtros&quot;. Na coluna Tabela 1 selecione [PI], Comando Militar, selecione [CMO], Plano interno preencha &quot;intendencia&quot; e selecione todos os PI E6MI, depois exporte PDF. Faça o upload deste PDF e o Sonar processa e exibe automaticamente o saldo.
                                                                    </p>
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}
                                                    </div>
                                                    <p className="mt-3 text-2xl font-black text-radar-dark">
                                                        {item.label === "Total de creditos disponiveis de Classe II ambito CMO" && totalDisponivelCmo !== null 
                                                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDisponivelCmo)
                                                            : "A informar"}
                                                    </p>
                                                    {item.label === "Total de creditos disponiveis de Classe II ambito CMO" && lastUploadDate && (
                                                        <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            Última atualização: {new Date(lastUploadDate).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className={`shrink-0 rounded-lg p-2 ${item.tone}`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </section>
            ) : (
                <section className="grid gap-4 md:grid-cols-3">
                    {budgetAreas.map((item) => {
                        const Icon = item.icon;

                        return (
                            <div key={item.label} className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{item.label}</p>
                                        <p className="mt-2 text-2xl font-black text-radar-dark">{item.value}</p>
                                        <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                                    </div>
                                    <div className={`rounded-lg p-2 ${item.tone}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}

            {!isClasseII && (
                <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
                    <div className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-black text-radar-dark">Quadro orcamentario da {selectedClass.shortLabel}</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Demonstrativo preparado para receber lancamentos por OM, natureza de despesa, empenho, liquidacao e saldo.
                                </p>
                            </div>
                            <BarChart3 className="h-5 w-5 text-radar-gold" />
                        </div>
                        <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                            Nenhum lancamento orcamentario cadastrado para esta classe.
                        </div>
                    </div>

                    <aside className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-black text-radar-dark">Estrutura prevista</h2>
                            <ClipboardList className="h-5 w-5 text-radar-gold" />
                        </div>
                        <div className="mt-4 space-y-3 text-sm text-slate-600">
                            <p>Credito descentralizado por OM.</p>
                            <p>Empenhos, liquidacoes e saldos por classe.</p>
                            <p>Alertas para pendencias orcamentarias relevantes.</p>
                        </div>
                    </aside>
                </section>
            )}
        </div>
    );
}
