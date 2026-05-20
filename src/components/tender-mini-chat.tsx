"use client"

import { useChat, Message } from 'ai/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Sparkles, AlertCircle, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Tender } from '@/types';
import { useTenders } from '@/contexts/tenders-context';

export function TenderMiniChat({ tender }: { tender: Tender }) {
    const { people, pregoeiros, supervisors } = useTenders();
    const [isExpanded, setIsExpanded] = useState(false);

    // Simplifying the data so it only contains the contextual tender
    const simplifiedTender = [{
        id: tender.id,
        numero: tender.number,
        status: tender.status,
        faseAtual: tender.currentStage,
        setorRequisitante: tender.requesterSector || tender.department,
        objeto: tender.description || 'Não informado',
        coordenador: tender.coordinator || tender.coord || 'Não atribuído',
        processoNup: tender.nup || 'Não informado',
        eDaOM: tender.isGCALC === false ? 'Sim (OM)' : 'Não (GCALC)',
        pregoeiro: tender.pregoeiro || 'Não atribuído',
        prazos_datas: tender.dates || {},
        historico_tramitacao: (tender.updates || []).map(u => ({ data: u.date, evento: u.description })),
        observacoes_incidentes: (tender.observations || []).map(o => ({ data: o.date, autor: o.author, texto: o.content }))
    }];

    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: '/api/chat',
        body: {
            tendersData: simplifiedTender,
            teamData: { people, pregoeiros, supervisors }
        }
    });

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            scrollContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <Card className={cn("flex flex-col border-none shadow-md bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 transition-all duration-300",
            isExpanded ? "md:fixed md:bottom-6 md:right-6 md:w-[450px] md:h-[600px] z-50 fixed inset-0 w-full h-full rounded-none md:rounded-2xl" : "w-full h-[500px]"
        )}>
            <CardHeader className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-row justify-between items-center rounded-t-xl">
                <CardTitle className="text-sm font-bold flex items-center gap-2 m-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-radar-gold/40 shadow-sm bg-slate-100 dark:bg-slate-800 shrink-0">
                        <img src="/colosso.png" alt="Colosso" className="w-full h-full object-cover object-top" />
                    </div>
                    <div className="flex flex-col">
                        <span className="leading-none text-radar-dark dark:text-white">Colosso</span>
                        <span className="text-[9px] font-normal text-slate-500 flex items-center gap-1 mt-0.5 uppercase tracking-wider">
                            <Sparkles className="w-2.5 h-2.5 text-radar-gold" />
                            Assistente Logístico
                        </span>
                    </div>
                </CardTitle>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col flex-1 overflow-hidden relative">
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-3 space-y-3 relative scroll-smooth bg-slate-50/30 dark:bg-transparent"
                >
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-70">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                Eu sou Colosso. Pergunte-me qualquer coisa sobre os processos logísticos do sistema.
                            </p>
                            <span className="text-[10px] mt-2 block text-muted-foreground w-full">Por exemplo: "Como está a execução orçamentária das classes de suprimento?", "Como está o estoque das classes das OM?"</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-2 rounded-lg text-xs flex items-center gap-2 border border-red-100">
                            <AlertCircle className="w-4 h-4 shrink-0" /> Erro de conexão com a IA.
                        </div>
                    )}

                    {messages.map((message: Message) => (
                        <div key={message.id} className={cn("flex w-full gap-1.5", message.role === 'user' ? "justify-end" : "justify-start")}>
                            {message.role !== 'user' && (
                                <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                                    <img src="/colosso.png" alt="Colosso" className="w-full h-full object-cover object-top" />
                                </div>
                            )}
                            <div
                                className={cn(
                                    "flex flex-col max-w-[85%] rounded-2xl px-3 py-2 shadow-sm text-sm border",
                                    message.role === "user"
                                        ? "bg-slate-800 text-slate-50 dark:bg-slate-700 dark:text-white self-end rounded-tr-sm border-transparent"
                                        : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 self-start rounded-tl-sm border-slate-200 dark:border-slate-700"
                                )}
                                style={message.role === "user" ? { backgroundColor: "#1e293b", color: "#f8fafc" } : undefined}
                            >
                                <span className="font-semibold text-[9px] mb-0.5 opacity-60 uppercase tracking-wider">
                                    {message.role === 'user' ? 'Você' : 'Colosso'}
                                </span>
                                <span className="whitespace-pre-wrap leading-relaxed text-xs">
                                    {message.content}
                                </span>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="bg-white dark:bg-slate-800 text-slate-400 self-start ml-7 rounded-2xl rounded-tl-sm px-3 py-2 border border-slate-200 dark:border-slate-700 flex items-center gap-2 w-max shadow-sm">
                            <Loader2 className="w-3 h-3 animate-spin text-radar-gold" />
                            <span className="text-[10px] font-medium">Buscando contexto...</span>
                        </div>
                    )}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (input.trim()) handleSubmit(e);
                    }}
                    className="px-2 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
                >
                    <input
                        className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-radar-gold transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Mensagem para o assistente..."
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || !(input || '').trim()}
                        className="h-9 w-9 bg-radar-gold hover:bg-radar-gold/90 text-radar-dark shrink-0 p-0 rounded-lg shadow-sm"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </Button>
                </form>
            </CardContent>
        </Card >
    );
}
