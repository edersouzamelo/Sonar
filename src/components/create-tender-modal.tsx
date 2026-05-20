"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/user-context"
import { useTenders } from "@/contexts/tenders-context"
import { supabase } from "@/lib/supabase"
import { Plus, Loader2 } from "lucide-react"
import { Tender } from "@/types"

export function CreateTenderModal() {
    const { role, user } = useUser();
    const { forceCloudSync } = useTenders();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [number, setNumber] = useState("");
    const [uasg, setUasg] = useState("160136");
    const [description, setDescription] = useState("");
    const [openingDate, setOpeningDate] = useState("");

    // Permissões: Apenas Chefe SALC, Pregoeiro, Auxiliares e Administrador (Major)
    const isMajor = user?.email?.toLowerCase().trim() === 'edersouzamelo@gmail.com';
    const canCreate = ['Chefe da Seção de Licitações', 'Pregoeiro', 'Auxiliar', 'Administrador'].includes(role) || isMajor;

    if (!canCreate) return null;

    const resetForm = () => {
        setNumber("");
        setUasg("160136");
        setDescription("");
        setOpeningDate("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!number.trim() || !description.trim()) {
            alert("⚠️ Número do Processo e Objeto são obrigatórios.");
            return;
        }

        setSaving(true);
        try {
            const newTender: Partial<Tender> = {
                id: `tender-${Date.now()}`,
                uasg: uasg || "160136",
                number: number.trim(),
                description: description.trim(),
                openingDate: openingDate ? new Date(openingDate).toISOString() : new Date().toISOString(),
                status: "FASE INTERNA NA OMDS",
                currentStage: "1. Entrada do TR na SAL",
                hasIssues: false,
                department: "18º B Trnp",
                nup: "",
                dates: {},
                updates: [],
                observations: [],
                lastUpdatedBy: user?.name || role || "Sistema",
                lastUpdatedAt: new Date().toISOString(),
            };

            if (supabase) {
                const { error } = await supabase.from('tenders').insert([{
                    id: newTender.id,
                    uasg: newTender.uasg,
                    number: newTender.number,
                    description: newTender.description,
                    opening_date: newTender.openingDate,
                    status: newTender.status,
                    current_stage: newTender.currentStage,
                    has_issues: newTender.hasIssues,
                    department: newTender.department,
                    nup: newTender.nup,
                    dates: newTender.dates,
                    updates: newTender.updates,
                    observations: newTender.observations,
                    last_updated_by: newTender.lastUpdatedBy,
                }]);

                if (error) throw error;
            }

            // Recarregar dados do cloud
            await forceCloudSync();

            resetForm();
            setOpen(false);
            // Recarregar a página para refletir o novo pregão
            window.location.reload();
        } catch (err: any) {
            console.error("Erro ao salvar pregão:", err);
            alert(`❌ Erro ao salvar pregão: ${err.message || "Erro desconhecido"}`);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
                <Button className="bg-radar-gold text-radar-dark hover:bg-radar-gold/90 font-bold">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Pregão
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 text-radar-dark dark:text-white border-radar-gold shadow-2xl">
                <DialogHeader className="border-b pb-4 mb-4">
                    <DialogTitle className="text-2xl font-bold">Novo Pregão</DialogTitle>
                    <DialogDescription className="text-gray-500 dark:text-gray-400">
                        Preencha os dados básicos. O pregão será salvo direto no banco de dados.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 py-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="number" className="font-semibold">
                                Número do Processo <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="number"
                                placeholder="99/2026"
                                className="focus:ring-radar-gold"
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="uasg" className="font-semibold">
                                UASG
                            </Label>
                            <Input
                                id="uasg"
                                placeholder="160136"
                                className="focus:ring-radar-gold"
                                value={uasg}
                                onChange={(e) => setUasg(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="date" className="font-semibold">
                                Data de Abertura
                            </Label>
                            <Input
                                id="date"
                                type="datetime-local"
                                className="focus:ring-radar-gold"
                                value={openingDate}
                                onChange={(e) => setOpeningDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="description" className="font-semibold">
                                Objeto da Licitação <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="description"
                                placeholder="Aquisição de material..."
                                className="focus:ring-radar-gold"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-8 pt-4 border-t">
                        <Button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-radar-dark hover:bg-black text-white font-bold h-12 transition-all hover:scale-[1.02] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                            ) : (
                                "Salvar Pregão"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
