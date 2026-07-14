import { Bell, Menu, RefreshCw, Trash2, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { UserNav } from "@/components/user-nav";
import { useTenders } from "@/contexts/tenders-context";
import { useNotifications } from "@/contexts/notifications-context";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";


interface HeaderProps {
    onMenuOpen?: () => void;
}

export function Header({ onMenuOpen }: HeaderProps) {
    const { searchQuery, setSearchQuery, cloudStatus, pullDataFromCloud } = useTenders();
    const { alerts, unreadCount, markAsRead, markAllAsRead, clearAlerts } = useNotifications();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [databaseHealth, setDatabaseHealth] = useState<'checking' | 'online' | 'offline'>('checking');
    const router = useRouter();

    const checkDatabaseHealth = async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setDatabaseHealth('offline');
            return;
        }

        try {
            const response = await fetch('/api/health/database', { cache: 'no-store' });
            setDatabaseHealth(response.ok ? 'online' : 'offline');
        } catch {
            setDatabaseHealth('offline');
        }
    };

    useEffect(() => {
        checkDatabaseHealth();
        const interval = window.setInterval(checkDatabaseHealth, 30000);
        const handleOnline = () => checkDatabaseHealth();
        const handleOffline = () => setDatabaseHealth('offline');

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await checkDatabaseHealth();
        await pullDataFromCloud(true);
        await checkDatabaseHealth();
        setIsRefreshing(false);
    };

    const isOffline = databaseHealth === 'offline';
    const isChecking = databaseHealth === 'checking';
    const isUpdating = databaseHealth === 'online' && (cloudStatus.status === 'syncing' || isRefreshing);
    const statusLabel = isOffline
        ? 'Banco indisponivel'
        : isUpdating
            ? 'Atualizando dados'
            : cloudStatus.isConnected
                ? 'Banco online'
                : 'Banco online';
    const statusDot =
        isOffline ? 'bg-red-400' :
            isChecking || isUpdating ? 'bg-green-500 animate-pulse' :
                'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]';

    return (
        <header className="flex h-16 md:h-24 w-full items-center gap-x-2 md:gap-x-4 px-3 md:px-8 bg-transparent border-b border-slate-100 dark:border-slate-800">

            {/* Botão hamburger — só mobile */}
            <button
                type="button"
                className="md:hidden p-2 text-gray-400 hover:text-radar-gold transition-colors flex-shrink-0"
                onClick={onMenuOpen}
            >
                <span className="sr-only">Abrir menu</span>
                <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Saudação — só desktop */}
            <div className="hidden md:flex flex-col flex-shrink-0">
                <h2 className="text-lg font-semibold text-radar-dark dark:text-white">Olá, Gestor!</h2>
                <p className="text-sm text-gray-500">Bem-vindo ao SONAR</p>
            </div>

            {/* Busca — cresce para ocupar o espaço disponível */}
            <div className="flex flex-1 min-w-0 md:ml-8 md:max-w-md" data-tour="header-search">
                <div className="relative w-full text-gray-400 focus-within:text-radar-gold">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        id="search-field"
                        className="block w-full rounded-xl border-0 bg-white dark:bg-slate-800 dark:text-gray-100 py-2 pl-9 pr-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-radar-gold shadow-sm text-sm"
                        placeholder="Buscar pregão..."
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Ações — direita */}
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0 ml-auto md:ml-2">

                {/* Indicador cloud — Unificado e Responsivo */}
                <div
                    data-tour="header-status"
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 md:px-2.5 md:py-1.5 rounded-full border ${isOffline
                    ? 'bg-red-50 dark:bg-red-950 border-red-200 text-red-500 dark:text-red-400'
                    : 'bg-green-50 dark:bg-green-950 border-green-200 text-green-700 dark:text-green-400'
                    }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />

                    <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 font-medium whitespace-nowrap">
                        <span className="text-[10px] md:text-xs">{isChecking ? 'Verificando banco' : statusLabel}</span>

                        {cloudStatus.isConnected && !isOffline && (
                            <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-gray-400 dark:text-gray-500 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-gray-800 sm:pl-2 mt-0.5 sm:mt-0">
                                <span title="Processos salvos">{cloudStatus.totalTenders} processos</span>
                                <span className="opacity-30">•</span>
                                <span title="Prazos salvos">{cloudStatus.totalDates} prazos</span>
                                <span className="opacity-30">•</span>
                                <span title="Agentes salvos">{cloudStatus.totalPeople} pessoas</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Botão Atualizar */}
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    title="Atualizar dados do servidor"
                    className="flex md:hidden items-center justify-center h-8 w-8 rounded-full bg-radar-dark text-radar-cream hover:bg-radar-gold transition-all shadow-sm disabled:opacity-50"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    title="Atualizar dados do servidor"
                    className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-radar-dark dark:bg-slate-700 text-radar-cream hover:bg-radar-gold hover:text-radar-dark dark:hover:bg-radar-gold dark:hover:text-radar-dark transition-all shadow-sm disabled:opacity-50"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Atualizar</span>
                </button>

                <Popover>
                    <PopoverTrigger asChild>
                        <button type="button" data-tour="header-notifications" className="p-2 text-gray-500 hover:text-radar-gold transition-colors relative flex-shrink-0">
                            <span className="sr-only">Ver notificações</span>
                            <Bell className="h-5 w-5" aria-hidden="true" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-white">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[450px] p-0 rounded-2xl border-slate-100 shadow-xl" align="end">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-bold text-sm">Notificações</h3>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-blue-600" onClick={markAllAsRead}>
                                    Ler Tudo
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-red-600" onClick={clearAlerts}>
                                    Limpar
                                </Button>
                            </div>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto">

                            {alerts.length > 0 ? (
                                <div className="flex flex-col">
                                    {alerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            onClick={() => {
                                                markAsRead(alert.id);
                                                if (alert.tenderId) router.push(`/agenda`);
                                            }}
                                            className={`p-4 border-b last:border-0 cursor-pointer transition-colors hover:bg-slate-50 relative ${!alert.isRead ? 'bg-blue-50/30' : ''}`}
                                        >
                                            {!alert.isRead && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-600" />}
                                            <div className="flex gap-3">
                                                <div className={`mt-1 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${alert.type === 'error' ? 'bg-red-100 text-red-600' :
                                                    alert.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                                                        'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {alert.type === 'error' ? <AlertTriangle className="h-4 w-4" /> :
                                                        alert.type === 'warning' ? <Info className="h-4 w-4" /> :
                                                            <CheckCircle className="h-4 w-4" />
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-bold leading-tight ${!alert.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                                        {alert.title}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                                        {alert.message}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 mt-2">
                                                        {format(new Date(alert.date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 px-8 text-center">
                                    <Bell className="h-12 w-12 mb-4 opacity-10" />
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">Nenhuma notificação</p>
                                    <p className="text-[11px] mt-1 opacity-60">Seus alertas de prazos aparecerão aqui.</p>
                                </div>
                            )}
                        </div>

                    </PopoverContent>
                </Popover>

                <div className="flex items-center pl-2 border-l border-gray-200" data-tour="header-user">
                    <UserNav />
                </div>
            </div>
        </header>
    );
}

