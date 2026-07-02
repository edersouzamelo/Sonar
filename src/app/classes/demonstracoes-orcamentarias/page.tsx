"use client"

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Banknote, BarChart3, CircleDollarSign, ClipboardList, TrendingUp } from "lucide-react";
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

export default function DemonstracoesOrcamentariasPage() {
    const searchParams = useSearchParams();
    const classKey = searchParams.get("classe") || defaultSupplyClassKey;
    const selectedClass = getSupplyClass(classKey);

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
        </div>
    );
}
