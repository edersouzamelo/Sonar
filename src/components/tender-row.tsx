"use client";

import React, { memo, useState, useEffect } from "react";
import Link from "next/link";
import {
    Eye,
    Plus,
    Trash2,
    RefreshCw,
    Check,
    Clock,
    FileText,
    Gavel,
    Trophy,
    Maximize2
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TenderRowProps {
    tender: any;
    index: number;
    role: string;
    editorName: string;
    updateTender: any;
    refreshTender: any;
    showConferenceColumn: boolean;
    conferenceStatuses: any;
    setConferenceStatus: any;
    dateChecks: Record<string, Record<string, boolean>>;
    toggleDateCheck: (tenderId: string, dateKey: string) => void;
    deleteTender: (id: string) => void;
    addTenderBelow: (id: string) => void;
    isHighlighted?: boolean;
    pregoeiros: any[];
    canManage: boolean;
    canEditDates: boolean;
    showNotesColumn: boolean;
}

export const TenderRow = memo(({
    tender,
    index,
    role,
    editorName,
    updateTender,
    refreshTender,
    showConferenceColumn,
    conferenceStatuses,
    setConferenceStatus,
    dateChecks,
    toggleDateCheck,
    deleteTender,
    addTenderBelow,
    isHighlighted,
    pregoeiros,
    canManage,
    canEditDates,
    showNotesColumn
}: TenderRowProps) => {
    // Estados locais para inputs para evitar re-renders globais ao digitar
    const [localNumber, setLocalNumber] = useState(tender.number ?? '');
    const [localUasg, setLocalUasg] = useState(tender.uasg ?? '');
    const [localDescription, setLocalDescription] = useState(tender.description ?? '');
    const [localNup, setLocalNup] = useState(tender.nup ?? '');
    const [localNote, setLocalNote] = useState(tender.quickNotes ?? '');

    // Sincronizar estados locais quando os dados externos mudarem
    useEffect(() => {
        setLocalNumber(tender.number ?? '');
        setLocalUasg(tender.uasg ?? '');
        setLocalDescription(tender.description ?? '');
        setLocalNup(tender.nup ?? '');
        setLocalNote(tender.quickNotes ?? '');
    }, [tender.number, tender.uasg, tender.description, tender.nup, tender.quickNotes]);

    const handleBlur = (field: string, value: string) => {
        if (tender[field] !== value) {
            updateTender(tender.id, { [field]: value }, editorName);
        }
    };

    // Helper para cor do Status
    const getStatusStyles = (status: string) => {
        if (status === 'PLANEJADO') return "bg-slate-100 text-slate-500 border-slate-200 uppercase";
        if (status.startsWith('CANCELADO')) return "bg-slate-100 text-slate-500 border-slate-200 italic opacity-70";
        if (status === 'FASE INTERNA NA OMDS' || status === 'FASE INTERNA NA SAL') return "bg-rose-50 text-rose-600 border-rose-200 font-bold";
        if (status === 'FASE INTERNA - IRP' || status === 'FASE INTERNA NA CJU' || status === 'FASE INTERNA - CORREÇÕES PARA PUBLICAÇÃO') return "bg-orange-50 text-orange-600 border-orange-200 font-bold";
        if (status.startsWith('FASE EXTERNA')) return "bg-amber-50 text-amber-600 border-amber-200 font-black";
        if (status === 'HOMOLOGADO') return "bg-emerald-100 text-emerald-700 border-emerald-200 font-black shadow-sm";
        return "bg-white";
    };

    const getCommitmentStyles = (value: string) => {
        switch (value) {
            case 'GCALC': return "bg-blue-900 text-white border-blue-900";
            case 'PCA da OM': return "bg-emerald-100 text-emerald-900 border-emerald-200";
            case 'Operação Perseu': return "bg-rose-100 text-rose-900 border-rose-200";
            default: return "bg-white border-radar-dark/20";
        }
    };

    const getCoordinatorStyles = (value: string) => {
        switch (value) {
            case 'CCOL': return "bg-[#556B2F] text-white border-[#556B2F]";
            case 'CAF': return "bg-[#8B4513] text-white border-[#8B4513]";
            case '9º B Sup': return "bg-amber-100 text-amber-900 border-amber-200";
            default: return "bg-white border-radar-dark/20";
        }
    };

    const getRequesterStyles = (value: string) => {
        switch (value) {
            case '9º B Mnt': return "bg-slate-700 text-slate-50 border-slate-700";
            case '9º B Sup': return "bg-amber-100 text-amber-900 border-amber-200";
            case '18º B Trnp': return "bg-orange-100 text-orange-900 border-orange-200";
            case 'Cia Cmdo': return "bg-white text-red-600 border-red-200";
            case '9º B Sau': return "bg-red-600 text-white border-red-600";
            case 'Cmdo 9º Gpt': return "bg-slate-200 text-slate-800 border-slate-300";
            default: return "bg-white border-radar-dark/20";
        }
    };

    const ProgressRaceTrack = ({ currentStatus }: { currentStatus: string }) => {
        const stages = [
            { id: 'planejado', label: 'Planejado', icon: Clock, color: 'text-slate-400', match: (s: string) => s === 'PLANEJADO' },
            { id: 'interna', label: 'Interna', icon: FileText, color: 'text-rose-500', match: (s: string) => s.includes('INTERNA') },
            { id: 'pub', label: 'Publicado', icon: FileText, color: 'text-amber-500', match: (s: string) => s.includes('EDITAL PUBLICADO') },
            { id: 'externa', label: 'Sessão', icon: Gavel, color: 'text-blue-500', match: (s: string) => s.includes('EXTERNA') && !s.includes('EDITAL') },
            { id: 'final', label: 'Homologado', icon: Trophy, color: 'text-emerald-500', match: (s: string) => s === 'HOMOLOGADO' }
        ];

        const isCancelled = currentStatus.startsWith('CANCELADO') || currentStatus === 'ABANDONADO';

        return (
            <div className="flex items-center gap-1.5">
                {stages.map((stage, i) => {
                    const isActive = stage.match(currentStatus);
                    const isPast = stages.findIndex(s => s.match(currentStatus)) > i;

                    return (
                        <div key={stage.id} className="flex items-center">
                            <div
                                className={cn(
                                    "p-1 rounded-full border transition-all duration-300",
                                    isCancelled ? "bg-slate-200 border-slate-500 text-slate-800 opacity-60" :
                                        isActive ? `bg-white shadow-md scale-110 border-current ring-2 ring-offset-1 ${stage.color}` :
                                            isPast ? `${stage.color} opacity-40 border-current bg-current/10` :
                                                "bg-slate-50 border-slate-200 text-slate-300 opacity-20"
                                )}
                                title={stage.label}
                            >
                                <stage.icon className="w-3 h-3" />
                            </div>
                            {i < stages.length - 1 && (
                                <div className={cn(
                                    "w-2 h-[1px]",
                                    isCancelled ? "bg-slate-300" :
                                        isPast ? "bg-current opacity-30" : "bg-slate-100"
                                )} />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const handleDateChange = (field: string, subField: string | null, value: string) => {
        if (subField) {
            updateTender(tender.id, {
                dates: {
                    ...tender.dates,
                    [field]: {
                        ...tender.dates?.[field],
                        [subField]: value
                    }
                }
            }, editorName);
        } else {
            updateTender(tender.id, {
                dates: {
                    ...tender.dates,
                    [field]: value
                }
            }, editorName);
        }
    };

    const getDateColor = (dateStr: string, isChecked: boolean, isCancelled: boolean) => {
        if (isCancelled) return "text-slate-400 font-normal";
        if (isChecked) return "text-slate-500 font-bold";
        if (!dateStr) return "";

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(dateStr);
        if (isNaN(targetDate.getTime())) return "";

        return targetDate < today
            ? "text-red-600 font-black"
            : "text-green-700 font-black";
    };

    const renderDateInput = (field: string, subField: string | null = null) => {
        const val = subField ? tender.dates?.[field]?.[subField] : tender.dates?.[field];
        const dateKey = subField ? `${field}.${subField}` : field;
        const isChecked = dateChecks[tender.id]?.[dateKey] || false;

        return (
            <div className="flex items-center gap-1 group relative">
                <input
                    type="date"
                    className={cn(
                        "bg-transparent border-none focus:ring-0 p-0 text-[11px] w-[100px] transition-colors font-bold",
                        getDateColor(val, isChecked, isCancelled)
                    )}
                    disabled={!canEditDates}
                    value={val || ''}
                    onChange={(e) => handleDateChange(field, subField, e.target.value)}
                />
                <button
                    disabled={!canEditDates}
                    onClick={() => toggleDateCheck(tender.id, dateKey)}
                    className={cn(
                        "p-0.5 rounded-full transition-all active:scale-95 flex-shrink-0",
                        isChecked
                            ? "bg-green-600 text-white shadow-md scale-110"
                            : "bg-slate-100 text-slate-400 hover:bg-slate-200 opacity-0 group-hover:opacity-100"
                    )}
                >
                    <Check className={cn("w-3 h-3", isChecked && "stroke-[3px]")} />
                </button>
            </div>
        );
    };

    const isCancelled = tender.status.startsWith('CANCELADO') || tender.status === 'ABANDONADO';

    return (
        <tr
            id={`tender-row-${tender.id}`}
            className={cn(
                "border-b bg-white group",
                isHighlighted && "bg-amber-50/50 ring-2 ring-radar-gold ring-inset",
                isCancelled && "line-through text-slate-400 bg-slate-50/30"
            )}
        >
            <td className="px-3 py-2 text-center font-medium text-muted-foreground w-8">
                {index + 1}
            </td>
            <td className="px-3 py-2 whitespace-nowrap bg-white">
                <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-foreground">
                            {tender.lastUpdatedAt ? new Date(tender.lastUpdatedAt).toLocaleDateString('pt-BR') : '---'}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{tender.lastUpdatedBy || ''}</span>
                    </div>
                    <button
                        onClick={() => refreshTender(tender.id, editorName)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                </div>
            </td>
            {showConferenceColumn && (
                <td className="px-3 py-2 text-center">
                    <button
                        disabled={!canEditDates}
                        onClick={() => setConferenceStatus(tender.id, conferenceStatuses[tender.id] === 'OK' ? 'Pendente' : 'OK')}
                        className={cn(
                            "px-2 py-1 rounded-full text-[9px] font-bold uppercase transition-all shadow-sm",
                            conferenceStatuses[tender.id] === 'OK'
                                ? "bg-green-600 text-white"
                                : "bg-slate-200 text-slate-600"
                        )}
                    >
                        {conferenceStatuses[tender.id] === 'OK' ? 'OK' : 'Pendente'}
                    </button>
                </td>
            )}
            <td className="px-3 py-2 font-medium whitespace-nowrap">
                <div className="flex flex-col">
                    <input
                        type="text"
                        className="bg-transparent border-none p-0 text-[11px] font-bold w-[100px]"
                        value={localNumber}
                        disabled={!canManage}
                        onChange={(e) => setLocalNumber(e.target.value)}
                        onBlur={(e) => handleBlur('number', e.target.value)}
                    />
                    <div className="flex items-center text-[9px] text-muted-foreground">
                        <span className="mr-1">UASG</span>
                        <input
                            type="text"
                            className="bg-transparent border-none p-0 w-[50px]"
                            value={localUasg}
                            disabled={!canManage}
                            onChange={(e) => setLocalUasg(e.target.value)}
                            onBlur={(e) => handleBlur('uasg', e.target.value)}
                        />
                    </div>
                </div>
            </td>
            <td className="px-3 py-2 min-w-[350px] max-w-[500px]">
                <textarea
                    className="bg-transparent border-none p-0 text-[11px] font-bold w-full resize-none overflow-hidden"
                    value={localDescription}
                    disabled={!canManage}
                    rows={1}
                    onChange={(e) => {
                        setLocalDescription(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onBlur={(e) => handleBlur('description', e.target.value)}
                />
            </td>
            {showNotesColumn && (
                <td className="px-3 py-2 min-w-[250px] bg-amber-50/30 group/note relative">
                    <div className="flex flex-col gap-1">
                        <textarea
                            className="w-full p-1 text-[10px] bg-transparent border-none resize-none"
                            value={localNote}
                            disabled={!canManage}
                            placeholder="Notas..."
                            onChange={(e) => setLocalNote(e.target.value)}
                            onBlur={() => handleBlur('quickNotes', localNote)}
                        />
                        <Dialog>
                            <DialogTrigger asChild>
                                <button className="absolute top-1 right-1 p-1 bg-amber-100 text-amber-700 rounded opacity-0 group-hover/note:opacity-100 transition-opacity" title="Expandir anotação">
                                    <Maximize2 className="w-3 h-3" />
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] bg-amber-50 border-amber-200">
                                <DialogHeader>
                                    <DialogTitle className="text-amber-900 flex items-center gap-2">
                                        <Maximize2 className="w-5 h-5" />
                                        Anotações da Licitação: {tender.number}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="p-4 bg-white rounded-lg border border-amber-100 shadow-inner mt-4">
                                    <textarea
                                        className="w-full min-h-[300px] text-lg font-medium text-slate-900 border-none focus:ring-0 leading-relaxed resize-none"
                                        value={localNote}
                                        onChange={(e) => setLocalNote(e.target.value)}
                                        onBlur={() => handleBlur('quickNotes', localNote)}
                                        placeholder="Digite as notas aqui com clareza para a reunião..."
                                    />
                                </div>
                                <div className="text-xs text-amber-600 italic">
                                    Dica: Use esta visualização durante reuniões para leitura facilitada.
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </td>
            )}
            <td className="px-3 py-2">
                <input
                    type="text"
                    className="bg-transparent border-none p-0 text-[11px] w-[120px]"
                    value={localNup}
                    disabled={!canManage}
                    onChange={(e) => setLocalNup(e.target.value)}
                    onBlur={(e) => handleBlur('nup', e.target.value)}
                />
            </td>
            <td className="px-3 py-2">
                <Select
                    disabled={!canManage}
                    value={tender.commitment || 'Outros'}
                    onValueChange={(value) => updateTender(tender.id, { commitment: value as any }, editorName)}
                >
                    <SelectTrigger className={cn("w-[120px] h-7 text-[10px] font-bold", getCommitmentStyles(tender.commitment || ''))}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="GCALC">GCALC</SelectItem>
                        <SelectItem value="PCA da OM">PCA da OM</SelectItem>
                        <SelectItem value="Operação Perseu">Operação Perseu</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                </Select>
            </td>
            <td className="px-3 py-2">
                <Select
                    disabled={!canManage}
                    value={tender.coordinator || 'A definir'}
                    onValueChange={(value) => updateTender(tender.id, { coordinator: value as any }, editorName)}
                >
                    <SelectTrigger className={cn("w-[120px] h-7 text-[10px] font-bold", getCoordinatorStyles(tender.coordinator || ''))}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="CAF">CAF</SelectItem>
                        <SelectItem value="CCOL">CCOL</SelectItem>
                        <SelectItem value="9º B Sup">9º B Sup</SelectItem>
                        <SelectItem value="A definir">A definir</SelectItem>
                    </SelectContent>
                </Select>
            </td>
            <td className="px-3 py-2">
                <Select
                    disabled={!canManage}
                    value={tender.requesterSector || 'A definir'}
                    onValueChange={(value) => updateTender(tender.id, { requesterSector: value as any }, editorName)}
                >
                    <SelectTrigger className={cn("w-[120px] h-7 text-[10px] font-bold", getRequesterStyles(tender.requesterSector || ''))}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="9º B Mnt">9º B Mnt</SelectItem>
                        <SelectItem value="9º B Sup">9º B Sup</SelectItem>
                        <SelectItem value="18º B Trnp">18º B Trnp</SelectItem>
                        <SelectItem value="Cia Cmdo">Cia Cmdo</SelectItem>
                        <SelectItem value="9º B Sau">9º B Sau</SelectItem>
                        <SelectItem value="Cmdo 9º Gpt">Cmdo 9º Gpt</SelectItem>
                        <SelectItem value="A definir">A definir</SelectItem>
                    </SelectContent>
                </Select>
            </td>
            <td className="px-3 py-2">{renderDateInput('protocoloSetorRequisitante', 'defined')}</td>
            <td className="px-3 py-2">{renderDateInput('protocoloSetorRequisitante', 'executed')}</td>
            <td className="px-3 py-2">{renderDateInput('cjuSendDeadline')}</td>
            <td className="px-3 py-2">{renderDateInput('cjuReturnDate')}</td>
            <td className="px-3 py-2">{renderDateInput('publicationAdjustmentsDeadline')}</td>
            <td className="px-3 py-2">{renderDateInput('publicationDate')}</td>
            <td className="px-3 py-2">{renderDateInput('proposalOpeningDate')}</td>
            <td className="px-3 py-2">{renderDateInput('homologationForecast')}</td>
            <td className="px-3 py-2">{renderDateInput('homologationDeadline')}</td>
            <td className="px-3 py-2">{renderDateInput('minutesSignatureDeadline')}</td>
            <td className="px-3 py-2">{renderDateInput('vigenciaAnterior')}</td>
            <td className="px-3 py-2">{renderDateInput('prazoGCALC')}</td>
            <td className="px-3 py-2">
                <Select
                    disabled={!canManage}
                    value={tender.pregoeiroFaseInternaId || 'none'}
                    onValueChange={(value) => updateTender(tender.id, { pregoeiroFaseInternaId: value === 'none' ? undefined : value }, editorName)}
                >
                    <SelectTrigger className="w-[130px] h-7 text-[10px] bg-white border-radar-dark/20 font-bold">
                        <SelectValue placeholder="A definir" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="none">A definir</SelectItem>
                        {pregoeiros.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </td>
            <td className="px-3 py-2">
                <Select
                    disabled={!canManage}
                    value={tender.pregoeiroFaseExternaId || 'none'}
                    onValueChange={(value) => updateTender(tender.id, { pregoeiroFaseExternaId: value === 'none' ? undefined : value }, editorName)}
                >
                    <SelectTrigger className="w-[130px] h-7 text-[10px] bg-white border-radar-dark/20 font-bold">
                        <SelectValue placeholder="A definir" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="none">A definir</SelectItem>
                        {pregoeiros.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </td>
            <td className="px-3 py-2 bg-slate-50 border-l text-[10px] font-medium text-slate-600">
                <span className="opacity-50 mr-1">#{index + 1}</span>
                {tender.description}
            </td>
            <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                    <Select
                        disabled={!canManage}
                        value={tender.status}
                        onValueChange={(value) => updateTender(tender.id, { status: value as any }, editorName)}
                    >
                        <SelectTrigger className={cn(
                            "w-[200px] h-7 text-[9px] border transition-all shadow-sm text-left justify-start px-2 py-1 rounded font-bold",
                            getStatusStyles(tender.status)
                        )}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white z-[9999]">
                            <SelectItem value="PLANEJADO">PLANEJADO</SelectItem>
                            <SelectItem value="CANCELADO POR ABANDONO">CANCELADO POR ABANDONO</SelectItem>
                            <SelectItem value="CANCELADO POR REVOGAÇÃO">CANCELADO POR REVOGAÇÃO</SelectItem>
                            <SelectItem value="CANCELADO POR DUPLICIDADE DE OBJETO">CANCELADO POR DUPLICIDADE DE OBJETO</SelectItem>
                            <SelectItem value="FASE INTERNA NA OMDS">FASE INTERNA NA OMDS</SelectItem>
                            <SelectItem value="FASE INTERNA NA SAL">FASE INTERNA NA SAL</SelectItem>
                            <SelectItem value="FASE INTERNA - IRP">FASE INTERNA - IRP</SelectItem>
                            <SelectItem value="FASE INTERNA NA CJU">FASE INTERNA NA CJU</SelectItem>
                            <SelectItem value="FASE INTERNA - CORREÇÕES PARA PUBLICAÇÃO">FASE INTERNA - CORREÇÕES PARA PUBLICAÇÃO</SelectItem>
                            <SelectItem value="FASE EXTERNA - EDITAL PUBLICADO">FASE EXTERNA - EDITAL PUBLICADO</SelectItem>
                            <SelectItem value="FASE EXTERNA - ABERTURA E JULGAMENTO DAS PROPOSTAS">FASE EXTERNA - ABERTURA E JULGAMENTO DAS PROPOSTAS</SelectItem>
                            <SelectItem value="FASE EXTERNA - LANCES">FASE EXTERNA - LANCES</SelectItem>
                            <SelectItem value="FASE EXTERNA - RECURSOS E JULGAMENTO DE ADMISSIBILIDADE">FASE EXTERNA - RECURSOS E JULGAMENTO DE ADMISSIBILIDADE</SelectItem>
                            <SelectItem value="FASE EXTERNA - PARCIALMENTE HOMOLOGADO">FASE EXTERNA - PARCIALMENTE HOMOLOGADO</SelectItem>
                            <SelectItem value="HOMOLOGADO">HOMOLOGADO</SelectItem>
                        </SelectContent>
                    </Select>
                    <ProgressRaceTrack currentStatus={tender.status} />
                </div>
            </td>
            <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                    <Link href={`/tenders/${tender.id}`} className="text-blue-600">
                        <Eye className="w-4 h-4" />
                    </Link>
                    {canManage && (
                        <>
                            <button onClick={() => addTenderBelow(tender.id)} className="text-green-600">
                                <Plus className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteTender(tender.id)} className="text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
});

TenderRow.displayName = "TenderRow";
