"use client"

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, Presentation, UploadCloud } from "lucide-react";
import { defaultSupplyClassKey, getSupplyClass } from "@/lib/supply-classes";

const presentationAreas = [
    {
        title: "Briefings da Classe",
        detail: "Materiais de reuniao, situacoes atualizadas e apresentacoes para assessoramento.",
        icon: Presentation,
    },
    {
        title: "Paineis e anexos",
        detail: "Espaco para consolidar quadros, imagens, planilhas e arquivos usados nas apresentacoes.",
        icon: FileText,
    },
    {
        title: "Agenda de exposicoes",
        detail: "Controle das proximas apresentacoes, responsaveis e prazos de preparacao.",
        icon: CalendarDays,
    },
];

export default function ApresentacoesPage() {
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
                    <h1 className="text-3xl font-bold text-radar-dark">Apresentações</h1>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                        Area de trabalho para organizar briefings, paineis e materiais de apresentacao da {selectedClass.label}.
                    </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-blue-700">
                    Novo modulo
                </span>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
                {presentationAreas.map((item) => {
                    const Icon = item.icon;

                    return (
                        <div key={item.title} className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-black text-radar-dark">{item.title}</h2>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.detail}</p>
                                </div>
                                <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </section>

            <section className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <UploadCloud className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-black text-radar-dark">Biblioteca de apresentacoes</h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
                    Este espaco fica reservado para receber os arquivos, links e versoes de apresentacao da {selectedClass.shortLabel}.
                </p>
            </section>
        </div>
    );
}
