"use client"

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { Tender, Person, Pregoeiro, Supervisor, UserRole } from '@/types';
import { tenders as initialTenders } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useUser } from './user-context';

interface TendersContextType {
    tenders: Tender[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    statusFilter: string;
    setStatusFilter: (filter: string) => void;
    nupFilter: string;
    setNupFilter: (filter: string) => void;
    commitmentFilter: string;
    setCommitmentFilter: (filter: string) => void;
    coordinatorFilter: string;
    setCoordinatorFilter: (filter: string) => void;
    requesterSectorFilter: string;
    setRequesterSectorFilter: (filter: string) => void;
    pregoeiroInternoFilter: string;
    setPregoeiroInternoFilter: (filter: string) => void;
    pregoeiroExternoFilter: string;
    setPregoeiroExternoFilter: (filter: string) => void;
    objectFilter: string;
    setObjectFilter: (filter: string) => void;
    updateTender: (id: string, updates: Partial<Tender>, editorName?: string) => void;
    refreshTender: (id: string, editorName?: string) => void;
    showConferenceColumn: boolean;
    toggleConferenceColumn: () => void;
    conferenceStatuses: Record<string, 'OK' | 'Pendente'>;
    setConferenceStatus: (id: string, status: 'OK' | 'Pendente') => void;
    bulkSetConferenceStatus: (status: 'OK' | 'Pendente') => void;
    dateChecks: Record<string, Record<string, boolean>>;
    toggleDateCheck: (tenderId: string, dateKey: string) => void;
    deleteTender: (id: string) => void;
    addTenderBelow: (id: string) => void;
    undo: () => void;
    canUndo: boolean;
    historyCount: number;
    resetToOriginalData: () => void;
    people: Person[];
    addPerson: (person: Omit<Person, 'id'>) => void;
    updatePerson: (id: string, updates: Partial<Person>) => void;
    deletePerson: (id: string) => void;
    pregoeiros: Pregoeiro[];
    addPregoeiro: (pregoeiro: Omit<Pregoeiro, 'id'>) => void;
    updatePregoeiro: (id: string, updates: Partial<Pregoeiro>) => void;
    deletePregoeiro: (id: string) => void;
    assignTenderToPregoeiro: (tenderId: string, pregoeiroId: string, phase: 'interna' | 'externa') => void;
    supervisors: Supervisor[];
    addSupervisor: (supervisor: Omit<Supervisor, 'id'>) => void;
    updateSupervisor: (id: string, updates: Partial<Supervisor>) => void;
    deleteSupervisor: (id: string) => void;
    highlightId: string | null;
    setHighlightId: (id: string | null) => void;
    cloudStatus: {
        isConnected: boolean;
        lastSync: Date | null;
        totalRecords: number;
        totalTenders: number;
        totalDates: number;
        totalPeople: number;
        status: 'online' | 'offline' | 'syncing' | 'error';
        message?: string;
    };
    forceCloudSync: () => Promise<void>;
    pullDataFromCloud: (skipGoldCheck?: boolean) => Promise<void>;
    importTendersFromCSV: (tenders: Partial<Tender>[]) => void;
}

const TendersContext = createContext<TendersContextType | undefined>(undefined);

export function TendersProvider({ children }: { children: ReactNode }) {
    const [tenders, setTenders] = useState<Tender[]>(initialTenders);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [nupFilter, setNupFilter] = useState("");
    const [commitmentFilter, setCommitmentFilter] = useState("all");
    const [coordinatorFilter, setCoordinatorFilter] = useState("all");
    const [requesterSectorFilter, setRequesterSectorFilter] = useState("all");
    const [pregoeiroInternoFilter, setPregoeiroInternoFilter] = useState("all");
    const [pregoeiroExternoFilter, setPregoeiroExternoFilter] = useState("all");
    const [objectFilter, setObjectFilter] = useState("");
    const [highlightId, setHighlightId] = useState<string | null>(null);

    const [showConferenceColumn, setShowConferenceColumn] = useState(true);
    const [conferenceStatuses, setConferenceStatuses] = useState<Record<string, 'OK' | 'Pendente'>>({});
    const [dateChecks, setDateChecks] = useState<Record<string, Record<string, boolean>>>({});
    const [history, setHistory] = useState<Array<{
        tenders: Tender[],
        conferenceStatuses: Record<string, 'OK' | 'Pendente'>,
        dateChecks: Record<string, Record<string, boolean>>
    }>>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // --- UNIFIED TEAM STATE ---
    const [people, setPeople] = useState<Person[]>([]);
    const [pregoeiros, setPregoeiros] = useState<Pregoeiro[]>([]);
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);

    const [cloudStatus, setCloudStatus] = useState<TendersContextType['cloudStatus']>({
        isConnected: false,
        lastSync: null,
        totalRecords: 0,
        totalTenders: 0,
        totalDates: 0,
        totalPeople: 0,
        status: 'offline'
    });

    const isCloudLoaded = useRef(false);
    const hasUserInteracted = useRef(false);
    const autoSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadDataFromCloud = useCallback(async (skipGoldCheck: boolean = false) => {
        if (!supabase) return;
        setCloudStatus(prev => ({ ...prev, status: 'syncing' }));
        console.log("[Radar] Buscando dados da nuvem para unificação...");
        try {
            // 1. Carregar Equipe (Fonte única de verdade)
            const { data: cloudTeam, error: teamError } = await supabase
                .from('team_members')
                .select('*')
                .order('name', { ascending: true });

            if (teamError) throw teamError;

            if (cloudTeam) {
                const cloudP = cloudTeam.filter(m => m.type === 'pregoeiro').map(m => ({ id: m.id, name: m.name, email: m.email, whatsapp: m.whatsapp, role: m.role, om: m.om, permissions: m.permissions }));
                const cloudS = cloudTeam.filter(m => m.type === 'supervisor').map(m => ({ id: m.id, name: m.name, email: m.email, whatsapp: m.whatsapp, role: m.role, organization: m.om, permissions: m.permissions }));
                const cloudR = cloudTeam.filter(m => m.type === 'requisitante').map(m => ({ id: m.id, name: m.name, email: m.email, whatsapp: m.whatsapp, role: m.role, sector: m.om, permissions: m.permissions }));

                setPregoeiros(cloudP);
                setSupervisors(cloudS);
                setPeople(cloudR);
                console.log(`[Radar] Equipe unificada: ${cloudTeam.length} membros carregados.`);
            }

            // 2. Licitações
            const { data: cloudTenders, error: tendersError } = await supabase.from('tenders').select('*');
            if (tendersError) throw tendersError;

            if (cloudTenders && cloudTenders.length > 0) {
                const mappedTenders: Tender[] = cloudTenders.map(t => ({
                    id: t.id, uasg: t.uasg, number: t.number, nup: t.nup, description: t.description, department: t.department,
                    openingDate: t.opening_date, estimatedValue: t.estimated_value, status: t.status, currentStage: t.current_stage,
                    hasIssues: t.has_issues, isGCALC: t.is_gcalc, commitment: t.commitment, requesterSector: t.requester_sector,
                    coordinator: t.coordinator, coord: t.coord, section: t.section, responsibleInternal: t.responsible_internal,
                    responsibleExternal: t.responsible_external, biPublication: t.bi_publication, optimization_notes: t.optimization_notes,
                    nextDeadline: t.next_deadline, nextActivity: t.next_activity, intercurrences: t.intercurrences,
                    lastUpdatedBy: t.last_updated_by, lastUpdatedAt: t.updated_at, verificationStatus: t.verification_status,
                    assignedPregoeiroId: t.assigned_pregoeiro_id, pregoeiroFaseInternaId: t.pregoeiro_fase_interna_id,
                    pregoeiroFaseExternaId: t.pregoeiro_fase_externa_id, quickNotes: t.quick_notes,
                    dates: t.dates || {}, updates: t.updates || [], observations: t.observations || []
                } as Tender));

                const sortedTenders = [...mappedTenders].sort((a, b) => {
                    const getNum = (id: string) => {
                        const m = id.match(/row-(\d+)/);
                        return m ? parseInt(m[1], 10) : 999999;
                    };
                    return getNum(a.id) - getNum(b.id);
                });

                // 3. Status de Conferência e Checks
                const newConfStatuses: Record<string, 'OK' | 'Pendente'> = {};
                const newDateChecks: Record<string, Record<string, boolean>> = {};

                cloudTenders.forEach(t => {
                    newConfStatuses[t.id] = (t.verification_status as 'OK' | 'Pendente') || 'Pendente';
                    newDateChecks[t.id] = t.dates?._date_checks || {};
                });

                setTenders(sortedTenders);
                setConferenceStatuses(newConfStatuses);
                setDateChecks(newDateChecks);

                isCloudLoaded.current = true;
                setCloudStatus({
                    isConnected: true, status: 'online', lastSync: new Date(),
                    totalTenders: sortedTenders.length,
                    totalDates: Object.values(newDateChecks).reduce((acc, curr) => acc + Object.keys(curr).length, 0),
                    totalPeople: cloudTeam?.length || 0,
                    totalRecords: sortedTenders.length + (cloudTeam?.length || 0)
                });
            }
        } catch (err: any) {
            console.error("[Radar] Erro fatal na carga unificada:", err.message);
            setCloudStatus(prev => ({ ...prev, status: 'error', isConnected: false, message: err.message }));
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        async function init() {
            if (supabase) await loadDataFromCloud(true);
            if (isMounted) setIsLoaded(true);
        }
        init();
        return () => { isMounted = false; };
    }, [loadDataFromCloud]);

    // --- DATA SYNC LOGIC (PUSH) ---
    const pushDataToCloud = useCallback(async () => {
        if (!supabase) return;
        setCloudStatus(prev => ({ ...prev, status: 'syncing' }));
        try {
            // 1. Salvar Equipe
            const teamToUpload = [
                ...pregoeiros.map(p => ({ id: p.id, name: p.name, email: p.email, whatsapp: p.whatsapp, role: p.role, type: 'pregoeiro', om: (p as any).om || "" })),
                ...supervisors.map(s => ({ id: s.id, name: s.name, email: s.email, whatsapp: s.whatsapp, role: s.role, type: 'supervisor', om: s.organization || "" })),
                ...people.map(p => ({ id: p.id, name: p.name, email: p.email, whatsapp: p.whatsapp, role: p.role, type: 'requisitante', om: p.sector || "" }))
            ];
            if (teamToUpload.length > 0) {
                await supabase.from('team_members').upsert(teamToUpload);
            }

            // 2. Salvar Licitações (Protegendo IDs e metadados)
            const tendersToUpload = tenders.map(t => ({
                id: t.id, uasg: t.uasg, number: t.number, nup: t.nup, description: t.description, department: t.department,
                opening_date: t.openingDate, estimated_value: t.estimatedValue, status: t.status, current_stage: t.currentStage,
                has_issues: t.hasIssues, is_gcalc: t.isGCALC, commitment: t.commitment, requester_sector: t.requesterSector,
                coordinator: t.coordinator, coord: t.coord, section: t.section, responsible_internal: t.responsibleInternal,
                responsible_external: t.responsibleExternal, bi_publication: t.biPublication, optimization_notes: t.optimizationNotes,
                next_deadline: t.nextDeadline, next_activity: t.nextActivity, intercurrences: t.intercurrences,
                last_updated_by: t.lastUpdatedBy, quick_notes: t.quickNotes,
                verification_status: conferenceStatuses[t.id] || 'Pendente',
                assigned_pregoeiro_id: t.assignedPregoeiroId || null,
                pregoeiro_fase_interna_id: t.pregoeiroFaseInternaId || null,
                pregoeiro_fase_externa_id: t.pregoeiroFaseExternaId || null,
                dates: { ...(t.dates || {}), _date_checks: dateChecks[t.id] || {} },
                updates: t.updates || [], observations: t.observations || []
            }));

            await supabase.from('tenders').upsert(tendersToUpload, { onConflict: 'id' });

            setCloudStatus(prev => ({
                ...prev,
                lastSync: new Date(),
                status: 'online',
                totalTenders: tenders.length,
                totalPeople: pregoeiros.length + supervisors.length + people.length
            }));
        } catch (err: any) {
            console.error('[Sync] ❌ Falha catastrófica:', err.message);
            setCloudStatus(prev => ({ ...prev, status: 'error', message: err.message }));
            throw err;
        }
    }, [tenders, conferenceStatuses, dateChecks, pregoeiros, supervisors, people]);

    // SINCRONIA UNIFICADA (AUTO-SAVE)
    useEffect(() => {
        if (!isLoaded || !supabase || !hasUserInteracted.current || !isCloudLoaded.current) return;

        if (autoSyncTimeoutRef.current) clearTimeout(autoSyncTimeoutRef.current);
        autoSyncTimeoutRef.current = setTimeout(async () => {
            await pushDataToCloud();
        }, 3000);

        return () => { if (autoSyncTimeoutRef.current) clearTimeout(autoSyncTimeoutRef.current); };
    }, [pushDataToCloud, isLoaded]);

    // --- HISTORY HELPERS ---
    const saveToHistory = useCallback(() => {
        setHistory(prev => {
            const newState = {
                tenders: [...tenders.map(t => ({ ...t }))], // Shallow copy mais eficiente que JSON.parse(JSON.stringify)
                conferenceStatuses: { ...conferenceStatuses },
                dateChecks: { ...dateChecks } // DateChecks já é um objeto simples
            };
            return [newState, ...prev].slice(0, 50);
        });
    }, [tenders, conferenceStatuses, dateChecks]);

    const undo = useCallback(() => {
        if (history.length === 0) return;

        const [lastState, ...remainingHistory] = history;

        hasUserInteracted.current = true;
        setTenders(lastState.tenders);
        setConferenceStatuses(lastState.conferenceStatuses);
        setDateChecks(lastState.dateChecks);
        setHistory(remainingHistory);
    }, [history]);

    const updateTender = useCallback((id: string, updates: Partial<Tender>, editorName?: string) => {
        saveToHistory();
        hasUserInteracted.current = true;
        setTenders(prev => prev.map(t => t.id === id ? { ...t, ...updates, lastUpdatedAt: new Date().toISOString(), lastUpdatedBy: editorName || t.lastUpdatedBy } : t));
    }, [saveToHistory]);

    const setConferenceStatus = useCallback((id: string, status: 'OK' | 'Pendente') => {
        saveToHistory();
        hasUserInteracted.current = true;
        setConferenceStatuses(prev => ({ ...prev, [id]: status }));
    }, [saveToHistory]);

    const bulkSetConferenceStatus = useCallback((status: 'OK' | 'Pendente') => {
        saveToHistory();
        hasUserInteracted.current = true;
        const next: Record<string, 'OK' | 'Pendente'> = {};
        tenders.forEach(t => next[t.id] = status);
        setConferenceStatuses(next);
    }, [tenders, saveToHistory]);

    const toggleConferenceColumn = useCallback(() => setShowConferenceColumn(prev => !prev), []);

    const deleteTender = useCallback(async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este pregão permanentemente?")) {
            saveToHistory();
            hasUserInteracted.current = true;

            // 1. Remover do estado local
            setTenders(prev => prev.filter(t => t.id !== id));

            // 2. Remover do banco de dados (Supabase)
            if (supabase) {
                try {
                    const { error } = await supabase.from('tenders').delete().eq('id', id);
                    if (error) throw error;
                    console.log(`[Radar] Pregão ${id} excluído com sucesso do banco.`);
                } catch (err: any) {
                    console.error("[Radar] Erro ao excluir do banco:", err.message);
                    alert("Erro ao excluir do servidor. Mas a linha foi removida da sua tela.");
                }
            }
        }
    }, [saveToHistory]);

    const resetToOriginalData = useCallback(() => {
        if (confirm("Isso irá resetar os dados para o estado inicial do arquivo data.ts. Continuar?")) {
            saveToHistory();
            hasUserInteracted.current = true;
            setTenders(initialTenders);
        }
    }, [saveToHistory]);

    const toggleDateCheck = useCallback((tenderId: string, dateKey: string) => {
        saveToHistory();
        hasUserInteracted.current = true;
        setDateChecks(prev => ({ ...prev, [tenderId]: { ...(prev[tenderId] || {}), [dateKey]: !(prev[tenderId]?.[dateKey]) } }));
    }, [saveToHistory]);

    const addTenderBelow = useCallback((id: string) => {
        saveToHistory();
        hasUserInteracted.current = true;
        setTenders(prev => {
            const idx = prev.findIndex(t => t.id === id);
            if (idx === -1) return prev;
            const nt: Tender = { id: `tender-manual-${Date.now()}`, uasg: "160136", number: "A definir", description: "Nova Licitação", department: "18º B Trnp", openingDate: new Date().toISOString(), status: "FASE INTERNA NA OMDS", currentStage: "1. Entrada do TR na SAL", hasIssues: false, isGCALC: false, coord: "CAF", coordinator: "CAF", nup: "", dates: {}, updates: [], observations: [] };
            const list = [...prev];
            list.splice(idx + 1, 0, nt);
            return list;
        });
    }, [saveToHistory]);

    // GESTÃO DE EQUIPE UNIFICADA
    const addPerson = useCallback((d: Omit<Person, 'id'>) => { hasUserInteracted.current = true; setPeople(prev => [...prev, { ...d, id: `person-${Date.now()}` }]); }, []);
    const updatePerson = useCallback((id: string, u: Partial<Person>) => { hasUserInteracted.current = true; setPeople(prev => prev.map(p => p.id === id ? { ...p, ...u } : p)); }, []);
    const deletePerson = useCallback((id: string) => { if (confirm("Remover da equipe?")) { hasUserInteracted.current = true; setPeople(prev => prev.filter(p => p.id !== id)); } }, []);

    const addPregoeiro = useCallback((d: Omit<Pregoeiro, 'id'>) => { hasUserInteracted.current = true; setPregoeiros(prev => [...prev, { ...d, id: `pregoeiro-${Date.now()}` }]); }, []);
    const updatePregoeiro = useCallback((id: string, u: Partial<Pregoeiro>) => { hasUserInteracted.current = true; setPregoeiros(prev => prev.map(p => p.id === id ? { ...p, ...u } : p)); }, []);
    const deletePregoeiro = useCallback((id: string) => { if (confirm("Remover pregoeiro?")) { hasUserInteracted.current = true; setPregoeiros(prev => prev.filter(p => p.id !== id)); } }, []);

    const addSupervisor = useCallback((d: Omit<Supervisor, 'id'>) => { hasUserInteracted.current = true; setSupervisors(prev => [...prev, { ...d, id: `supervisor-${Date.now()}` }]); }, []);
    const updateSupervisor = useCallback((id: string, u: Partial<Supervisor>) => { hasUserInteracted.current = true; setSupervisors(prev => prev.map(s => s.id === id ? { ...s, ...u } : s)); }, []);
    const deleteSupervisor = useCallback((id: string) => { if (confirm("Remover supervisor?")) { hasUserInteracted.current = true; setSupervisors(prev => prev.filter(s => s.id !== id)); } }, []);

    const assignTenderToPregoeiro = useCallback((tid: string, pid: string, ph: 'interna' | 'externa') => {
        hasUserInteracted.current = true;
        setTenders(prev => prev.map(t => t.id === tid ? { ...t, [ph === 'interna' ? 'pregoeiroFaseInternaId' : 'pregoeiroFaseExternaId']: pid === 'none' ? undefined : pid } : t));
    }, []);

    const importTendersFromCSV = useCallback((imported: Partial<Tender>[]) => {
        hasUserInteracted.current = true;
        setTenders(() => imported.map((it, idx) => ({ ...it, id: `imported-${Date.now()}-${idx}` } as Tender)));
    }, []);

    return (
        <TendersContext.Provider value={{
            tenders, searchQuery, setSearchQuery, statusFilter, setStatusFilter, nupFilter, setNupFilter, commitmentFilter, setCommitmentFilter, coordinatorFilter, setCoordinatorFilter, requesterSectorFilter, setRequesterSectorFilter,
            pregoeiroInternoFilter, setPregoeiroInternoFilter, pregoeiroExternoFilter, setPregoeiroExternoFilter,
            updateTender, refreshTender: (_id: string, _editorName?: string) => loadDataFromCloud(true), showConferenceColumn, toggleConferenceColumn, conferenceStatuses, setConferenceStatus, bulkSetConferenceStatus, dateChecks, toggleDateCheck, deleteTender, addTenderBelow, undo, canUndo: history.length > 0, historyCount: history.length, resetToOriginalData, objectFilter, setObjectFilter, people, addPerson, updatePerson, deletePerson, pregoeiros, addPregoeiro, updatePregoeiro, deletePregoeiro, assignTenderToPregoeiro, supervisors, addSupervisor, updateSupervisor, deleteSupervisor, highlightId, setHighlightId, cloudStatus, forceCloudSync: pushDataToCloud, pullDataFromCloud: loadDataFromCloud, importTendersFromCSV
        }}>
            {children}
        </TendersContext.Provider>
    );
}

export function useTenders() {
    const context = useContext(TendersContext);
    if (context === undefined) throw new Error('useTenders must be used within a TendersProvider');
    return context;
}
