"use client"

import { useState, useMemo } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useTenders } from "@/contexts/tenders-context"
import { format, isSameDay, parseISO, isBefore, startOfDay, differenceInDays, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import {
    Clock,
    AlertCircle,
    CheckCircle2,
    Calendar as CalendarIcon,
    ChevronRight,
    Search,
    History,
    Timer,
    ArrowLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AgendaEvent, Person } from "@/types"
import { generateAgendaReport } from "@/lib/report-utils"
import { FileDown, MessageSquare } from "lucide-react"



export default function AgendaPage() {
    const { tenders, dateChecks } = useTenders()
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [searchQuery, setSearchQuery] = useState("")
    const router = useRouter()

    const today = startOfDay(new Date())

    // Mapeamento extensivo de todas as datas do sistema
    const allEvents = useMemo(() => {
        const events: AgendaEvent[] = []

        tenders.forEach(t => {
            const isCancelled = t.status.includes('CANCELADO') || t.status === 'ABANDONADO';
            if (isCancelled) return;

            const checks = dateChecks[t.id] || {}

            const addEvent = (dateStr: string | undefined, label: string, checkKey: string, type: AgendaEvent['type'] = 'deadline') => {
                if (!dateStr) return
                try {
                    const date = startOfDay(parseISO(dateStr))
                    if (!isValid(date)) return

                    const isOk = !!checks[checkKey]
                    const isFinished = t.status === 'HOMOLOGADO'
                    const isOverdue = !isOk && isBefore(date, today) && !isFinished
                    const daysDiff = differenceInDays(today, date)

                    events.push({
                        id: `${t.id}-${label}-${dateStr}`,
                        tenderId: t.id,
                        tenderNumber: t.number,
                        uasg: t.uasg,
                        label,
                        date,
                        type,
                        isOk,
                        isOverdue,
                        tenderStatus: t.status,
                        description: t.description,
                        requesterSector: t.requesterSector || '',
                        daysDiff
                    })
                } catch (e) {
                    console.error("Erro ao processar data:", dateStr)
                }
            }

            // Mapear cada campo de data conhecido (Sincronizado com TenderRow)
            addEvent(t.dates?.protocoloSetorRequisitante?.defined, "Prazo SAL", "protocoloSetorRequisitante.defined")
            addEvent(t.dates?.cjuSendDeadline, "Envio CJU", "cjuSendDeadline")
            addEvent(t.dates?.cjuReturnDate, "Regresso CJU", "cjuReturnDate", "effective")
            addEvent(t.dates?.publicationAdjustmentsDeadline, "Ajustes Publicação", "publicationAdjustmentsDeadline")
            addEvent(t.dates?.publicationDate, "Publicação", "publicationDate", "effective")
            addEvent(t.dates?.proposalOpeningDate, "Sessão Pública", "proposalOpeningDate", "effective")
            addEvent(t.dates?.homologationForecast, "Previsão Homologação", "homologationForecast", "forecast")
            addEvent(t.dates?.homologationDeadline, "Prazo Homologação", "homologationDeadline")
            addEvent(t.dates?.minutesSignatureDeadline, "Assinatura Atas", "minutesSignatureDeadline")
            addEvent(t.dates?.prazoGCALC, "Prazo GCALC", "prazoGCALC")
            addEvent(t.dates?.vigenciaAnterior, "Vigência Anterior", "vigenciaAnterior")
        })

        return events.sort((a, b) => a.date.getTime() - b.date.getTime())
    }, [tenders, dateChecks, today])

    // Filtragem por busca
    const filteredEvents = allEvents.filter(e =>
        e.tenderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.uasg.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Separação das colunas
    const overdueEvents = useMemo(() =>
        filteredEvents
            .filter(e => e.isOverdue)
            .sort((a, b) => b.daysDiff - a.daysDiff)
        , [filteredEvents])

    const upcomingEvents = useMemo(() =>
        filteredEvents
            .filter(e => !e.isOverdue && !e.isOk && !isBefore(e.date, today))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
        , [filteredEvents, today])

    // Eventos do dia selecionado
    const selectedDateEvents = selectedDate
        ? filteredEvents.filter(e => isSameDay(e.date, selectedDate))
        : []

    // Dias que possuem eventos para o modificador do calendário
    const eventDays = useMemo(() => allEvents.map(e => e.date), [allEvents])

    // Variantes de animação
    const containerVariants: Variants = {
        hidden: { opacity: 0, y: 50, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", damping: 25, stiffness: 200 }
        },
        exit: {
            opacity: 0,
            y: 20,
            scale: 0.95,
            transition: { duration: 0.3, ease: "easeInOut" }
        }
    }

    const blindVariants: Variants = {
        hidden: { height: 0, opacity: 0 },
        visible: {
            height: "auto",
            opacity: 1,
            transition: {
                height: { duration: 0.5, ease: "circOut" },
                opacity: { duration: 0.3, delay: 0.2 }
            }
        },
        exit: {
            height: 0,
            opacity: 0,
            transition: {
                height: { duration: 0.4, ease: "circIn" },
                opacity: { duration: 0.2 }
            }
        }
    }

    const handleWhatsAppNotify = (event: AgendaEvent) => {
        const message = `Olá! Sou do setor de licitações. Gostaria de avisar que o prazo para o evento "${event.label}" do Pregão nº ${event.tenderNumber} vence em ${format(event.date, "dd/MM/yyyy")}. Favor providenciar a documentação necessária.`;
        const encodedMessage = encodeURIComponent(message);

        // Tentar encontrar o contato do setor se houver telefone
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    const EventItem = ({ event }: { event: AgendaEvent }) => (

        <div
            className={cn(
                "group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
                event.isOverdue ? "bg-red-50/40 border-red-100 hover:border-red-200" :
                    "bg-white border-slate-100 hover:shadow-md dark:bg-slate-900 shadow-sm"
            )}
        >
            <div className={cn(
                "flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0",
                event.isOverdue ? "bg-red-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
            )}>
                <span className="text-[10px] font-bold uppercase">{format(event.date, "MMM", { locale: ptBR })}</span>
                <span className="text-lg font-black leading-none">{format(event.date, "dd")}</span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-sm truncate uppercase tracking-tight">
                        {event.tenderNumber}
                    </h3>
                    {event.daysDiff > 0 ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                            Vencido há {event.daysDiff} {event.daysDiff === 1 ? 'dia' : 'dias'}
                        </span>
                    ) : event.daysDiff < 0 ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Faltam {Math.abs(event.daysDiff)} {Math.abs(event.daysDiff) === 1 ? 'dia' : 'dias'}
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-radar-gold bg-radar-gold/10 px-2 py-0.5 rounded-full">
                            Vence Hoje
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mb-1 font-medium italic">
                    {event.description}
                </p>
                <div className="flex items-center gap-2 text-xs">
                    <span className={cn(
                        "font-semibold",
                        event.isOverdue ? "text-red-600" : "text-radar-gold"
                    )}>
                        {event.label}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 font-bold">{event.requesterSector}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 truncate">{event.tenderStatus}</span>
                </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    title="Avisar via WhatsApp"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleWhatsAppNotify(event);
                    }}
                >
                    <MessageSquare className="w-4 h-4" />
                </Button>
                {event.isOverdue ? (
                    <AlertCircle
                        className="w-5 h-5 text-red-500 cursor-pointer hover:scale-125 transition-transform"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/tenders?highlightId=${event.tenderId}`);
                        }}
                    />
                ) : (
                    <Clock className="w-5 h-5 text-slate-300 group-hover:text-radar-gold transition-colors" />
                )}
            </div>

        </div>
    )

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-4 sm:px-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-radar-dark dark:text-radar-cream flex items-center gap-3">
                        <div className="p-2 bg-radar-gold/10 rounded-xl">
                            <CalendarIcon className="w-8 h-8 text-radar-gold" />
                        </div>
                        Radar de Prazos e Compromissos
                    </h1>
                    <p className="text-muted-foreground mt-1">Visão analítica de atrasos e próximos passos operacionais.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => generateAgendaReport(allEvents)}
                        className="bg-white hover:bg-slate-50 text-radar-dark border-slate-200 shadow-sm gap-2 rounded-xl h-10 px-4"
                        variant="outline"
                    >
                        <FileDown className="w-4 h-4 text-radar-gold" />
                        <span className="font-bold text-[10px] uppercase tracking-tight">Geral</span>
                    </Button>
                    <Button
                        onClick={() => {
                            const salEvents = allEvents.filter(e => e.label.includes("Prazo SAL") && !e.isOk);
                            generateAgendaReport(salEvents, "Relatório de Acionamento - Requisitantes (Prazo SAL)");
                        }}
                        className="bg-white hover:bg-blue-50 text-blue-700 border-blue-100 shadow-sm gap-2 rounded-xl h-10 px-4"
                        variant="outline"
                    >
                        <FileDown className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-[10px] uppercase tracking-tight">Requisitantes (SAL)</span>
                    </Button>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-radar-gold transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por Pregão, UASG ou Órgão..."
                            className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 shadow-sm border rounded-xl text-sm w-full md:w-80 focus:ring-2 focus:ring-radar-gold/20 outline-none transition-all border-slate-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Lateral: Calendário e Controle */}
                <div className="lg:col-span-3 space-y-6">
                    <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/80 dark:bg-slate-800/50 pb-4 border-b">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <History className="w-4 h-4" /> Navegação
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={ptBR}
                                className="scale-105"
                                modifiers={{
                                    event: eventDays
                                }}
                                modifiersStyles={{
                                    event: {
                                        fontWeight: 'bold',
                                        color: '#B8860B',
                                        backgroundColor: 'rgba(184, 134, 11, 0.08)'
                                    }
                                }}
                            />
                        </CardContent>
                        {selectedDate && (
                            <div className="px-6 py-4 border-t bg-slate-50/50 flex justify-between items-center">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Filtro Ativo</span>
                                <button
                                    onClick={() => setSelectedDate(undefined)}
                                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold transition-colors uppercase"
                                >
                                    Limpar Exploração
                                </button>
                            </div>
                        )}
                    </Card>

                    <Card className="border-none shadow-md rounded-2xl bg-gradient-to-br from-radar-dark to-slate-900 text-radar-cream">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-radar-gold/60">Controle Operacional</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-slate-400 font-medium">TOTAL PENDENTES</span>
                                <span className="text-2xl font-black text-radar-gold">{overdueEvents.length + upcomingEvents.length}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-red-400 font-bold">VENCIDOS</span>
                                    <span className="text-xl font-bold">{overdueEvents.length}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-emerald-400 font-bold">PRÓXIMOS</span>
                                    <span className="text-xl font-bold">{upcomingEvents.length}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Conteúdo Principal com Animação */}
                <div className="lg:col-span-9 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {selectedDate ? (
                            <motion.div
                                key="appointments"
                                variants={blindVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="w-full flex flex-col gap-6"
                            >
                                <Card className="border-none shadow-xl rounded-3xl overflow-hidden min-h-[600px] bg-white border-t-4 border-t-radar-gold">
                                    <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between p-8">
                                        <div className="flex items-center gap-6">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setSelectedDate(undefined)}
                                                className="hover:bg-radar-gold/10 text-radar-gold transition-all"
                                            >
                                                <ArrowLeft className="w-6 h-6" />
                                            </Button>
                                            <div>
                                                <CardTitle className="text-2xl font-black text-slate-800">
                                                    Compromissos de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                                                </CardTitle>
                                                <CardDescription className="text-sm font-medium">
                                                    Detalhamento de todos os marcos registrados para este dia.
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="h-8 px-4 border-slate-200 bg-white font-black text-radar-dark">
                                            {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'Evento' : 'Eventos'}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        <div className="space-y-4 max-w-4xl mx-auto">
                                            {selectedDateEvents.length > 0 ? (
                                                selectedDateEvents.map(event => <EventItem key={event.id} event={event} />)
                                            ) : (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex flex-col items-center justify-center py-24 text-slate-400"
                                                >
                                                    <div className="p-6 bg-slate-50 rounded-full mb-6">
                                                        <CalendarIcon className="w-16 h-16 opacity-40" />
                                                    </div>
                                                    <p className="font-bold italic text-lg opacity-60">Nenhum marco agendado para esta data.</p>
                                                    <Button
                                                        variant="link"
                                                        className="mt-4 text-radar-gold font-bold"
                                                        onClick={() => setSelectedDate(undefined)}
                                                    >
                                                        Voltar para Visão Geral
                                                    </Button>
                                                </motion.div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="radar"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="grid gap-6 lg:grid-cols-2 h-full"
                            >
                                {/* Coluna: Vencidos */}
                                <Card className="border-none shadow-xl rounded-3xl overflow-hidden flex flex-col min-h-[700px] bg-red-50/10 border-t-2 border-red-200">
                                    <CardHeader className="border-b bg-white/50 p-6 flex flex-row items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-100 rounded-lg">
                                                <AlertCircle className="w-5 h-5 text-red-600" />
                                            </div>
                                            <CardTitle className="text-lg font-black text-red-800 uppercase tracking-tight">Prazos Vencidos</CardTitle>
                                        </div>
                                        <Badge className="bg-red-600 text-white hover:bg-red-700 font-bold">{overdueEvents.length}</Badge>
                                    </CardHeader>
                                    <CardContent className="p-6 overflow-y-auto flex-1 h-0 scrollbar-thin scrollbar-thumb-red-100">
                                        <div className="space-y-4">
                                            {overdueEvents.length > 0 ? (
                                                overdueEvents.map(event => <EventItem key={event.id} event={event} />)
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-32 text-slate-400 grayscale">
                                                    <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                                                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Tudo em dia!</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Coluna: Próximos */}
                                <Card className="border-none shadow-xl rounded-3xl overflow-hidden flex flex-col min-h-[700px] bg-emerald-50/10 border-t-2 border-emerald-200">
                                    <CardHeader className="border-b bg-white/50 p-6 flex flex-row items-center justify-between shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 rounded-lg">
                                                <Timer className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <CardTitle className="text-lg font-black text-emerald-800 uppercase tracking-tight">Próximos Prazos</CardTitle>
                                        </div>
                                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold">{upcomingEvents.length}</Badge>
                                    </CardHeader>
                                    <CardContent className="p-6 overflow-y-auto flex-1 h-0 scrollbar-thin scrollbar-thumb-emerald-100">
                                        <div className="space-y-4">
                                            {upcomingEvents.length > 0 ? (
                                                upcomingEvents.map(event => <EventItem key={event.id} event={event} />)
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-32 text-slate-400 grayscale">
                                                    <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                                                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Sem prazos próximos</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
