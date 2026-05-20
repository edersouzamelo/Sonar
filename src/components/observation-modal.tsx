"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/user-context"
import { MessageSquarePlus } from "lucide-react"
import { Tender } from "@/types"

interface ObservationModalProps {
    tender: Tender;
}

export function ObservationModal({ tender }: ObservationModalProps) {
    const { role } = useUser();
    const [open, setOpen] = useState(false);
    const [observation, setObservation] = useState("");

    // Permissões: Ordenador de Despesas e Agente Diretor
    const canObserve = ['Ordenador de Despesas', 'Agente Diretor'].includes(role);

    if (!canObserve) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!observation.trim()) {
            alert("Por favor, insira uma observação.");
            return;
        }
        // Lógica simulada de envio
        alert(`Observação adicionada por ${role}: "${observation}"`);
        setObservation("");
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-radar-gold text-radar-dark hover:bg-radar-gold/10">
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Adicionar Observação
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground border-radar-gold">
                <DialogHeader>
                    <DialogTitle>Nova Observação - Pregão {tender.number}</DialogTitle>
                    <DialogDescription>
                        Adicione uma observação ou nota sobre este pregão. Ela ficará registrada no histórico.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="observation">Observação</Label>
                            <textarea
                                id="observation"
                                value={observation}
                                onChange={(e) => setObservation(e.target.value)}
                                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Digite sua observação aqui..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="bg-radar-dark text-white hover:bg-gray-800">
                            Salvar Observação
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
