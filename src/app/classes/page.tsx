"use client"

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Banknote, FileSpreadsheet, Presentation } from "lucide-react";
import { defaultSupplyClassKey, getSupplyClass, supplyClasses } from "@/lib/supply-classes";

const classModules = [
    {
        title: "Consolidacoes",
        href: "consolidacoes",
        description: (shortLabel: string) =>
            `Planilha de demandas por OM, com upload por celula, prazos, arquivo e colunas editaveis para ${shortLabel}.`,
        icon: FileSpreadsheet,
        iconClassName: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100",
        status: "Ativo",
        statusClassName: "bg-emerald-50 text-emerald-700",
    },
    {
        title: "Apresentações",
        href: "apresentacoes",
        description: (shortLabel: string) =>
            `Repositorio de briefings, paineis e materiais de apresentacao vinculados a ${shortLabel}.`,
        icon: Presentation,
        iconClassName: "bg-blue-50 text-blue-700 group-hover:bg-blue-100",
        status: "Novo",
        statusClassName: "bg-blue-50 text-blue-700",
    },
    {
        title: "Demonstrações Orçamentárias",
        href: "demonstracoes-orcamentarias",
        description: (shortLabel: string) =>
            `Quadro para acompanhar creditos, empenhos, liquidacoes e saldos orcamentarios da ${shortLabel}.`,
        icon: Banknote,
        iconClassName: "bg-amber-50 text-amber-700 group-hover:bg-amber-100",
        status: "Novo",
        statusClassName: "bg-amber-50 text-amber-700",
    },
];

export default function ClassesPage() {
    const searchParams = useSearchParams();
    const selectedClass = getSupplyClass(searchParams.get("classe") || defaultSupplyClassKey);

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="text-3xl font-bold text-radar-dark">{selectedClass.label}</h1>
                <p className="mt-1 max-w-3xl text-sm text-slate-500">
                    Area de trabalho para organizacao dos processos, documentos e dados desta classe de suprimento.
                </p>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {classModules.map((item) => {
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={`/classes/${item.href}?classe=${selectedClass.key}`}
                            className="group flex min-h-44 flex-col justify-between rounded-lg border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-radar-gold hover:shadow-lg"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className={`rounded-lg p-3 transition-colors ${item.iconClassName}`}>
                                    <Icon className="h-7 w-7" />
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${item.statusClassName}`}>
                                    {item.status}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-radar-dark">{item.title}</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {item.description(selectedClass.shortLabel)}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </section>

            <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-wide text-radar-dark">Outras classes</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                    {supplyClasses.map(item => (
                        <Link
                            key={item.key}
                            href={`/classes?classe=${item.key}`}
                            className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${item.key === selectedClass.key ? "border-radar-gold bg-amber-50 text-radar-dark" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                        >
                            {item.shortLabel}
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
