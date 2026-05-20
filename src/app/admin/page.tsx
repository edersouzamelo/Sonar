"use client"

import { useState, useEffect, useRef } from "react"
import { useUser, UserRole } from "@/contexts/user-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Shield, UserPlus, Key, UserCog, AlertTriangle, Download, Trash2, Users, Radio, CheckSquare, RefreshCw } from "lucide-react"
import { useTenders } from "@/contexts/tenders-context"

import { exportTendersToCSV } from "@/lib/export-utils"
import { DatabaseMonitor } from "@/components/admin/database-monitor"
import { supabase } from "@/lib/supabase"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function AdminPage() {
    const { role, user, onlineUsers, dailyUsers, hasPermission, permissions: userPermissions } = useUser()
    const {
        tenders,
        pregoeiros,
        supervisors,
        people,
        addPregoeiro,
        updatePregoeiro,
        deletePregoeiro,
        addSupervisor,
        updateSupervisor,
        deleteSupervisor,
        addPerson,
        updatePerson,
        deletePerson
    } = useTenders()

    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    // Estado isolado para checkboxes de permissão — inicializado uma única vez do banco
    const [permChecked, setPermChecked] = useState<Record<string, Record<string, boolean>>>({});
    const permCheckedInit = useRef(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchProfiles = async () => {
        setIsSyncing(true);
        try {
            const { data } = await supabase.from('profiles').select('*');
            if (data) setAllProfiles(data);
            // Simular um leve delay para o "conforto espiritual" da animação
            await new Promise(r => setTimeout(r, 800));
        } finally {
            setIsSyncing(false);
        }
    };


    useEffect(() => {
        fetchProfiles();
    }, []);

    // Monitor de Adesão com histórico por período
    const [accessPeriod, setAccessPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
    const [accessLogs, setAccessLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    useEffect(() => {
        const fetchAccessLogs = async () => {
            setLogsLoading(true);
            const now = new Date();
            let since: Date;
            if (accessPeriod === 'today') {
                since = new Date(now); since.setHours(0, 0, 0, 0);
            } else if (accessPeriod === 'week') {
                since = new Date(now); since.setDate(now.getDate() - 7);
            } else if (accessPeriod === 'month') {
                since = new Date(now); since.setMonth(now.getMonth() - 1);
            } else {
                since = new Date(now); since.setFullYear(now.getFullYear() - 1);
            }

            const { data } = await supabase
                .from('access_logs')
                .select('*')
                .gte('accessed_at', since.toISOString())
                .order('accessed_at', { ascending: false });

            if (data) {
                // Desduplicar: manter apenas o acesso mais recente por usuário
                const seen = new Set<string>();
                const unique = data.filter(log => {
                    if (seen.has(log.user_id)) return false;
                    seen.add(log.user_id);
                    return true;
                });
                setAccessLogs(unique);
            }
            setLogsLoading(false);
        };
        fetchAccessLogs();
    }, [accessPeriod]);

    // TODO: Tasks
    // - [x] Correção de Camadas (Sidebar z-index)
    // - [x] Codificação por Cores: Compromisso (GCALC, PCA, Perseu)
    // - [x] Codificação por Cores: Coordenador (CCOL, CAF, 9º B Sup)
    // - [x] Codificação por Cores: Requisitante (9º B Mnt, 9° B Sup, 18° B Trnp, Cia Cmdo, 9° B Sau, Cmdo 9° Gpt)
    // - [x] Verificação de contraste e legibilidade
    // - [x] Push final para produção

    // Consolidação da equipe: Unimos pregoeiros, supervisores e requisitantes com os perfis de autenticação
    const teamMembers = [
        ...pregoeiros.map(p => ({ ...p, type: 'pregoeiro' })),
        ...supervisors.map(s => ({ ...s, type: 'supervisor' })),
        ...people.map(p => ({ ...p, type: 'requisitante' }))
    ].map(member => {
        // Tenta encontrar um perfil (login) correspondente pelo e-mail com busca robusta
        const memberEmail = member.email?.toLowerCase().trim();
        const profile = allProfiles.find(p => p.email?.toLowerCase().trim() === memberEmail);

        const basePerms = (
            profile?.permissions && Object.values(profile.permissions).some(Boolean)
        ) ? profile.permissions : (member as any).permissions || {};

        return {
            ...member,
            full_name: profile?.full_name || member.name,
            permissions: basePerms,
            profile_id: profile?.id,
            is_auth_user: !!profile
        };
    }).sort((a, b) => a.full_name.localeCompare(b.full_name))
        .filter((member, index, self) => index === self.findIndex(m => m.id === member.id));

    // Inicializa permChecked UMA VEZ com permissões do banco
    useEffect(() => {
        if (permCheckedInit.current || teamMembers.length === 0) return;
        const initial: Record<string, Record<string, boolean>> = {};
        teamMembers.forEach(m => {
            const key = (m.email || '').toLowerCase().trim();
            if (key) initial[key] = m.permissions || {};
        });
        setPermChecked(initial);
        permCheckedInit.current = true;
    }, [teamMembers]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingMember, setEditingMember] = useState<any>(null)
    const [newMember, setNewMember] = useState({ name: "", email: "", role: "Pregoeiro", whatsapp: "", type: 'pregoeiro' as 'pregoeiro' | 'supervisor' | 'requisitante', sector: "" })

    const handleExport = () => {
        exportTendersToCSV(tenders, user?.name || "Usuário Radar");
    }

    const handleAddMember = (e: React.FormEvent) => {
        e.preventDefault()
        if (newMember.type === 'pregoeiro') {
            addPregoeiro({ name: newMember.name, email: newMember.email, role: newMember.role, whatsapp: newMember.whatsapp })
        } else if (newMember.type === 'supervisor') {
            addSupervisor({ name: newMember.name, email: newMember.email, role: newMember.role, whatsapp: newMember.whatsapp, organization: "SALC" })
        } else {
            addPerson({ name: newMember.name, email: newMember.email, role: newMember.role, whatsapp: newMember.whatsapp, sector: newMember.sector || "Geral" })
        }
        setNewMember({ name: "", email: "", role: "Pregoeiro", whatsapp: "", type: 'pregoeiro', sector: "" })
        setIsAddModalOpen(false)
    }

    const handleEditMember = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingMember.type === 'pregoeiro') {
            updatePregoeiro(editingMember.id, { name: editingMember.name, email: editingMember.email, role: editingMember.role, whatsapp: editingMember.whatsapp })
        } else if (editingMember.type === 'supervisor') {
            updateSupervisor(editingMember.id, { name: editingMember.name, email: editingMember.email, role: editingMember.role, whatsapp: editingMember.whatsapp })
        } else {
            updatePerson(editingMember.id, { name: editingMember.name, email: editingMember.email, role: editingMember.role, whatsapp: editingMember.whatsapp, sector: editingMember.sector })
        }
        setEditingMember(null)
    }

    const handleDeleteMember = (member: any) => {
        if (member.type === 'pregoeiro') {
            deletePregoeiro(member.id)
        } else if (member.type === 'supervisor') {
            deleteSupervisor(member.id)
        } else {
            deletePerson(member.id)
        }
    }

    if (role !== 'Administrador' && role !== 'Chefe da Seção de Licitações') {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <AlertTriangle className="h-16 w-16 text-red-500" />
                <h1 className="text-2xl font-bold text-radar-dark">Acesso Negado</h1>
                <p className="text-gray-500">Apenas o Administrador ou Chefe da SALC tem permissão para acessar este módulo.</p>
            </div>
        )
    }

    const availablePermissions = [
        { id: 'edit_tenders', name: 'Editar Pregões', description: 'Alterar dados principais dos processos' },
        { id: 'edit_dates', name: 'Editar Datas', description: 'Alterar cronogramas e prazos' },
        { id: 'bulk_check', name: 'Conferência em Massa', description: 'Usar o "Verificar Todos" na lista' },
        { id: 'edit_users', name: 'Editar Usuários', description: 'Cadastrar novos membros e perfis' },
        { id: 'view_all', name: 'Visualizar Tudo', description: 'Acesso total de leitura' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-radar-dark dark:text-white flex items-center">
                        <Shield className="mr-2 h-8 w-8 text-radar-gold" />
                        Painel de Controle SALC
                    </h1>
                    <p className="text-muted-foreground">Monitoramento ao vivo e gestão de permissões do sistema</p>
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="secondary"
                        className="bg-white border-2 border-black text-black hover:bg-gray-100 font-bold px-4 hover:shadow-md"
                        onClick={handleExport}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Banco
                    </Button>

                    <Button
                        variant="default"
                        className="bg-blue-600 text-white hover:bg-blue-700 font-bold px-4 shadow-lg border-2 border-blue-400/30 gap-2"
                        onClick={fetchProfiles}
                        disabled={isSyncing}
                    >
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
                    </Button>


                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#1A1A1A] text-white hover:bg-black font-black px-6 shadow-2xl border-2 border-radar-gold/50 uppercase tracking-tight">
                                <UserPlus className="mr-2 h-5 w-5 text-radar-gold" />
                                Novo Membro da Equipe
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white dark:bg-slate-900 border-radar-gold">
                            <form onSubmit={handleAddMember}>
                                <DialogHeader>
                                    <DialogTitle>Cadastrar Novo Membro</DialogTitle>
                                    <DialogDescription>Adicione um novo integrante à equipe da SALC.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="add-name">Nome Completo / Posto ou Grad</Label>
                                        <Input id="add-name" required value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="add-email">E-mail Institucional</Label>
                                        <Input id="add-email" type="email" required value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="add-whatsapp">WhatsApp</Label>
                                        <Input id="add-whatsapp" placeholder="(00) 00000-0000" value={newMember.whatsapp} onChange={e => setNewMember({ ...newMember, whatsapp: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Tipo de Vínculo</Label>
                                            <Select value={newMember.type} onValueChange={(val: 'pregoeiro' | 'supervisor' | 'requisitante') => setNewMember({ ...newMember, type: val, role: val === 'pregoeiro' ? 'Pregoeiro' : val === 'supervisor' ? 'Supervisor' : 'Requisitante' })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pregoeiro">Pregoeiro / Equipe</SelectItem>
                                                    <SelectItem value="supervisor">Supervisor / Órgão</SelectItem>
                                                    <SelectItem value="requisitante">Setor Requisitante</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Função Específica</Label>
                                            <Input value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} />
                                        </div>
                                    </div>
                                    {newMember.type === 'requisitante' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="add-sector">OM / Setor Requisitante</Label>
                                            <Input id="add-sector" placeholder="Ex: 9º B Mnt" value={newMember.sector} onChange={e => setNewMember({ ...newMember, sector: e.target.value })} />
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="bg-radar-dark text-white w-full">Salvar na Equipe</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="col-span-1 border-green-500/30">
                    <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                            <Radio className="h-5 w-5 text-green-500 animate-pulse" />
                            <CardTitle className="text-lg">Acessando Agora</CardTitle>
                        </div>
                        <CardDescription>Usuários online em tempo real</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {onlineUsers.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">Apenas você monitorando...</p>
                            ) : (
                                onlineUsers.map((u) => (
                                    <div key={u.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-800">
                                        <div className="flex items-center space-x-2">
                                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                                            <div>
                                                <p className="text-xs font-bold text-radar-dark dark:text-white">{u.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{u.email}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[8px] h-4 bg-white">ONLINE</Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="col-span-2">
                    <DatabaseMonitor />
                </div>

                <div className="col-span-1 lg:col-span-1">
                    <Card className="h-full border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 py-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Radio className="w-4 h-4 text-green-500 animate-pulse" />
                                    Monitor de Adesão
                                </CardTitle>
                                <select
                                    className="text-[10px] font-bold uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 cursor-pointer"
                                    value={accessPeriod}
                                    onChange={e => setAccessPeriod(e.target.value as any)}
                                >
                                    <option value="today">Hoje</option>
                                    <option value="week">Semana</option>
                                    <option value="month">Mês</option>
                                    <option value="year">Ano</option>
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {/* Online agora */}
                            <div className="mb-3">
                                <div className="text-[10px] font-black uppercase text-muted-foreground mb-2 flex items-center justify-between">
                                    Acessando Agora
                                    <Badge variant="outline" className="text-[10px] h-4 bg-green-50 text-green-700 border-green-200">
                                        {onlineUsers.length} ONLINE
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    {onlineUsers.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic">Apenas você online...</p>
                                    ) : onlineUsers.map(u => (
                                        <div key={u.id} className="flex items-center gap-2 p-1.5 bg-green-50/40 rounded-lg border border-green-100/60">
                                            <div className="h-6 w-6 rounded-full bg-radar-dark text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">{u.name[0]}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold truncate">{u.name}</p>
                                                <p className="text-[9px] text-muted-foreground truncate">{u.email}</p>
                                            </div>
                                            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] flex-shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Histórico do período */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                                <div className="text-[10px] font-black uppercase text-muted-foreground mb-2 flex items-center justify-between">
                                    {accessPeriod === 'today' && 'Acessos Hoje'}
                                    {accessPeriod === 'week' && 'Acessos na Semana'}
                                    {accessPeriod === 'month' && 'Acessos no Mês'}
                                    {accessPeriod === 'year' && 'Acessos no Ano'}
                                    <span className="text-[10px] font-bold text-slate-400">{accessLogs.length} usuários</span>
                                </div>
                                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {logsLoading ? (
                                        <p className="text-[11px] text-muted-foreground italic">Carregando...</p>
                                    ) : accessLogs.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic">Nenhum acesso registrado neste período.</p>
                                    ) : accessLogs.map(log => {
                                        const isOnline = onlineUsers.some(u => u.id === log.user_id);
                                        const ts = new Date(log.accessed_at);
                                        const isToday = ts.toDateString() === new Date().toDateString();
                                        const label = isToday
                                            ? ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                            : ts.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + ts.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <div key={log.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                                                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isOnline ? 'bg-radar-dark text-white' : 'bg-slate-200 text-slate-500'
                                                    }`}>
                                                    {(log.user_name || '?')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-semibold truncate">{log.user_name || log.user_email}</p>
                                                    <p className="text-[9px] text-muted-foreground truncate">{label}</p>
                                                </div>
                                                {isOnline && <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="space-y-4">
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-radar-gold" />Gerenciamento de Usuários</CardTitle>
                                <CardDescription>Gerencie funções e permissões de cada membro da seção</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                        <th className="text-left px-4 py-3 font-black text-[11px] uppercase tracking-wide text-radar-dark dark:text-white min-w-[160px]">Nome</th>
                                        <th className="text-left px-4 py-3 font-black text-[11px] uppercase tracking-wide text-radar-dark dark:text-white min-w-[180px]">E-mail</th>
                                        <th className="text-left px-4 py-3 font-black text-[11px] uppercase tracking-wide text-radar-dark dark:text-white min-w-[120px]">Função</th>
                                        <th className="text-center px-3 py-3 font-black text-[10px] uppercase tracking-wide text-radar-dark dark:text-white min-w-[80px]">Ed. Pregões</th>
                                        <th className="text-center px-3 py-3 font-black text-[10px] uppercase tracking-wide text-radar-dark dark:text-white min-w-[80px]">Ed. Datas</th>
                                        <th className="text-center px-3 py-3 font-black text-[10px] uppercase tracking-wide text-radar-dark dark:text-white min-w-[80px]">Conferência</th>
                                        <th className="text-center px-3 py-3 font-black text-[10px] uppercase tracking-wide text-radar-dark dark:text-white min-w-[80px]">Ed. Usuários</th>
                                        <th className="text-center px-3 py-3 font-black text-[10px] uppercase tracking-wide text-radar-dark dark:text-white min-w-[80px]">Visualização</th>
                                        <th className="text-center px-3 py-3 font-black text-[10px] uppercase tracking-wide text-muted-foreground min-w-[60px]">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamMembers.map((u, idx) => (
                                        <tr key={u.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-slate-900/20'}`}>
                                            {/* Nome */}
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 bg-radar-dark text-white rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                                                        {(u.full_name || u.name || '?')[0]}
                                                    </div>
                                                    <span className="font-semibold text-radar-dark dark:text-white text-xs truncate max-w-[120px]">{u.full_name || u.name}</span>
                                                </div>
                                            </td>
                                            {/* E-mail */}
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-xs truncate max-w-[150px] ${!u.email ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                                        {u.email || '⚠️ Sem e-mail'}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-5 w-5 bg-radar-gold/10 hover:bg-radar-gold text-radar-dark border border-radar-gold/20 flex-shrink-0"
                                                        title="Definir e-mail"
                                                        onClick={async () => {
                                                            const newEmail = prompt(`Definir E-mail para ${u.name}:`, u.email || "");
                                                            if (newEmail !== null && newEmail.trim() !== "") {
                                                                const emailLower = newEmail.toLowerCase().trim();
                                                                try {
                                                                    const { error: updateErr } = await supabase.from('team_members').update({ email: emailLower }).eq('id', u.id);
                                                                    if (updateErr) throw updateErr;
                                                                    alert(`E-mail definido: ${emailLower}`);
                                                                    window.location.reload();
                                                                } catch (err: any) {
                                                                    alert("Erro ao salvar e-mail: " + err.message);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <UserCog className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                            {/* Função */}
                                            <td className="px-4 py-2">
                                                <select
                                                    defaultValue={u.role || ''}
                                                    className="text-xs bg-transparent border-b border-transparent hover:border-radar-gold/40 focus:border-radar-gold outline-none w-full text-muted-foreground focus:text-radar-dark dark:focus:text-white transition-colors py-0.5 px-0.5 cursor-pointer"
                                                    onChange={async (e) => {
                                                        const newRole = e.target.value;
                                                        if (newRole !== (u.role || '')) {
                                                            try {
                                                                // 1. Atualiza team_members
                                                                const { error } = await supabase.from('team_members').update({ role: newRole }).eq('id', u.id);
                                                                if (error) throw error;

                                                                // 2. Sincroniza profiles pelo email
                                                                if (u.email) {
                                                                    await supabase.from('profiles').update({ role: newRole }).eq('email', u.email.toLowerCase().trim());
                                                                }

                                                                alert(`Função de ${u.name} alterada para: ${newRole}`);
                                                                window.location.reload();
                                                            } catch (err: any) {
                                                                alert('Erro ao salvar função: ' + err.message);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <option value="">Sem função</option>
                                                    <option value="Administrador">Administrador 🔑</option>
                                                    <option value="Chefe da Seção de Licitações">Chefe da Seção (SALC)</option>
                                                    <option value="Pregoeiro">Pregoeiro</option>
                                                    <option value="Auxiliar">Auxiliar</option>
                                                    <option value="Setor Requisitante">Setor Requisitante</option>
                                                    <option value="Ordenador de Despesas">Ordenador de Despesas</option>
                                                    <option value="Agente Diretor">Agente Diretor</option>
                                                    <option value="Visitante">Visitante</option>
                                                </select>
                                            </td>
                                            {/* Permissões */}
                                            {(['edit_tenders', 'edit_dates', 'bulk_check', 'edit_users', 'view_all'] as const).map(permId => {
                                                const emailKey = (u.email || '').toLowerCase().trim();
                                                const isChecked = !!(permChecked[emailKey]?.[permId]);
                                                const handleToggle = async () => {
                                                    if (!u.email) { alert('Defina o e-mail primeiro.'); return; }
                                                    const currentPerms = permChecked[emailKey] || {};
                                                    const newPerms = { ...currentPerms, [permId]: !currentPerms[permId] };
                                                    setPermChecked(prev => ({ ...prev, [emailKey]: newPerms }));
                                                    const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id);
                                                    if (isRealUuid) {
                                                        const { error: rpcErr } = await supabase.rpc('update_member_permissions', {
                                                            p_member_id: u.id, p_permissions: newPerms, p_profile_id: u.profile_id || null
                                                        });
                                                        if (rpcErr) console.error('[Permissão] Erro RPC:', rpcErr.message);
                                                    }

                                                    // Sincronização definitiva pelo email para ambos os casos (UUID ou FakeID)
                                                    if (emailKey) {
                                                        await supabase.rpc('update_member_permissions_by_email', { p_email: emailKey, p_permissions: newPerms });
                                                        // Força atualização direta no profiles para garantir sincronia imediata
                                                        await supabase.from('profiles').update({ permissions: newPerms }).eq('email', emailKey);
                                                    }
                                                };
                                                return (
                                                    <td key={permId} className="px-3 py-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={handleToggle}
                                                            disabled={!u.email}
                                                            title={!u.email ? 'Defina o e-mail primeiro' : (isChecked ? 'Revogar permissão' : 'Conceder permissão')}
                                                            className="h-4 w-4 accent-amber-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mx-auto block"
                                                        />
                                                    </td>
                                                );
                                            })}
                                            {/* Ações */}
                                            <td className="px-3 py-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-blue-50 text-blue-500" title="Editar membro" onClick={() => setEditingMember(u)}>
                                                        <UserCog className="h-3 w-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-50 text-red-400" title="Remover membro" onClick={() => handleDeleteMember(u)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Visitantes: usuários autenticados sem cadastro em team_members */}
                                    {allProfiles
                                        .filter(p => !teamMembers.some(m => m.email?.toLowerCase().trim() === p.email?.toLowerCase().trim()))
                                        .map((visitor, idx) => (
                                            <tr key={visitor.id} className={`border-b border-slate-100 dark:border-slate-800 opacity-70 ${idx === 0 ? 'border-t-2 border-t-slate-200 dark:border-t-slate-700' : ''}`}>
                                                {/* Nome visitante */}
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 bg-slate-400 text-white rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                                                            {(visitor.full_name || visitor.email || '?')[0].toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{visitor.full_name || visitor.email?.split('@')[0]}</span>
                                                    </div>
                                                </td>
                                                {/* E-mail visitante */}
                                                <td className="px-4 py-2">
                                                    <span className="text-xs text-muted-foreground truncate max-w-[150px] block">{visitor.email}</span>
                                                </td>
                                                {/* Função = Visitante */}
                                                <td className="px-4 py-2">
                                                    <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Visitante</span>
                                                </td>
                                                {/* Permissões visitante */}
                                                {(['edit_tenders', 'edit_dates', 'bulk_check', 'edit_users', 'view_all'] as const).map(permId => (
                                                    <td key={permId} className="px-3 py-2 text-center">
                                                        <button
                                                            className={`h-5 w-5 rounded border-2 mx-auto flex items-center justify-center transition-all cursor-pointer hover:scale-110 ${visitor.permissions?.[permId]
                                                                ? 'bg-radar-gold border-radar-gold text-white shadow-sm'
                                                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-radar-gold/50'
                                                                }`}
                                                            title={visitor.permissions?.[permId] ? 'Revogar permissão' : 'Conceder permissão'}
                                                            onClick={async () => {
                                                                const newPerms = { ...(visitor.permissions || {}), [permId]: !visitor.permissions?.[permId] };
                                                                const { error } = await supabase.from('profiles').update({ permissions: newPerms }).eq('id', visitor.id);
                                                                if (error) alert('Erro ao salvar permissão: ' + error.message);
                                                                else window.location.reload();
                                                            }}
                                                        >
                                                            {visitor.permissions?.[permId] && <CheckSquare className="h-3 w-3" />}
                                                        </button>
                                                    </td>
                                                ))}
                                                {/* Sem ações de edição para visitantes */}
                                                <td className="px-3 py-2 text-center">
                                                    <span className="text-[10px] text-slate-300">—</span>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Modal de Edição */}
                {editingMember && (
                    <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
                        <DialogContent className="bg-white dark:bg-slate-900 border-radar-gold">
                            <form onSubmit={handleEditMember}>
                                <DialogHeader>
                                    <DialogTitle>Editar Membro: {editingMember.full_name || editingMember.name}</DialogTitle>
                                    <DialogDescription>Atualize os dados de contato ou função.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-name">Nome / Posto ou Grad</Label>
                                        <Input id="edit-name" value={editingMember.name} onChange={e => setEditingMember({ ...editingMember, name: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2 text-radar-dark dark:text-white">
                                        <Label htmlFor="edit-email">E-mail</Label>
                                        <Input id="edit-email" type="email" value={editingMember.email} onChange={e => setEditingMember({ ...editingMember, email: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                                        <Input id="edit-whatsapp" value={editingMember.whatsapp} onChange={e => setEditingMember({ ...editingMember, whatsapp: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2 text-radar-dark dark:text-white">
                                        <Label>Função / Cargo</Label>
                                        <Input value={editingMember.role} onChange={e => setEditingMember({ ...editingMember, role: e.target.value })} />
                                    </div>
                                    {editingMember.type === 'requisitante' && (
                                        <div className="grid gap-2 text-radar-dark dark:text-white">
                                            <Label htmlFor="edit-sector">OM / Setor Requisitante</Label>
                                            <Input id="edit-sector" value={editingMember.sector} onChange={e => setEditingMember({ ...editingMember, sector: e.target.value })} />
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="bg-radar-dark text-white w-full">Salvar Alterações</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}

                <div className="grid gap-6 md:grid-cols-2">

                    <Card>
                        <CardHeader>
                            <CardTitle>Segurança e Senhas</CardTitle>
                            <CardDescription>Redefinição de credenciais de acesso</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="user-select">Selecionar Usuário</Label>
                                <select id="user-select" className="w-full p-2 bg-white dark:bg-gray-800 border rounded-md">
                                    {teamMembers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password">Nova Senha Temporária</Label>
                                <div className="flex space-x-2">
                                    <Input id="new-password" type="password" placeholder="********" />
                                    <Button variant="outline">
                                        <Key className="mr-2 h-4 w-4" />
                                        Gerar
                                    </Button>
                                </div>
                            </div>
                            <Button className="w-full bg-radar-dark text-white hover:bg-gray-800">
                                Atualizar Credenciais
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    )
}
