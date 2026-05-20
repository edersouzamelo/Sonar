"use client"

import { useChat, Message } from 'ai/react';
import { useTenders } from '@/contexts/tenders-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Bot, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function ChatAssistant() {
    const { tenders, people, pregoeiros, supervisors } = useTenders();

    // Simplificando os dados para enviar menos tokens e apenas o essencial para a IA
    const simplifiedTenders = tenders.map(t => ({
        id: t.id,
        numero: t.number,
        status: t.status,
        faseAtual: t.currentStage,
        setorRequisitante: t.requesterSector || t.department,
        objeto: t.description || 'Não informado',
        coordenador: t.coordinator || t.coord || 'Não atribuído',
        processoNup: t.nup || 'Não informado',
        eDaOM: t.isGCALC === false ? 'Sim (OM)' : 'Não (GCALC)',
        pregoeiro: t.pregoeiro || 'Não atribuído',
        prazos_datas: t.dates || {},
        historico_tramitacao: t.updates.map(u => ({ data: u.date, evento: u.description })),
        observacoes_incidentes: (t.observations || []).map(o => ({ data: o.date, autor: o.author, texto: o.content }))
    }));

    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: '/api/chat',
        body: {
            tendersData: simplifiedTenders,
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
        <Card className="flex flex-col h-full min-h-[600px] w-full rounded-[1.5rem] border-none shadow-sm bg-white dark:bg-slate-900 border-2 border-transparent relative overflow-hidden group">
            {/* Efeito Glow borda animada */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-radar-gold to-transparent opacity-0 transition-opacity duration-1000 group-hover:opacity-100" />

            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-radar-gold/40 shadow-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <img src="/colosso.png" alt="Colosso" className="w-full h-full object-cover object-top" />
                        </div>
                        <div className="flex flex-col">
                            <span className="leading-none text-radar-dark dark:text-white">Colosso</span>
                            <span className="text-[10px] font-normal text-slate-500 flex items-center gap-1 mt-1">
                                <Sparkles className="w-3 h-3 text-radar-gold" />
                                Inteligência SONAR
                            </span>
                        </div>
                    </div>
                </CardTitle>
                <CardDescription className="text-xs pt-1">
                    Eu sou Colosso. Pergunte-me qualquer coisa sobre os processos logísticos do sistema.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
                {/* Janela de Mensagens */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 relative scroll-smooth bg-slate-50/50 dark:bg-transparent"
                >
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60 px-6">
                            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-radar-gold/20 shadow-lg bg-slate-100 dark:bg-slate-800 mb-4 shrink-0">
                                <img src="/colosso.png" alt="Colosso" className="w-full h-full object-cover object-top" />
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Eu sou Colosso. Pergunte-me qualquer coisa sobre os processos logísticos do sistema.
                            </p>
                            <div className="mt-3 flex flex-col gap-2 w-full text-xs">
                                <span className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 py-2 px-3 rounded-lg text-slate-600 dark:text-slate-400">"Como está a execução orçamentária das classes de suprimento?"</span>
                                <span className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 py-2 px-3 rounded-lg text-slate-600 dark:text-slate-400">"Como está o estoque das classes das OM?"</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-center gap-2 border border-red-100">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            Erro de conexão: Verifique se sua CHAVE API da OpenAI está configurada no servidor.
                        </div>
                    )}

                    {messages.map((message: Message) => (
                        <div key={message.id} className={cn("flex w-full gap-2", message.role === 'user' ? "justify-end" : "justify-start")}>
                            {message.role !== 'user' && (
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800 shrink-0 mt-1">
                                    <img src="/colosso.png" alt="Colosso" className="w-full h-full object-cover object-top" />
                                </div>
                            )}
                            <div
                                className={cn(
                                    "flex flex-col max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm text-sm border",
                                    message.role === "user"
                                        ? "bg-slate-800 text-slate-50 dark:bg-slate-700 dark:text-white self-end rounded-tr-sm border-transparent"
                                        : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 self-start rounded-tl-sm border-slate-200 dark:border-slate-700"
                                )}
                            >
                                <span className="font-semibold text-[10px] mb-1 opacity-60 uppercase tracking-wider">
                                    {message.role === 'user' ? 'Você' : 'Colosso'}
                                </span>
                                <span className="whitespace-pre-wrap leading-relaxed">
                                    {message.content}
                                </span>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="bg-white dark:bg-slate-800 text-slate-400 self-start mr-auto rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-radar-gold" />
                            <span className="text-xs font-medium">Analisando processos...</span>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (input.trim()) handleSubmit(e);
                    }}
                    className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-end gap-2 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10"
                >
                    <textarea
                        className="flex-1 text-sm bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-radar-gold/50 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none min-h-[60px]"
                        rows={3}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (input.trim()) handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                            }
                        }}
                        placeholder="Pergunte sobre os processos..."
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        disabled={isLoading || !(input || '').trim()}
                        className="h-12 w-12 rounded-xl bg-radar-gold hover:bg-radar-gold/90 text-radar-dark shadow-md disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all flex-shrink-0 p-0 mb-0.5"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
