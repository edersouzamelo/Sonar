"use client"

import { useNotifications } from "@/contexts/notifications-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Trash2,
    Send,
    Mail,
    MessageSquare,
    Smartphone,
    History,
    Users,
    UserPlus,
    Edit2
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { Subscriber } from "@/types"

export default function AdminNotificationsPage() {
    const { subscribers, logs, removeSubscriber, addSubscriber, checkAndSendNotifications } = useNotifications()
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingSub, setEditingSub] = useState<Subscriber | null>(null)
    const [isSending, setIsSending] = useState(false)
    const [newSub, setNewSub] = useState({
        name: '',
        email: '',
        phone: '',
        department: '',
        preferences: { email: true, whatsapp: true, sms: false }
    })

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault()
        addSubscriber(newSub)
        setNewSub({
            name: '',
            email: '',
            phone: '',
            department: '',
            preferences: { email: true, whatsapp: true, sms: false }
        })
        setIsAddModalOpen(false)
    }

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingSub) {
            removeSubscriber(editingSub.id)
            addSubscriber(editingSub)
            setEditingSub(null)
        }
    }

    const handleManualTrigger = async () => {
        setIsSending(true)
        await checkAndSendNotifications()
        setIsSending(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-radar-dark tracking-tighter uppercase">Central de Alertas</h1>
                    <p className="text-sm text-gray-500">Gestão de contatos e monitoramento de disparos.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-black text-white hover:bg-gray-800 font-bold px-6 shadow-xl border border-white/10">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Novo Contato
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-radar-gold max-w-md">
                            <form onSubmit={handleAdd}>
                                <DialogHeader>
                                    <DialogTitle>Cadastrar Novo Contato</DialogTitle>
                                    <DialogDescription>Adicione manualmente um responsável para receber alertas.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Nome / Posto</Label>
                                        <Input id="name" required value={newSub.name} onChange={e => setNewSub({ ...newSub, name: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="dept">Setor / Órgão</Label>
                                        <Input id="dept" required value={newSub.department} onChange={e => setNewSub({ ...newSub, department: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <Input id="email" type="email" required value={newSub.email} onChange={e => setNewSub({ ...newSub, email: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Celular (WhatsApp)</Label>
                                        <Input id="phone" value={newSub.phone} onChange={e => setNewSub({ ...newSub, phone: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="bg-radar-dark text-white w-full">Salvar Contato</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
                        onClick={handleManualTrigger}
                        disabled={isSending}
                        className="bg-radar-gold/10 border-radar-gold text-radar-dark font-bold hover:bg-radar-gold/20 disabled:opacity-50"
                    >
                        <Send className={`w-4 h-4 mr-2 text-radar-gold ${isSending ? 'animate-pulse' : ''}`} />
                        {isSending ? 'Enviando...' : 'Disparo Manual'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lista de Inscritos */}
                <Card className="border-none shadow-lg overflow-hidden">
                    <CardHeader className="border-b bg-gray-50/50 py-4">
                        <div className="flex items-center space-x-2">
                            <Users className="w-5 h-5 text-radar-dark" />
                            <CardTitle className="text-lg">Subscritores Ativos</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 font-black tracking-widest">
                                    <tr>
                                        <th className="px-6 py-3">Responsável</th>
                                        <th className="px-6 py-3">Canais</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscribers.map((sub) => (
                                        <tr key={sub.id} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-radar-dark uppercase text-xs">{sub.name}</div>
                                                <div className="text-[10px] text-gray-400 font-medium">{sub.department}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex space-x-2">
                                                    {sub.preferences.email && <Mail className="w-4 h-4 text-blue-500" />}
                                                    {sub.preferences.whatsapp && <MessageSquare className="w-4 h-4 text-green-500" />}
                                                    {sub.preferences.sms && <Smartphone className="w-4 h-4 text-orange-400" />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end space-x-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-radar-dark hover:bg-radar-gold/20"
                                                        onClick={() => setEditingSub(sub)}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => removeSubscriber(sub.id)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {subscribers.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic">
                                                Nenhum subscritor cadastrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Log de Envios */}
                <Card className="border-none shadow-lg overflow-hidden">
                    <CardHeader className="border-b bg-gray-50/50 py-4">
                        <div className="flex items-center space-x-2">
                            <History className="w-5 h-5 text-radar-dark" />
                            <CardTitle className="text-lg">Log de Disparos</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-center justify-between p-4 border-b hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-2.5 rounded-2xl ${log.channel === 'whatsapp' ? 'bg-green-50 text-green-600' :
                                            log.channel === 'email' ? 'bg-blue-50 text-blue-600' :
                                                'bg-orange-50 text-orange-600'
                                            } border border-current/10 shadow-sm`}>
                                            {log.channel === 'whatsapp' && <MessageSquare className="w-4 h-4" />}
                                            {log.channel === 'email' && <Mail className="w-4 h-4" />}
                                            {log.channel === 'sms' && <Smartphone className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-black text-radar-dark uppercase tracking-tight">
                                                {log.type === '30_days' ? 'Alerta de 30 Dias' :
                                                    log.type === '5_days' ? 'Alerta de 5 Dias' : 'Alerta Final (Abertura)'}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-medium">
                                                Para {log.subscriberName} • Pregão {log.tenderNumber}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge className="bg-green-500/10 text-green-600 border-none text-[9px] font-black px-1.5 h-4">ENVIADO</Badge>
                                        <div className="text-[9px] text-gray-400 font-bold mt-1">
                                            {new Date(log.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="p-12 text-center text-gray-400 italic">
                                    Nenhuma notificação enviada hoje.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Edição de Subscritor */}
            {editingSub && (
                <Dialog open={!!editingSub} onOpenChange={() => setEditingSub(null)}>
                    <DialogContent className="bg-white border-radar-gold max-w-md">
                        <form onSubmit={handleEdit}>
                            <DialogHeader>
                                <DialogTitle>Editar Contato: {editingSub.name}</DialogTitle>
                                <DialogDescription>Atualize os dados e canais de recebimento.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 text-radar-dark">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Nome / Posto</Label>
                                    <Input id="edit-name" required value={editingSub.name} onChange={e => setEditingSub({ ...editingSub, name: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-dept">Setor</Label>
                                    <Input id="edit-dept" required value={editingSub.department} onChange={e => setEditingSub({ ...editingSub, department: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-email">E-mail</Label>
                                    <Input id="edit-email" type="email" required value={editingSub.email} onChange={e => setEditingSub({ ...editingSub, email: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-phone">Celular (WhatsApp)</Label>
                                    <Input id="edit-phone" value={editingSub.phone} onChange={e => setEditingSub({ ...editingSub, phone: e.target.value })} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="bg-radar-dark text-white w-full font-bold">Salvar Alterações</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
