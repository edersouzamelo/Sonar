"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/contexts/notifications-context"
import { Bell, CheckCircle2, ShieldAlert, XCircle, Smartphone, Mail, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function SubscribePage() {
    const { addSubscriber, removeSubscriber, subscribers } = useNotifications()
    const [isSuccess, setIsSuccess] = useState(false)
    const [action, setAction] = useState<'subscribe' | 'unsubscribe'>('subscribe')

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        department: '',
        preferences: {
            email: true,
            whatsapp: true,
            sms: false
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (action === 'subscribe') {
            addSubscriber(formData)
        } else {
            // No mundo real buscaríamos pelo email/telefone
            const existing = subscribers.find(s => s.email === formData.email)
            if (existing) removeSubscriber(existing.id)
        }
        setIsSuccess(true)
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-radar-cream flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center py-8">
                    <CardContent className="space-y-4">
                        <div className="flex justify-center">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl">
                            {action === 'subscribe' ? 'Inscrição Realizada!' : 'Inscrição Removida!'}
                        </CardTitle>
                        <CardDescription>
                            {action === 'subscribe'
                                ? 'Você receberá os alertas de 30, 5 e 0 dias nos canais selecionados.'
                                : 'Você não receberá mais notificações automáticas deste sistema.'}
                        </CardDescription>
                        <Button asChild className="mt-4 bg-radar-dark">
                            <Link href="/">Voltar ao Sistema</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-radar-cream flex flex-col items-center justify-center p-4">
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="bg-radar-dark p-4 rounded-3xl shadow-xl mb-4">
                    <Bell className="h-12 w-12 text-radar-gold" />
                </div>
                <h1 className="text-3xl font-black text-radar-dark tracking-tighter">RADAR ALERTAS</h1>
                <p className="text-gray-500 max-w-xs mt-2">Mantenha-se informado sobre todos os prazos críticos dos pregões.</p>
            </div>

            <Card className="max-w-xl w-full border-none shadow-2xl">
                <CardHeader>
                    <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline" className="border-radar-gold text-radar-gold uppercase font-bold tracking-widest text-[10px] px-2">
                            Módulo de Subscrição
                        </Badge>
                        <div className="flex space-x-1">
                            <Button
                                variant={action === 'subscribe' ? 'default' : 'ghost'}
                                size="sm"
                                className={action === 'subscribe' ? 'bg-radar-gold text-radar-dark font-bold' : ''}
                                onClick={() => setAction('subscribe')}
                            >
                                Subscrever
                            </Button>
                            <Button
                                variant={action === 'unsubscribe' ? 'destructive' : 'ghost'}
                                size="sm"
                                onClick={() => setAction('unsubscribe')}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-radar-dark">
                        {action === 'subscribe' ? 'Cadastrar Recebimento' : 'Remover Recebimento'}
                    </CardTitle>
                    <CardDescription>
                        Preencha seus dados para gerenciar seus alertas automáticos (30, 5 e 0 dias).
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {action === 'subscribe' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ex: Maj Silva"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label htmlFor="department">Setor / Cargo</Label>
                                    <Input
                                        id="department"
                                        placeholder="Ex: Ordenador"
                                        required
                                        value={formData.department}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail Institucional</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="usuario@eb.mil.br"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        {action === 'subscribe' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">WhatsApp / Celular (com DDD)</Label>
                                    <Input
                                        id="phone"
                                        placeholder="67999998888"
                                        required={formData.preferences.whatsapp || formData.preferences.sms}
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <Label className="text-xs font-bold uppercase text-gray-400">Canais de Preferência</Label>
                                    <div className="grid grid-cols-3 gap-3 mt-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, preferences: { ...formData.preferences, email: !formData.preferences.email } })}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${formData.preferences.email ? 'border-radar-gold bg-radar-gold/10' : 'border-gray-100'}`}
                                        >
                                            <Mail className={`h-6 w-6 mb-1 ${formData.preferences.email ? 'text-radar-gold' : 'text-gray-300'}`} />
                                            <span className="text-[10px] font-bold">E-MAIL</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, preferences: { ...formData.preferences, whatsapp: !formData.preferences.whatsapp } })}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${formData.preferences.whatsapp ? 'border-radar-gold bg-radar-gold/10' : 'border-gray-100'}`}
                                        >
                                            <MessageSquare className={`h-6 w-6 mb-1 ${formData.preferences.whatsapp ? 'text-radar-gold' : 'text-gray-300'}`} />
                                            <span className="text-[10px] font-bold">WHATSAPP</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, preferences: { ...formData.preferences, sms: !formData.preferences.sms } })}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${formData.preferences.sms ? 'border-radar-gold bg-radar-gold/10' : 'border-gray-100'}`}
                                        >
                                            <Smartphone className={`h-6 w-6 mb-1 ${formData.preferences.sms ? 'text-radar-gold' : 'text-gray-300'}`} />
                                            <span className="text-[10px] font-bold">SMS</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            type="submit"
                            className={`w-full py-6 text-lg font-black transition-all ${action === 'subscribe' ? 'bg-radar-dark hover:bg-black text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        >
                            {action === 'subscribe' ? 'Confirmar Subscrição' : 'Confirmar Remoção'}
                        </Button>
                        <p className="text-[10px] text-center text-gray-400">
                            Ao confirmar, você concorda em receber comunicações automáticas sobre os prazos de licitações. Você pode alterar essa preferência a qualquer momento.
                        </p>
                    </CardFooter>
                </form>
            </Card>

            <div className="mt-8 flex items-center space-x-2 text-gray-400">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-xs">Sistema Seguro e Criptografado</span>
            </div>
        </div>
    )
}
