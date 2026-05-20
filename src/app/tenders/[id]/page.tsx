"use client"

import Link from "next/link";
import { notFound } from "next/navigation";
import { useTenders } from "@/contexts/tenders-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditTenderModal } from "@/components/edit-tender-modal";
import { ObservationModal } from "@/components/observation-modal";
import { TenderFiles } from "@/components/tender-files";
import { TenderMiniChat } from "@/components/tender-mini-chat";
import { ArrowLeft, Calendar, DollarSign, Building2, AlertCircle, CheckCircle2, User, Users, ClipboardCheck, Info, Lightbulb, History, Zap, Pencil, Trash2, Check, X } from "lucide-react";
import { useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function TenderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { tenders, updateTender, dateChecks } = useTenders();
    const tender = tenders.find((t) => t.id === id);

    const [editingObsId, setEditingObsId] = useState<string | null>(null);
    const [editObsContent, setEditObsContent] = useState("");

    const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
    const [editHistoryContent, setEditHistoryContent] = useState("");

    if (!tender) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <h1 className="text-2xl font-bold">Pregão não encontrado</h1>
                <Link href="/tenders" className="text-blue-500 hover:underline">
                    Voltar para a lista
                </Link>
            </div>
        );
    }

    // Ordenar atualizações da mais recente para a mais antiga
    const sortedUpdates = [...(tender.updates || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const saveObservation = (obsId: string) => {
        if (!tender || editObsContent.trim() === "") return;
        const newObs = tender.observations?.map(obs => obs.id === obsId ? { ...obs, content: editObsContent } : obs) || [];
        updateTender(tender.id, { observations: newObs });
        setEditingObsId(null);
    };

    const deleteObservation = (obsId: string) => {
        if (!tender || !confirm("Excluir observação permanentemente?")) return;
        const newObs = tender.observations?.filter(obs => obs.id !== obsId) || [];
        updateTender(tender.id, { observations: newObs });
    };

    const saveHistory = (histId: string) => {
        if (!tender || editHistoryContent.trim() === "") return;
        const newUpdates = tender.updates?.map(up => up.id === histId ? { ...up, description: editHistoryContent } : up) || [];
        updateTender(tender.id, { updates: newUpdates });
        setEditingHistoryId(null);
    };

    const deleteHistory = (histId: string) => {
        if (!tender || !confirm("Excluir evento do histórico permanentemente?")) return;
        const newUpdates = tender.updates?.filter(up => up.id !== histId) || [];
        updateTender(tender.id, { updates: newUpdates });
    };

    const checks = tender ? (dateChecks[tender.id] || {}) : {};

    const timelineSteps = [
        {
            title: 'Protocolo Inicial do Setor Requisitante',
            dateLabel: 'Definido',
            dateValue: tender?.dates?.protocoloSetorRequisitante?.defined,
            extraLabel: 'Executado',
            extraValue: tender?.dates?.protocoloSetorRequisitante?.executed,
            checked: checks['protocoloSetorRequisitante.defined'] || !!tender?.dates?.protocoloSetorRequisitante?.executed
        },
        {
            title: 'Envio à CJU',
            dateLabel: 'Prazo',
            dateValue: tender?.dates?.cjuSendDeadline,
            checked: checks['cjuSendDeadline']
        },
        {
            title: 'Regresso da CJU',
            dateLabel: 'Data',
            dateValue: tender?.dates?.cjuReturnDate,
            checked: checks['cjuReturnDate']
        },
        {
            title: 'Ajustes para Publicação',
            dateLabel: 'Prazo',
            dateValue: tender?.dates?.publicationAdjustmentsDeadline,
            checked: checks['publicationAdjustmentsDeadline']
        },
        {
            title: 'Publicação',
            dateLabel: 'Data',
            dateValue: tender?.dates?.publicationDate,
            checked: checks['publicationDate']
        },
        {
            title: 'Sessão Pública / Abertura de Propostas',
            dateLabel: 'Data',
            dateValue: tender?.dates?.proposalOpeningDate,
            checked: checks['proposalOpeningDate']
        },
        {
            title: 'Previsão de Homologação',
            dateLabel: 'Previsão',
            dateValue: tender?.dates?.homologationForecast,
            checked: checks['homologationForecast']
        },
        {
            title: 'Prazo Homologação',
            dateLabel: 'Prazo Limite',
            dateValue: tender?.dates?.homologationDeadline,
            checked: checks['homologationDeadline']
        },
        {
            title: 'Assinatura das Atas',
            dateLabel: 'Prazo',
            dateValue: tender?.dates?.minutesSignatureDeadline,
            checked: checks['minutesSignatureDeadline']
        }
    ];

    return (
        <div className="space-y-6">
            {/* Cabeçalho e Navegação */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/tenders" className="p-2 hover:bg-muted rounded-full">
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            Pregão {tender.number}
                            <Badge variant={
                                tender.status === 'HOMOLOGADO' ? 'secondary' :
                                    tender.status.startsWith('CANCELADO') || tender.status === 'ABANDONADO' ? 'destructive' :
                                        'outline'
                            }>
                                {tender.status === 'HOMOLOGADO' ? 'Homologado' :
                                    tender.status.startsWith('CANCELADO') || tender.status === 'ABANDONADO' ? 'Encerrado' : 'Em Andamento'}
                            </Badge>
                            {tender.isGCALC && (
                                <Badge variant="warning" className="bg-radar-gold text-radar-dark">
                                    GCALC
                                </Badge>
                            )}
                        </h1>
                        <p className="text-sm text-muted-foreground">UASG: {tender.uasg} • {tender.department}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <EditTenderModal tender={tender} />
                    <ObservationModal tender={tender} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Coluna Principal: Arquivos, Detalhes e Linha do Tempo */}
                <div className="md:col-span-2 space-y-6">
                    {/* Componente de Arquivos Anexados */}
                    <TenderFiles tenderId={tender.id} />

                    {/* Linha do Tempo de Prazos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Linha do Tempo de Prazos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-l-2 border-muted ml-3 space-y-8 pb-4 mt-2">
                                {timelineSteps.map((step, index) => (
                                    <div key={index} className={`mb-8 ml-6 relative ${index === timelineSteps.length - 1 ? 'mb-0' : ''}`}>
                                        <span className={`absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${step.checked ? 'bg-green-500' : step.dateValue ? 'bg-amber-500' : 'bg-muted'}`}>
                                            {step.checked ? <CheckCircle2 className="h-4 w-4 text-white" /> : <div className="h-2 w-2 rounded-full bg-white" />}
                                        </span>
                                        <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                                        <div className="mt-2 text-sm text-muted-foreground grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="font-medium text-foreground">{step.dateLabel}:</span> <br />
                                                {step.dateValue ? new Date(step.dateValue).toLocaleDateString('pt-BR') : '-'}
                                            </div>
                                            {step.extraLabel && (
                                                <div>
                                                    <span className="font-medium text-foreground">{step.extraLabel}:</span> <br />
                                                    {step.extraValue ? new Date(step.extraValue).toLocaleDateString('pt-BR') : '-'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {(tender.dates?.vigenciaAnterior || tender.dates?.prazoGCALC) && (
                                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                                    {tender.dates?.vigenciaAnterior && (
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Vigência Pregão Anterior</p>
                                            <p className="text-sm font-bold">{new Date(tender.dates.vigenciaAnterior).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    )}
                                    {tender.dates?.prazoGCALC && (
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Prazo GCALC</p>
                                            <p className="text-sm font-bold text-radar-gold">{new Date(tender.dates.prazoGCALC).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Otimização e Intercorrências */}
                    {(tender.optimizationNotes || tender.intercurrences) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {tender.optimizationNotes && (
                                <Card className="border-radar-gold/30 bg-radar-gold/5">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Lightbulb className="h-4 w-4 text-radar-gold" />
                                            O que pode ser otimizado?
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">
                                            {tender.optimizationNotes}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                            {tender.intercurrences && (
                                <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
                                            <Zap className="h-4 w-4" />
                                            Intercorrências / Notas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap font-medium">
                                            {tender.intercurrences}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Observações */}
                    {tender.observations && tender.observations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Observações</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {tender.observations.map((obs) => (
                                        <div key={obs.id} className="border-l-4 border-radar-gold pl-4 py-2 group relative pr-16 bg-muted/10 hover:bg-muted/30 transition-colors rounded-r-lg">
                                            {editingObsId === obs.id ? (
                                                <div className="space-y-2 mt-1">
                                                    <Textarea
                                                        value={editObsContent}
                                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditObsContent(e.target.value)}
                                                        className="min-h-[80px]"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => saveObservation(obs.id)} className="h-8 shadow-sm">
                                                            <Check className="h-4 w-4 mr-1" /> Salvar
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => setEditingObsId(null)} className="h-8">
                                                            <X className="h-4 w-4 mr-1" /> Cancelar
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-foreground whitespace-pre-wrap">{obs.content}</p>
                                                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                                                        Por <span className="text-foreground">{obs.author}</span> em {new Date(obs.date).toLocaleDateString('pt-BR')}
                                                    </p>

                                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-radar-gold hover:bg-radar-gold/10" onClick={() => { setEditingObsId(obs.id); setEditObsContent(obs.content); }}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => deleteObservation(obs.id)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Histórico de Eventos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Eventos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-l border-border ml-3 space-y-8 pb-4">
                                {sortedUpdates.map((update) => (
                                    <div key={update.id} className="mb-8 ml-6 relative group">
                                        <span className={`absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background shadow-sm ${update.type === 'alert' ? 'bg-red-500' :
                                            update.type === 'warning' ? 'bg-amber-500' :
                                                update.type === 'success' ? 'bg-green-500' :
                                                    'bg-blue-500'
                                            }`}>
                                        </span>
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline relative pr-16 bg-muted/5 hover:bg-muted/30 p-2 -ml-2 rounded-lg transition-colors">

                                            {editingHistoryId === update.id ? (
                                                <div className="w-full space-y-2">
                                                    <Input
                                                        value={editHistoryContent}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditHistoryContent(e.target.value)}
                                                        className="font-semibold text-base"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => saveHistory(update.id)} className="h-8 shadow-sm">
                                                            <Check className="h-4 w-4 mr-1" /> Salvar
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => setEditingHistoryId(null)} className="h-8">
                                                            <X className="h-4 w-4 mr-1" /> Cancelar
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full">
                                                    <h3 className="text-base font-semibold text-foreground">{update.description}</h3>
                                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                        <time className="block text-xs font-medium text-muted-foreground">
                                                            {new Date(update.date).toLocaleDateString('pt-BR')} às {new Date(update.date).toLocaleTimeString('pt-BR').substring(0, 5)}
                                                        </time>
                                                        <span className="text-xs text-muted-foreground">•</span>
                                                        <span className="text-xs text-foreground font-medium bg-muted px-2 py-0.5 rounded-full">{update.author}</span>
                                                    </div>

                                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-radar-gold hover:bg-radar-gold/10" onClick={() => { setEditingHistoryId(update.id); setEditHistoryContent(update.description); }}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => deleteHistory(update.id)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Lateral: Metadados */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhes do Processo</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start">
                                <Building2 className="w-5 h-5 text-muted-foreground mr-3 mt-1" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Objeto</p>
                                    <p className="text-sm text-foreground">{tender.description}</p>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <Calendar className="w-5 h-5 text-muted-foreground mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Data de Abertura</p>
                                    <p className="text-sm text-foreground">
                                        {new Date(tender.openingDate).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <DollarSign className="w-5 h-5 text-muted-foreground mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Valor Estimado</p>
                                    <p className="text-sm text-foreground">
                                        {tender.estimatedValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <AlertCircle className={`w-5 h-5 mr-3 ${tender.hasIssues ? 'text-red-500' : 'text-muted-foreground'}`} />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Intercorrências</p>
                                    <p className={`text-sm ${tender.hasIssues ? 'text-red-600 font-bold' : 'text-foreground'}`}>
                                        {tender.hasIssues ? 'Sim - Requer Atenção' : 'Nenhuma pendente'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-radar-gold/50 shadow-md">
                        <CardHeader className="bg-radar-gold/10">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4" />
                                Gestão e Próximos Passos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex items-start">
                                <User className="w-5 h-5 text-muted-foreground mr-3 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Resp. Fase Interna</p>
                                    <p className="text-sm font-bold">{tender.responsibleInternal || "Não definido"}</p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <Users className="w-5 h-5 text-muted-foreground mr-3 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Pregoeiro / Fase Externa</p>
                                    <p className="text-sm font-bold text-radar-gold">{tender.responsibleExternal || "Não definido"}</p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <History className="w-5 h-5 text-muted-foreground mr-3 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Publicação em BI</p>
                                    <p className="text-sm font-bold">{tender.biPublication || "Aguardando"}</p>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-radar-dark text-radar-cream rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <Info className="h-4 w-4 text-radar-gold" />
                                    <p className="text-xs font-bold uppercase tracking-wider">Próxima Atividade</p>
                                </div>
                                <p className="text-sm font-medium">{tender.nextActivity || "Aguardando"}</p>
                                {tender.nextDeadline && (
                                    <div className="mt-2 text-xs border-t border-radar-gold/30 pt-1">
                                        Prazo Limite: <span className="text-radar-gold font-bold">{
                                            tender.nextDeadline.includes('-')
                                                ? new Date(tender.nextDeadline).toLocaleDateString('pt-BR')
                                                : tender.nextDeadline
                                        }</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Chat Contextual do Pregão */}
                    <TenderMiniChat tender={tender} />
                </div>
            </div>
        </div>
    );
}
