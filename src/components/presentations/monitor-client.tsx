"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LogOut, Maximize2, Pause, Play } from "lucide-react";
import { PresentationSlidePreview } from "@/components/presentations/slide-preview";
import type { PresentationSlide } from "@/lib/presentations/types";

type MonitorClientProps = {
    title: string;
    subtitle?: string;
    slides: PresentationSlide[];
    exitHref?: string;
};

export function MonitorClient({ title, subtitle, slides, exitHref = "/" }: MonitorClientProps) {
    const visibleSlides = useMemo(
        () => slides.filter(slide => !slide.isHidden).sort((a, b) => a.position - b.position),
        [slides],
    );
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const safeIndex = visibleSlides.length > 0 ? Math.min(index, visibleSlides.length - 1) : 0;
    const current = visibleSlides[safeIndex];

    useEffect(() => {
        if (paused || !current || visibleSlides.length <= 1) return;
        const duration = Math.max(5, current.monitorDuration || 15) * 1000;
        const timer = window.setTimeout(() => {
            setIndex(value => (value + 1) % visibleSlides.length);
        }, duration);
        return () => window.clearTimeout(timer);
    }, [current, paused, visibleSlides.length]);

    const previous = () => setIndex(value => (value - 1 + visibleSlides.length) % visibleSlides.length);
    const next = () => setIndex(value => (value + 1) % visibleSlides.length);
    const enterFullscreen = () => document.documentElement.requestFullscreen?.();

    if (!current) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-radar-dark p-8 text-center text-white">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-radar-gold">SONAR</p>
                    <h1 className="mt-4 text-3xl font-black">{title}</h1>
                    <p className="mt-3 text-sm font-semibold text-white/60">Nenhum slide publicado para exibicao.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-black text-white">
            <PresentationSlidePreview slide={current} variant="monitor" />

            <div className="absolute left-5 top-5 rounded-md bg-black/55 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/75 backdrop-blur">
                {title}
                {subtitle && <span className="ml-2 text-radar-gold">{subtitle}</span>}
            </div>

            <Link
                href={exitHref}
                className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/60 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/80 shadow-lg backdrop-blur transition hover:bg-white/10 hover:text-white"
                aria-label="Sair do modo palco"
            >
                <LogOut className="h-4 w-4" />
                Sair
            </Link>

            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-md border border-white/10 bg-black/60 px-3 py-2 backdrop-blur">
                <button type="button" onClick={previous} className="rounded-md p-2 text-white/75 transition hover:bg-white/10 hover:text-white" aria-label="Slide anterior">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => setPaused(value => !value)} className="rounded-md p-2 text-white/75 transition hover:bg-white/10 hover:text-white" aria-label={paused ? "Retomar" : "Pausar"}>
                    {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </button>
                <button type="button" onClick={next} className="rounded-md p-2 text-white/75 transition hover:bg-white/10 hover:text-white" aria-label="Proximo slide">
                    <ChevronRight className="h-5 w-5" />
                </button>
                <button type="button" onClick={enterFullscreen} className="rounded-md p-2 text-white/75 transition hover:bg-white/10 hover:text-white" aria-label="Tela cheia">
                    <Maximize2 className="h-5 w-5" />
                </button>
                <span className="px-2 text-xs font-black text-white/60">{safeIndex + 1}/{visibleSlides.length}</span>
            </div>
        </main>
    );
}
