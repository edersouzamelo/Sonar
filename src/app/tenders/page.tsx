"use client";

import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    FileSpreadsheet,
    Printer,
    History,
    MonitorIcon,
    ArrowUpFromLine,
    ArrowDownToLine,
    Search,
    Eye,
    EyeOff,
    Download,
    Upload,
    CloudDownload,
    Save,
    Undo2,
    X,
    LocateFixed,
    Plus,
    Filter,
    Clock,
    FileText,
    Gavel,
    Trophy
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { useUser } from "@/contexts/user-context";
import { cn } from "@/lib/utils";
import { generateVisualReport } from "@/lib/report-utils";
import { exportTendersToCSV, parseCSVToTenders } from "@/lib/export-utils";
import React, { memo, useState, useEffect, useRef } from "react";
import { useTenders } from "@/contexts/tenders-context";
import { CreateTenderModal } from "@/components/create-tender-modal";
import { useSearchParams } from "next/navigation";
import { Tender } from "@/types";
import { TenderRow } from "@/components/tender-row";

export default function TendersPage() {
    const [showNotesColumn, setShowNotesColumn] = useState(false);
    const {
        tenders,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        nupFilter,
        setNupFilter,
        commitmentFilter,
        setCommitmentFilter,
        coordinatorFilter,
        setCoordinatorFilter,
        requesterSectorFilter,
        setRequesterSectorFilter,
        pregoeiroInternoFilter,
        setPregoeiroInternoFilter,
        pregoeiroExternoFilter,
        setPregoeiroExternoFilter,
        updateTender,
        refreshTender,
        showConferenceColumn,
        toggleConferenceColumn,
        conferenceStatuses,
        setConferenceStatus,
        bulkSetConferenceStatus,
        dateChecks,
        toggleDateCheck,
        deleteTender,
        addTenderBelow,
        undo,
        canUndo,
        historyCount,
        objectFilter,
        setObjectFilter,
        highlightId,
        setHighlightId,
        pregoeiros,
        forceCloudSync,
        pullDataFromCloud,
        importTendersFromCSV
    } = useTenders();

    const { role, user, hasPermission } = useUser();
    const editorName = user?.name || role || 'Usuário';

    const searchParams = useSearchParams();
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const isAdmin = role === 'Chefe da Seção de Licitações' || role === 'Administrador' || user?.email === 'edersouzamelo@gmail.com';
    const canManage = isAdmin || hasPermission('edit_tenders');
    const canEditDates = isAdmin || hasPermission('edit_dates');

    useEffect(() => {
        const urlHighlightId = searchParams.get('highlightId');
        if (urlHighlightId) setHighlightId(urlHighlightId);
    }, [searchParams, setHighlightId]);

    useEffect(() => {
        if (highlightId && tableContainerRef.current) {
            const element = document.getElementById(`tender-row-${highlightId}`);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightId]);

    const syncWithDatabase = async () => {
        if (confirm(`📊 Salvar ${tenders.length} pregões no servidor?`)) {
            await forceCloudSync();
            alert("✅ Dados salvos com sucesso!");
        }
    };

    const pullFromDatabase = async () => {
        if (confirm("🚨 SUBSTITUIR TUDO pelo que está na nuvem?")) {
            await pullDataFromCloud(true);
            alert("✅ Dados recuperados!");
            window.location.reload();
        }
    };

    const handleVisualReport = () => {
        generateVisualReport(filteredTenders, pregoeiros);
    };

    const filteredTenders = tenders.filter(tender => {
        const matchesSearch =
            tender.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tender.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tender.uasg.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || tender.status === statusFilter;
        const matchesNup = nupFilter === "" || (tender.nup && tender.nup.includes(nupFilter));
        const matchesObject = objectFilter === "" || (tender.description && tender.description.toLowerCase().includes(objectFilter.toLowerCase()));
        const matchesCommitment = commitmentFilter === "all" || tender.commitment === commitmentFilter;
        const matchesCoordinator = coordinatorFilter === "all" || tender.coordinator === coordinatorFilter;
        const matchesRequesterSector = requesterSectorFilter === "all" || tender.requesterSector === requesterSectorFilter;
        const matchesPregoeiroInterno = pregoeiroInternoFilter === "all"
            ? true
            : (pregoeiroInternoFilter === "none" ? !tender.pregoeiroFaseInternaId : tender.pregoeiroFaseInternaId === pregoeiroInternoFilter);
        const matchesPregoeiroExterno = pregoeiroExternoFilter === "all"
            ? true
            : (pregoeiroExternoFilter === "none" ? !tender.pregoeiroFaseExternaId : tender.pregoeiroFaseExternaId === pregoeiroExternoFilter);

        return matchesSearch && matchesStatus && matchesNup && matchesObject && matchesCommitment && matchesCoordinator && matchesRequesterSector && matchesPregoeiroInterno && matchesPregoeiroExterno;
    });

    return (
        <div className="flex flex-col flex-1 w-full gap-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground mr-4">Pregões em Monitoramento</h1>

                    {/* toolbar groups */}
                    <div className="flex items-center gap-1.5">
                        {canManage && <CreateTenderModal />}

                        <Button
                            onClick={undo}
                            variant="outline"
                            size="sm"
                            disabled={!canUndo}
                            className={cn(
                                "h-8 text-xs gap-1.5 border-slate-200 transition-all",
                                canUndo ? "text-blue-600 hover:bg-blue-50 border-blue-200" : "text-slate-400 opacity-50"
                            )}
                            title={canUndo ? `Desfazer última ação (${historyCount} disponível)` : "Nada para desfazer"}
                        >
                            <History className="w-3.5 h-3.5" />
                            Desfazer (Ctrl+Z)
                        </Button>

                        <div className="h-5 w-px bg-slate-200 mx-1" />

                        <Button
                            variant={showNotesColumn ? "secondary" : "outline"}
                            size="sm"
                            className={cn(
                                "h-8 text-xs gap-1.5 border-slate-200 transition-all",
                                showNotesColumn ? "bg-amber-50 text-amber-700 border-amber-200" : "text-slate-600 hover:bg-slate-50"
                            )}
                            onClick={() => setShowNotesColumn(!showNotesColumn)}
                        >
                            {showNotesColumn ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            Notas
                        </Button>

                        <Button
                            variant={showConferenceColumn ? "secondary" : "outline"}
                            size="sm"
                            className={cn(
                                "h-8 text-xs gap-1.5 border-slate-200 transition-all",
                                showConferenceColumn ? "bg-slate-100 text-slate-800 border-slate-300" : "text-slate-600 hover:bg-slate-50"
                            )}
                            onClick={toggleConferenceColumn}
                        >
                            {showConferenceColumn ? <MonitorIcon className="w-3.5 h-3.5" /> : <LayoutDashboard className="w-3.5 h-3.5" />}
                            Conferência
                        </Button>

                        <div className="h-5 w-px bg-slate-200 mx-1" />

                        <div className="flex items-center gap-1 bg-slate-50/50 p-0.5 rounded-lg border border-slate-100">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 text-slate-600 hover:text-blue-600 hover:bg-white"
                                onClick={() => exportTendersToCSV(tenders, editorName, dateChecks)}
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                Excel
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 text-slate-600 hover:text-amber-600 hover:bg-white"
                                onClick={handleVisualReport}
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Relatório Visual
                            </Button>
                        </div>

                        <div className="h-5 w-px bg-slate-200 mx-1" />

                        <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-blue-600 border-blue-100" onClick={pullFromDatabase}>
                                <ArrowDownToLine className="w-3.5 h-3.5" /> Baixar
                            </Button>
                            <Button size="sm" className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={syncWithDatabase}>
                                <ArrowUpFromLine className="w-3.5 h-3.5" /> Salvar Oficial
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {highlightId && (
                <div className="flex items-center justify-between p-3 bg-radar-gold/10 border border-radar-gold rounded-lg">
                    <div className="flex items-center gap-3">
                        <LocateFixed className="w-5 h-5 text-radar-gold" />
                        <div>
                            <p className="text-sm font-bold text-radar-dark">Visão de Foco Ativa</p>
                            <p className="text-xs text-slate-600">O item está destacado abaixo.</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setHighlightId(null)}>Limpar Destaque</Button>
                </div>
            )}

            <Card className="flex flex-col flex-1 border-none shadow-sm bg-radar-cream">
                <CardHeader className="shrink-0">
                    <CardTitle>Todos os Processos</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 relative">
                    <div ref={tableContainerRef} className="w-full bg-white">
                        <table className="w-full text-xs text-left text-gray-500 min-w-[2200px]">
                            <thead className="text-[10px] text-muted-foreground uppercase bg-white border-b sticky top-0 z-50">
                                <tr>
                                    <th className="px-3 py-2 text-center w-8">Nº</th>
                                    <th className="px-3 py-2">Atualização</th>
                                    {showConferenceColumn && <th className="px-3 py-2 text-center w-24">Conferência</th>}
                                    <th className="px-3 py-2 min-w-[200px]">
                                        <span>Pregão / UASG</span>
                                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Busca..." className="w-full border p-1 text-[9px] mt-1" />
                                    </th>
                                    <th className="px-3 py-2 min-w-[350px] max-w-[500px]">
                                        <span>Objeto</span>
                                        <input type="text" value={objectFilter} onChange={e => setObjectFilter(e.target.value)} placeholder="Filtro..." className="w-full border p-1 text-[9px] mt-1" />
                                    </th>
                                    {showNotesColumn && <th className="px-3 py-2 bg-amber-50">Anotações</th>}
                                    <th className="px-3 py-2">NUP</th>
                                    <th className="px-3 py-2">
                                        <div className="flex flex-col gap-1">
                                            <span>Compromisso</span>
                                            <Select value={commitmentFilter} onValueChange={setCommitmentFilter}>
                                                <SelectTrigger className="h-7 text-[9px] bg-white/50">
                                                    <SelectValue placeholder="Todos" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white">
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="GCALC">GCALC</SelectItem>
                                                    <SelectItem value="PCA da OM">PCA da OM</SelectItem>
                                                    <SelectItem value="Operação Perseu">Operação Perseu</SelectItem>
                                                    <SelectItem value="Outros">Outros</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </th>
                                    <th className="px-3 py-2">
                                        <div className="flex flex-col gap-1">
                                            <span>Coordenador</span>
                                            <Select value={coordinatorFilter} onValueChange={setCoordinatorFilter}>
                                                <SelectTrigger className="h-7 text-[9px] bg-white/50">
                                                    <SelectValue placeholder="Todos" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white">
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="CAF">CAF</SelectItem>
                                                    <SelectItem value="CCOL">CCOL</SelectItem>
                                                    <SelectItem value="9º B Sup">9º B Sup</SelectItem>
                                                    <SelectItem value="A definir">A definir</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </th>
                                    <th className="px-3 py-2">
                                        <div className="flex flex-col gap-1">
                                            <span>Requisitante</span>
                                            <Select value={requesterSectorFilter} onValueChange={setRequesterSectorFilter}>
                                                <SelectTrigger className="h-7 text-[9px] bg-white/50">
                                                    <SelectValue placeholder="Todos" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white">
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="9º B Mnt">9º B Mnt</SelectItem>
                                                    <SelectItem value="9º B Sup">9º B Sup</SelectItem>
                                                    <SelectItem value="18º B Trnp">18º B Trnp</SelectItem>
                                                    <SelectItem value="Cia Cmdo">Cia Cmdo</SelectItem>
                                                    <SelectItem value="9º B Sau">9º B Sau</SelectItem>
                                                    <SelectItem value="Cmdo 9º Gpt">Cmdo 9º Gpt</SelectItem>
                                                    <SelectItem value="A definir">A definir</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </th>
                                    <th className="px-3 py-2">Prazo SAL</th>
                                    <th className="px-3 py-2">Entrega SAL</th>
                                    <th className="px-3 py-2">Envio CJU</th>
                                    <th className="px-3 py-2">Regresso CJU</th>
                                    <th className="px-3 py-2">Ajustes Pub.</th>
                                    <th className="px-3 py-2">Publicação</th>
                                    <th className="px-3 py-2">Sessão Púb.</th>
                                    <th className="px-3 py-2">Prev. Homol.</th>
                                    <th className="px-3 py-2">Prazo Homol.</th>
                                    <th className="px-3 py-2">Assin. Atas</th>
                                    <th className="px-3 py-2">Vigência Ant.</th>
                                    <th className="px-3 py-2">Prazo GCALC</th>
                                    <th className="px-3 py-2 bg-radar-gold/5 min-w-[150px]">
                                        <div className="flex flex-col gap-1">
                                            <span>Pregoeiro (Int)</span>
                                            <Select value={pregoeiroInternoFilter} onValueChange={setPregoeiroInternoFilter}>
                                                <SelectTrigger className="h-7 text-[9px] bg-white/50">
                                                    <SelectValue placeholder="Todos" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white">
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="none">A definir</SelectItem>
                                                    {pregoeiros.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </th>
                                    <th className="px-3 py-2 bg-radar-gold/5 min-w-[150px]">
                                        <div className="flex flex-col gap-1">
                                            <span>Pregoeiro (Ext)</span>
                                            <Select value={pregoeiroExternoFilter} onValueChange={setPregoeiroExternoFilter}>
                                                <SelectTrigger className="h-7 text-[9px] bg-white/50">
                                                    <SelectValue placeholder="Todos" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white">
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="none">A definir</SelectItem>
                                                    {pregoeiros.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </th>
                                    <th className="px-3 py-2 bg-slate-50 border-l min-w-[300px]">Identificador (Objeto)</th>
                                    <th className="px-3 py-2 min-w-[200px]">
                                        <div className="flex flex-col gap-1">
                                            <span>Status</span>
                                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                <SelectTrigger className="h-7 text-[9px] bg-white/50">
                                                    <SelectValue placeholder="Todos" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white w-[260px]">
                                                    <SelectItem value="all">Todos</SelectItem>
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
                                        </div>
                                    </th>
                                    <th className="px-3 py-2">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTenders.map((tender, index) => (
                                    <TenderRow
                                        key={tender.id}
                                        tender={tender}
                                        index={index}
                                        role={role}
                                        editorName={editorName}
                                        updateTender={updateTender}
                                        refreshTender={refreshTender}
                                        showConferenceColumn={showConferenceColumn}
                                        conferenceStatuses={conferenceStatuses}
                                        setConferenceStatus={setConferenceStatus}
                                        dateChecks={dateChecks}
                                        toggleDateCheck={toggleDateCheck}
                                        deleteTender={deleteTender}
                                        addTenderBelow={addTenderBelow}
                                        isHighlighted={highlightId === tender.id}
                                        pregoeiros={pregoeiros}
                                        canManage={canManage}
                                        canEditDates={canEditDates}
                                        showNotesColumn={showNotesColumn}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
