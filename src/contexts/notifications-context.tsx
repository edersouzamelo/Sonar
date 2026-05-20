"use client"

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Subscriber, NotificationLog } from '@/types';
import { useTenders } from './tenders-context';

interface Alert {
    id: string;
    title: string;
    message: string;
    type: 'warning' | 'error' | 'info';
    date: string;
    isRead: boolean;
    tenderId?: string;
}

interface NotificationsContextType {
    subscribers: Subscriber[];
    logs: NotificationLog[];
    alerts: Alert[];
    unreadCount: number;
    addSubscriber: (subscriber: Omit<Subscriber, 'id' | 'createdAt'>) => void;
    removeSubscriber: (id: string) => void;
    checkAndSendNotifications: () => Promise<void>;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAlerts: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { tenders, people, pregoeiros, supervisors, dateChecks } = useTenders();

    const [manualSubscribers, setManualSubscribers] = useState<Subscriber[]>([]);
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Carregar logs e alertas salvos
    useEffect(() => {
        const savedLogs = localStorage.getItem('radar_logs');
        const savedAlerts = localStorage.getItem('radar_alerts');
        if (savedLogs) setLogs(JSON.parse(savedLogs));
        if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
        setIsLoaded(true);
    }, []);

    // Salvar alertas sempre que mudarem
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('radar_alerts', JSON.stringify(alerts));
        }
    }, [alerts, isLoaded]);

    // Gerar alertas in-app baseados nos pregões
    useEffect(() => {
        if (!isLoaded || tenders.length === 0) return;

        const today = new Date();
        const activeAlerts: Alert[] = [];

        tenders.forEach(t => {
            // Se o processo está homologado ou cancelado, não deve ter alerta ativo
            if (t.status === 'HOMOLOGADO' || t.status.includes('CANCELADO')) return;

            const deadlineStr = t.dates?.protocoloSetorRequisitante?.defined;
            const checks = dateChecks[t.id] || {};
            const isOk = !!checks["protocoloSetorRequisitante.defined"];

            // Se o prazo já foi cumprido (Check azul na agenda), não deve ter alerta
            if (!deadlineStr || isOk) return;


            const deadline = new Date(deadlineStr);
            const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            // Identificador único baseado na data e ID para evitar duplicatas, mas permitir atualizações se a data mudar
            const alertId = `deadline-${t.id}-${deadlineStr}`;

            // Regras de Alertas (Sincronizadas com a Agenda)
            if (diffDays <= 0) {
                activeAlerts.push({
                    id: alertId,
                    title: diffDays === 0 ? `Prazo Vence Hoje: ${t.number}` : `Prazo ATRASADO: ${t.number}`,
                    message: `O Prazo SAL do pregão ${t.number} (${t.uasg}) ${diffDays === 0 ? 'vence hoje' : `está atrasado há ${Math.abs(diffDays)} dias`}.`,
                    type: diffDays === 0 ? 'warning' : 'error',
                    date: new Date().toISOString(),
                    isRead: alerts.find(a => a.id === alertId)?.isRead || false,
                    tenderId: t.id
                });
            } else if (diffDays <= 5) {
                activeAlerts.push({
                    id: alertId,
                    title: `Prazo Próximo: ${t.number}`,
                    message: `Faltam apenas ${diffDays} dias para o Prazo SAL do pregão ${t.number}.`,
                    type: 'info',
                    date: new Date().toISOString(),
                    isRead: alerts.find(a => a.id === alertId)?.isRead || false,
                    tenderId: t.id
                });
            }
        });

        // Substituir os alertas antigos pelos ativos (Sincronismo Total)
        setAlerts(activeAlerts);
    }, [tenders, isLoaded]);


    const unreadCount = useMemo(() => alerts.filter(a => !a.isRead).length, [alerts]);

    const markAsRead = (id: string) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    };

    const markAllAsRead = () => {
        setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    };

    const clearAlerts = () => {
        setAlerts([]);
    };

    // DERIVAÇÃO UNIFICADA: Os subscritores são SEMPRE os membros da equipe + manuais
    const subscribers = useMemo(() => {
        const synced: Subscriber[] = [
            ...pregoeiros.map(p => ({
                id: `team-${p.id}`,
                name: p.name,
                email: p.email,
                phone: p.whatsapp,
                department: 'Pregoeiro',
                preferences: { email: true, whatsapp: true, sms: false },
                createdAt: new Date().toISOString()
            })),
            ...people.map(p => ({
                id: `team-${p.id}`,
                name: p.name,
                email: p.email,
                phone: p.whatsapp,
                department: p.sector || 'Requisitante',
                preferences: { email: true, whatsapp: true, sms: false },
                createdAt: new Date().toISOString()
            })),
            ...supervisors.map(s => ({
                id: `team-${s.id}`,
                name: s.name,
                email: s.email,
                phone: s.whatsapp,
                department: s.organization || 'Supervisor',
                preferences: { email: true, whatsapp: true, sms: false },
                createdAt: new Date().toISOString()
            }))
        ];
        return [...synced, ...manualSubscribers];
    }, [pregoeiros, people, supervisors, manualSubscribers]);

    const addSubscriber = (newSub: Omit<Subscriber, 'id' | 'createdAt'>) => {
        const subscriber: Subscriber = {
            ...newSub,
            id: `manual-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString()
        };
        setManualSubscribers(prev => [...prev, subscriber]);
    };

    const removeSubscriber = (id: string) => {
        setManualSubscribers(prev => prev.filter(s => s.id !== id));
    };

    const checkAndSendNotifications = async () => {
        const today = new Date();
        const newLogs: NotificationLog[] = [];

        for (const tender of tenders) {
            const deadlineStr = tender.dates?.protocoloSetorRequisitante?.defined;
            if (!deadlineStr) continue;

            const deadlineDate = new Date(deadlineStr);
            const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            // Alerta se faltar 30, 5 ou 0 dias
            if ([30, 5, 0].includes(diffDays)) {
                for (const sub of subscribers) {
                    const type = diffDays === 30 ? '30_days' : diffDays === 5 ? '5_days' : 'deadline';

                    if (sub.preferences.email && sub.email) {
                        try {
                            const response = await fetch('/api/notifications/email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to: sub.email,
                                    subject: `ALERTA RADAR: Prazo SAL Pregão ${tender.number} - Faltam ${diffDays} dias`,
                                    html: `
                                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                                            <h2 style="color: #1A1A1A;">Olá, ${sub.name}!</h2>
                                            <p>Este é um alerta automático do sistema <strong>RADAR</strong>.</p>
                                            <p>O <strong>Prazo SAL do Pregão nº ${tender.number}</strong> vence em <strong>${new Date(deadlineStr).toLocaleDateString('pt-BR')}</strong>.</p>
                                            <hr />
                                            <p><strong>Status:</strong> ${diffDays === 0 ? 'Vence HOJE' : `Faltam ${diffDays} dias`}.</p>
                                            <p>Por favor, providencie o Termo de Referência (TR).</p>
                                        </div>
                                    `
                                })
                            });

                            const result = await response.json();
                            newLogs.push({
                                id: Math.random().toString(36).substr(2, 9),
                                subscriberId: sub.id,
                                subscriberName: sub.name,
                                tenderNumber: tender.number,
                                channel: 'email',
                                type,
                                sentAt: new Date().toISOString(),
                                status: result.success ? 'sent' : 'failed'
                            });
                        } catch (error) {
                            console.error('Error sending email:', error);
                        }
                    }
                }
            }
        }

        if (newLogs.length > 0) {
            setLogs(prev => [...newLogs, ...prev]);
            localStorage.setItem('radar_logs', JSON.stringify([...newLogs, ...logs]));
        }
    };


    return (
        <NotificationsContext.Provider value={{
            subscribers,
            logs,
            alerts,
            unreadCount,
            addSubscriber,
            removeSubscriber,
            checkAndSendNotifications,
            markAsRead,
            markAllAsRead,
            clearAlerts
        }}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationsContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
}

