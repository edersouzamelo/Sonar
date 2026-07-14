"use client"

import { useEffect, useState } from "react"
import { useTenders } from "@/contexts/tenders-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function DatabaseMonitor() {
    const { cloudStatus, forceCloudSync } = useTenders()
    const [controlHealth, setControlHealth] = useState<any>(null)
    const [healthLoading, setHealthLoading] = useState(false)

    const fetchControlHealth = async () => {
        setHealthLoading(true)
        try {
            const response = await fetch('/api/admin/control-panel?period=today', { cache: 'no-store' })
            const payload = await response.json()
            setControlHealth(payload)
        } catch (error: any) {
            setControlHealth({ ok: false, message: error?.message || 'Falha ao consultar Supabase.' })
        } finally {
            setHealthLoading(false)
        }
    }

    useEffect(() => {
        fetchControlHealth()
        const interval = setInterval(fetchControlHealth, 60000)
        return () => clearInterval(interval)
    }, [])

    const usage = controlHealth?.usage
    const usedBytes = Number(usage?.databaseBytes || usage?.appBytes || 0)
    const quotaBytes = Number(usage?.quotaBytes || 500 * 1024 * 1024)
    const usagePercent = quotaBytes > 0 ? Math.min(100, Math.max(0, (usedBytes / quotaBytes) * 100)) : 0
    const usageTone = usagePercent >= 85 ? "bg-red-500" : usagePercent >= 65 ? "bg-amber-500" : "bg-green-500"
    const storageLabel = usage?.source === "database_rpc" ? "uso real do banco" : "estimativa pelos arquivos SONAR"
    const isSupabaseOnline = controlHealth ? !!controlHealth.ok : cloudStatus.isConnected

    const formatBytes = (bytes: number) => {
        if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB"
        const mb = bytes / 1024 / 1024
        if (mb < 1024) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
        return `${(mb / 1024).toFixed(2)} GB`
    }

    const getStatusIcon = () => {
        switch (cloudStatus.status) {
            case 'online': return <CheckCircle2 className="h-5 w-5 text-green-500" />
            case 'syncing': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
            case 'error': return <XCircle className="h-5 w-5 text-red-500" />
            default: return <AlertCircle className="h-5 w-5 text-gray-400" />
        }
    }

    const getStatusText = () => {
        switch (cloudStatus.status) {
            case 'online': return "Conectado e Sincronizado"
            case 'syncing': return "Sincronizando..."
            case 'error': return "Erro na Conexão"
            case 'offline': return "Desconectado (Apenas Local)"
            default: return "Status Desconhecido"
        }
    }

    return (
        <Card className="border-radar-gold/30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Database className="h-5 w-5 text-radar-gold" />
                        <CardTitle className="text-lg">Infraestrutura em Nuvem</CardTitle>
                    </div>
                    <Badge
                        variant={isSupabaseOnline ? "default" : "destructive"}
                        className={`${isSupabaseOnline ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500'} text-white font-bold`}
                    >
                        {isSupabaseOnline ? "Cloud Ativa" : "Offline / Local"}
                    </Badge>
                </div>
                <CardDescription>
                    Monitor de sincronia e saúde do banco de dados central (Supabase)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        {getStatusIcon()}
                        <div>
                            <p className="text-sm font-bold text-radar-dark dark:text-white">
                                {getStatusText()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Conexão com Supabase PostgreSQL
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-radar-gold/50 hover:bg-radar-gold/10"
                        onClick={async () => {
                            await forceCloudSync()
                            await fetchControlHealth()
                        }}
                        disabled={cloudStatus.status === 'syncing' || healthLoading}
                    >
                        <RefreshCw className={`h-3 w-3 mr-1 ${cloudStatus.status === 'syncing' || healthLoading ? 'animate-spin' : ''}`} />
                        Sincronizar Agora
                    </Button>
                </div>

                <div className="rounded-lg border border-radar-dark/10 bg-white p-3 dark:bg-slate-900">
                    <div className="mb-2 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase font-black text-radar-dark/50 tracking-widest">Capacidade Supabase</p>
                            <p className="text-xs text-muted-foreground">{storageLabel}</p>
                        </div>
                        <span className="text-sm font-black text-radar-dark">
                            {usagePercent.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-4 overflow-hidden rounded-full bg-slate-200 shadow-inner">
                        <div
                            className={`h-full rounded-full ${usageTone} transition-all duration-500`}
                            style={{ width: `${Math.max(usagePercent, usedBytes > 0 ? 2 : 0)}%` }}
                        />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>{formatBytes(usedBytes)} usados</span>
                        <span>{formatBytes(quotaBytes)} limite</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-radar-dark/5 rounded-lg border border-radar-dark/10">
                        <p className="text-[10px] uppercase font-black text-radar-dark/50 tracking-widest mb-1">Última Sincronia</p>
                        <div className="flex items-center text-radar-dark font-bold">
                            <Clock className="h-3 w-3 mr-2 opacity-50" />
                            <span className="text-sm">
                                {cloudStatus.lastSync
                                    ? format(cloudStatus.lastSync, "HH:mm:ss", { locale: ptBR })
                                    : "Nunca"}
                            </span>
                        </div>
                    </div>
                    <div className="p-3 bg-radar-dark/5 rounded-lg border border-radar-dark/10">
                        <p className="text-[10px] uppercase font-black text-radar-dark/50 tracking-widest mb-1">Total de Registros</p>
                        <div className="flex items-center text-radar-dark font-bold">
                            <Database className="h-3 w-3 mr-2 opacity-50" />
                            <span className="text-sm">{cloudStatus.totalRecords} processos</span>
                        </div>
                    </div>
                </div>

                {(cloudStatus.message || controlHealth?.message) && (
                    <div className="p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-600 font-medium">
                        <AlertCircle className="h-3 w-3 inline mr-1 mb-0.5" />
                        Atenção: {controlHealth?.message || cloudStatus.message}. Verifique as chaves e o SQL do painel no Supabase.
                    </div>
                )}

                <div className="pt-2 flex items-center justify-center space-x-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Espaço</span>
                        <span className="text-xs font-bold text-radar-dark">{formatBytes(usedBytes)} / {formatBytes(quotaBytes)}</span>
                    </div>
                    <div className="w-[2px] h-6 bg-gray-100 dark:bg-gray-800" />
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Versão DB</span>
                        <span className="text-xs font-bold text-radar-dark">Postgres 15.x</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
