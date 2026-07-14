"use client";

import { useRef } from "react";
import { AlertTriangle, BarChart3, FileText, ImageIcon, ListChecks, Table2 } from "lucide-react";
import type { PresentationSlide } from "@/lib/presentations/types";
import { cn } from "@/lib/utils";

type SlidePreviewProps = {
    slide: PresentationSlide;
    variant?: "editor" | "monitor";
    className?: string;
    onContentChange?: (field: keyof PresentationSlide["content"], value: string) => void;
    onTextBoxChange?: (textBox: NonNullable<PresentationSlide["textBox"]>) => void;
};

const labelByType: Record<PresentationSlide["slideType"], string> = {
    capa: "Capa",
    livre: "Livre",
    indicadores: "Indicadores",
    tabela: "Tabela",
    grafico: "Grafico",
    processos: "Processos",
    alerta: "Alerta",
    imagem: "Imagem",
    branco: "Branco",
};

function TypeIcon({ type }: { type: PresentationSlide["slideType"] }) {
    if (type === "tabela") return <Table2 className="h-4 w-4" />;
    if (type === "grafico" || type === "indicadores") return <BarChart3 className="h-4 w-4" />;
    if (type === "processos") return <ListChecks className="h-4 w-4" />;
    if (type === "alerta") return <AlertTriangle className="h-4 w-4" />;
    if (type === "imagem") return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
}

function Indicators({ slide }: { slide: PresentationSlide }) {
    const indicators = slide.content.indicators || [];
    if (!indicators.length) return null;

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {indicators.slice(0, 4).map(indicator => (
                <div key={indicator.id} className="rounded-md border border-white/10 bg-white/10 p-3">
                    <p className="text-xs font-black uppercase tracking-wide text-radar-gold">{indicator.name}</p>
                    <p className="mt-2 text-2xl font-black text-white">{indicator.value}</p>
                    {indicator.observation && <p className="mt-1 text-xs font-medium leading-5 text-white/70">{indicator.observation}</p>}
                </div>
            ))}
        </div>
    );
}

function ProcessList({ slide }: { slide: PresentationSlide }) {
    const processes = slide.content.processes || [];
    if (!processes.length) return null;

    return (
        <div className="space-y-2">
            {processes.slice(0, 4).map(process => (
                <div key={process.id} className="rounded-md border border-white/10 bg-white/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-white">{process.process}</p>
                        <span className="rounded-md bg-radar-gold px-2 py-1 text-xs font-black text-radar-dark">{process.situation}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white/80">{process.object}</p>
                    <p className="mt-1 text-xs leading-5 text-white/65">Pendente: {process.pending} | Proximo passo: {process.nextStep}</p>
                </div>
            ))}
        </div>
    );
}

function DataTable({ slide }: { slide: PresentationSlide }) {
    const table = slide.content.table;
    if (!table) return null;

    return (
        <div className="overflow-hidden rounded-md border border-white/10 bg-white/10">
            <table className="w-full table-fixed text-left text-xs text-white">
                <thead className="bg-white/10 text-[11px] uppercase tracking-wide text-radar-gold">
                    <tr>
                        {table.columns.slice(0, 5).map(column => <th key={column} className="px-3 py-2 font-black">{column}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.slice(0, 6).map((row, rowIndex) => (
                        <tr key={`${row.join("-")}-${rowIndex}`} className="border-t border-white/10">
                            {table.columns.slice(0, 5).map((column, columnIndex) => (
                                <td key={`${column}-${columnIndex}`} className="truncate px-3 py-2 text-white/75">{row[columnIndex] || "-"}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ChartBars({ slide }: { slide: PresentationSlide }) {
    const chart = slide.content.chart;
    if (!chart) return null;

    const max = Math.max(...chart.data.map(item => item.value), 1);
    return (
        <div className="space-y-3">
            {chart.data.slice(0, 7).map(item => {
                const width = Math.max(6, Math.round((item.value / max) * 100));
                return (
                    <div key={item.label} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3 text-sm text-white">
                        <span className="truncate font-bold text-white/75">{item.label}</span>
                        <div className="h-4 overflow-hidden rounded-sm bg-white/10">
                            <div className="h-full rounded-sm bg-radar-gold" style={{ width: `${width}%` }} />
                        </div>
                        <span className="text-right font-black">{item.percent ?? item.value}%</span>
                    </div>
                );
            })}
        </div>
    );
}

function AlertBlock({ slide }: { slide: PresentationSlide }) {
    const alert = slide.content.alert;
    if (!alert) return null;

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {[
                ["Fato", alert.fact],
                ["Impacto", alert.impact],
                ["Risco", alert.risk],
                ["Providencia", alert.action],
                ["Decisao", alert.decisionRequired],
            ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-radar-gold/30 bg-radar-gold/10 p-3">
                    <p className="text-xs font-black uppercase tracking-wide text-radar-gold">{label}</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-white/80">{value}</p>
                </div>
            ))}
        </div>
    );
}

export function PresentationSlidePreview({ slide, variant = "editor", className, onContentChange, onTextBoxChange }: SlidePreviewProps) {
    const isMonitor = variant === "monitor";
    const isEditable = !isMonitor && Boolean(onContentChange);
    const body = slide.content.body || slide.content.notes || "";
    const provenance = slide.content.table?.provenance || slide.content.chart?.provenance || slide.content.indicators?.[0]?.provenance;
    const textColor = slide.textColor || "#FFFFFF";
    const textBox = slide.textBox || { x: 8, y: 18, width: 70 };
    const frameRef = useRef<HTMLDivElement | null>(null);

    const beginDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!isEditable || !onTextBoxChange || !frameRef.current) return;
        event.preventDefault();
        const frame = frameRef.current.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        const initial = textBox;
        const pointerId = event.pointerId;
        event.currentTarget.setPointerCapture(pointerId);

        const move = (moveEvent: PointerEvent) => {
            const nextX = Math.min(95 - initial.width, Math.max(0, initial.x + ((moveEvent.clientX - startX) / frame.width) * 100));
            const nextY = Math.min(82, Math.max(4, initial.y + ((moveEvent.clientY - startY) / frame.height) * 100));
            onTextBoxChange({ ...initial, x: Number(nextX.toFixed(1)), y: Number(nextY.toFixed(1)) });
        };
        const stop = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop, { once: true });
    };

    return (
        <div
            ref={frameRef}
            className={cn(
                "relative flex aspect-video w-full flex-col overflow-hidden rounded-lg border border-black/10 shadow-sm",
                isMonitor && "h-screen rounded-none border-0",
                className,
            )}
            style={{
                backgroundColor: slide.backgroundColor || "#1A1A1A",
                backgroundImage: slide.backgroundImage?.dataUrl ? `url(${slide.backgroundImage.dataUrl})` : undefined,
                backgroundPosition: "center",
                backgroundSize: "cover",
            }}
        >
            <div className="absolute inset-x-0 top-0 h-1 bg-radar-gold" />
            <div className={cn("slide-preview-content relative flex flex-1 flex-col p-6", isMonitor && "p-12")} style={{ color: textColor }}>
                <div className="absolute right-6 top-6 z-10 text-right text-xs font-black uppercase tracking-wide opacity-60">{slide.classIdentification}</div>
                <div
                    className="absolute z-10"
                    style={{ left: `${textBox.x}%`, top: `${textBox.y}%`, width: `${textBox.width}%`, color: textColor }}
                >
                    {isEditable && (
                        <button
                            type="button"
                            onPointerDown={beginDrag}
                            className="mb-2 inline-flex cursor-move items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-800 shadow-sm"
                            title="Arrastar caixa de texto"
                        >
                            Mover texto
                        </button>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md border border-black/10 bg-black/10 px-2 py-1 text-[11px] font-black uppercase tracking-wide" style={{ color: textColor }}>
                            <TypeIcon type={slide.slideType} />
                            {labelByType[slide.slideType]}
                        </span>
                        {slide.publishToMonitor && <span className="rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-white">Monitor</span>}
                        {slide.isHidden && <span className="rounded-md bg-slate-500 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-white">Oculto</span>}
                    </div>
                        {isEditable ? (
                            <textarea
                                value={slide.content.title || slide.title}
                                onChange={event => onContentChange?.("title", event.target.value)}
                                aria-label="Titulo do slide"
                                rows={2}
                                className="mt-4 block w-full max-w-5xl resize-none overflow-hidden rounded-md border border-transparent bg-transparent p-1 text-3xl font-black leading-tight outline-none transition placeholder:text-slate-400 hover:border-black/15 hover:bg-white/10 focus:border-radar-gold/70 focus:bg-white/20"
                                style={{ color: textColor }}
                                placeholder="Titulo do slide"
                            />
                        ) : (
                            <h2 className={cn("mt-4 max-w-5xl text-3xl font-black leading-tight", isMonitor && "text-5xl")} style={{ color: textColor }}>
                                {slide.content.title || slide.title}
                            </h2>
                        )}
                        {isEditable ? (
                            <input
                                value={slide.content.subtitle || ""}
                                onChange={event => onContentChange?.("subtitle", event.target.value)}
                                aria-label="Subtitulo do slide"
                                className="mt-2 block w-full max-w-4xl rounded-md border border-transparent bg-transparent p-1 text-sm font-bold text-radar-gold outline-none transition placeholder:text-radar-gold/45 hover:border-white/15 hover:bg-white/5 focus:border-radar-gold/70 focus:bg-black/20"
                                placeholder="Subtitulo"
                            />
                        ) : (
                            slide.content.subtitle && <p className={cn("mt-2 text-sm font-bold text-radar-gold", isMonitor && "text-xl")}>{slide.content.subtitle}</p>
                        )}

                <div className={cn("mt-5 min-h-0 space-y-4 overflow-visible", isMonitor && "mt-10 space-y-7")}>
                    {isEditable ? (
                        <textarea
                            value={body}
                            onChange={event => onContentChange?.("body", event.target.value)}
                            aria-label="Texto do slide"
                            className="min-h-28 w-full max-w-4xl resize-none rounded-md border border-transparent bg-transparent p-1 text-sm font-medium leading-6 outline-none transition placeholder:text-slate-400 hover:border-black/15 hover:bg-white/10 focus:border-radar-gold/70 focus:bg-white/20"
                            style={{ color: textColor }}
                            placeholder="Digite o texto do slide"
                        />
                    ) : (
                        body && <p className={cn("max-w-4xl whitespace-pre-wrap text-sm font-medium leading-6 opacity-90", isMonitor && "text-2xl leading-9")} style={{ color: textColor }}>{body}</p>
                    )}
                    <Indicators slide={slide} />
                    <ProcessList slide={slide} />
                    <DataTable slide={slide} />
                    <ChartBars slide={slide} />
                    <AlertBlock slide={slide} />
                    {slide.content.image && (
                        <div className="flex h-44 items-center justify-center rounded-md border border-dashed border-white/20 bg-white/10 text-center text-white/70">
                            <div>
                                <ImageIcon className="mx-auto h-8 w-8" />
                                <p className="mt-2 text-sm font-bold">{slide.content.image.title || "Imagem de apoio"}</p>
                                {slide.content.image.caption && <p className="mt-1 text-xs">{slide.content.image.caption}</p>}
                            </div>
                        </div>
                    )}
                </div>
                </div>

                {slide.showFooter && (
                    <div className="absolute inset-x-6 bottom-5 flex items-center justify-between gap-3 border-t border-current/20 pt-3 text-[11px] font-bold uppercase tracking-wide opacity-55">
                        <span>{slide.referenceDate || "Sem data"}</span>
                        <span className="truncate text-right">{provenance?.sourceLabel || slide.dataSource || "Fonte nao informada"}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
