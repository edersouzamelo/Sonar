"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { NotificationLog, Subscriber } from '@/types';
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
const ALERTS_STORAGE_KEY = 'sonar_active_agenda_alerts_v2';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { people, pregoeiros, supervisors } = useTenders();
    const [manualSubscribers, setManualSubscribers] = useState<Subscriber[]>([]);
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const savedLogs = localStorage.getItem('radar_logs');
        if (savedLogs) setLogs(JSON.parse(savedLogs));

        localStorage.removeItem('radar_alerts');
        localStorage.removeItem(ALERTS_STORAGE_KEY);
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    }, [alerts, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        setAlerts([]);
        localStorage.removeItem('radar_alerts');
        localStorage.removeItem(ALERTS_STORAGE_KEY);
    }, [isLoaded]);

    const unreadCount = useMemo(() => alerts.filter(a => !a.isRead).length, [alerts]);

    const subscribers = useMemo(() => {
        const synced: Subscriber[] = [
            ...pregoeiros.map(p => ({
                id: `team-${p.id}`,
                name: p.name,
                email: p.email,
                phone: p.whatsapp,
                department: 'Pregoeiro',
                preferences: { email: true, whatsapp: true, sms: false },
                createdAt: new Date().toISOString(),
            })),
            ...people.map(p => ({
                id: `team-${p.id}`,
                name: p.name,
                email: p.email,
                phone: p.whatsapp,
                department: p.sector || 'Requisitante',
                preferences: { email: true, whatsapp: true, sms: false },
                createdAt: new Date().toISOString(),
            })),
            ...supervisors.map(s => ({
                id: `team-${s.id}`,
                name: s.name,
                email: s.email,
                phone: s.whatsapp,
                department: s.organization || 'Supervisor',
                preferences: { email: true, whatsapp: true, sms: false },
                createdAt: new Date().toISOString(),
            })),
        ];
        return [...synced, ...manualSubscribers];
    }, [pregoeiros, people, supervisors, manualSubscribers]);

    const addSubscriber = (newSub: Omit<Subscriber, 'id' | 'createdAt'>) => {
        setManualSubscribers(prev => [...prev, {
            ...newSub,
            id: `manual-${Math.random().toString(36).slice(2, 11)}`,
            createdAt: new Date().toISOString(),
        }]);
    };

    const removeSubscriber = (id: string) => {
        setManualSubscribers(prev => prev.filter(s => s.id !== id));
    };

    const markAsRead = (id: string) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    };

    const markAllAsRead = () => {
        setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    };

    const clearAlerts = () => {
        setAlerts([]);
        localStorage.removeItem('radar_alerts');
        localStorage.removeItem(ALERTS_STORAGE_KEY);
    };

    const checkAndSendNotifications = async () => {
        clearAlerts();
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
            clearAlerts,
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
