"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/user-context"
import { useTenders } from "@/contexts/tenders-context"
import { Edit } from "lucide-react"
import { Tender } from "@/types"

interface EditTenderModalProps {
    tender: Tender;
}

export function EditTenderModal({ tender }: EditTenderModalProps) {
    const { role, hasPermission, user } = useUser();
    const { updateTender } = useTenders();
    const [open, setOpen] = useState(false);

    const isMajor = user?.email?.toLowerCase().trim() === 'edersouzamelo@gmail.com';
    const canEditTender = hasPermission('edit_tenders') || role === 'Administrador' || isMajor;
    const canEditDates = hasPermission('edit_dates') || role === 'Administrador' || isMajor;

    if (!canEditTender && !canEditDates) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);

        // Extrair dados do formulário
        const isGCALC = formData.get('isGCALC') === 'on';

        const updatedTender: Partial<Tender> = {
            isGCALC,
            responsibleInternal: formData.get('responsibleInternal') as string || undefined,
            responsibleExternal: formData.get('responsibleExternal') as string || undefined,
            biPublication: formData.get('biPublication') as string || undefined,
            nextActivity: formData.get('nextActivity') as string || undefined,
            nextDeadline: formData.get('nextDeadline') as string || undefined,
            optimizationNotes: formData.get('optimizationNotes') as string || undefined,
            intercurrences: formData.get('intercurrences') as string || undefined,
            dates: {
                protocoloSetorRequisitante: {
                    defined: formData.get('protocoloDefined') as string || undefined,
                    executed: formData.get('protocoloExecuted') as string || undefined,
                },
                faseInternaSALC: {
                    defined: formData.get('faseInternaDefined') as string || undefined,
                    executed: formData.get('faseInternaExecuted') as string || undefined,
                },
                retornoCJU: {
                    estimated: formData.get('retornoCJUEstimated') as string || undefined,
                    occurred: formData.get('retornoCJUOccurred') as string || undefined,
                },
                ajustesPublicacao: {
                    defined: formData.get('ajustesDefined') as string || undefined,
                    executed: formData.get('ajustesExecuted') as string || undefined,
                },
                inicioSessaoPublica: {
                    defined: formData.get('sessaoDefined') as string || undefined,
                    executed: formData.get('sessaoExecuted') as string || undefined,
                },
                homologacao: {
                    defined: formData.get('homologacaoDefined') as string || undefined,
                    executed: formData.get('homologacaoExecuted') as string || undefined,
                },
                vigenciaAnterior: formData.get('vigenciaAnterior') as string || undefined,
                prazoGCALC: formData.get('prazoGCALC') as string || undefined,
            }
        };

        // Atualizar o pregão no contexto
        updateTender(tender.id, updatedTender);

        alert("Dados salvos com sucesso!");
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-radar-gold text-radar-dark hover:bg-radar-gold/10">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Dados
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 border-radar-gold shadow-2xl">
                <DialogHeader className="border-b pb-4 sticky top-0 bg-white dark:bg-slate-950 z-20">
                    <DialogTitle>Editar Pregão {tender.number}</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                        Atualize os dados e prazos do pregão. Campos opcionais podem ser deixados em branco.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* GCALC */}
                        <div className="flex items-center gap-4">
                            <input
                                type="checkbox"
                                id="isGCALC"
                                name="isGCALC"
                                defaultChecked={tender.isGCALC}
                                disabled={!canEditTender}
                                className="h-4 w-4 rounded border-gray-300 text-radar-gold focus:ring-radar-gold disabled:opacity-50"
                            />
                            <Label htmlFor="isGCALC" className="font-bold">
                                É GCALC?
                            </Label>
                        </div>

                        {/* Protocolo Setor Requisitante */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Protocolo Inicial do Setor Requisitante na SALC</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="protocoloDefined">Prazo Definido</Label>
                                    <Input
                                        id="protocoloDefined"
                                        name="protocoloDefined"
                                        type="date"
                                        defaultValue={tender.dates?.protocoloSetorRequisitante?.defined}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="protocoloExecuted">Prazo Executado</Label>
                                    <Input
                                        id="protocoloExecuted"
                                        name="protocoloExecuted"
                                        type="date"
                                        defaultValue={tender.dates?.protocoloSetorRequisitante?.executed}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Fase Interna SALC */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Fase Interna Preliminar da SALC até envio para CJU</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="faseInternaDefined">Prazo Definido</Label>
                                    <Input
                                        id="faseInternaDefined"
                                        name="faseInternaDefined"
                                        type="date"
                                        defaultValue={tender.dates?.faseInternaSALC?.defined}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="faseInternaExecuted">Prazo Executado</Label>
                                    <Input
                                        id="faseInternaExecuted"
                                        name="faseInternaExecuted"
                                        type="date"
                                        defaultValue={tender.dates?.faseInternaSALC?.executed}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Retorno CJU */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Retorno da CJU</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="retornoCJUEstimated">Prazo Estimado</Label>
                                    <Input
                                        id="retornoCJUEstimated"
                                        name="retornoCJUEstimated"
                                        type="date"
                                        defaultValue={tender.dates?.retornoCJU?.estimated}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="retornoCJUOccurred">Prazo Ocorrido</Label>
                                    <Input
                                        id="retornoCJUOccurred"
                                        name="retornoCJUOccurred"
                                        type="date"
                                        defaultValue={tender.dates?.retornoCJU?.occurred}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Ajustes até Publicação */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Ajustes até Publicação pela SALC</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="ajustesDefined">Prazo Definido</Label>
                                    <Input
                                        id="ajustesDefined"
                                        name="ajustesDefined"
                                        type="date"
                                        defaultValue={tender.dates?.ajustesPublicacao?.defined}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="ajustesExecuted">Prazo Executado</Label>
                                    <Input
                                        id="ajustesExecuted"
                                        name="ajustesExecuted"
                                        type="date"
                                        defaultValue={tender.dates?.ajustesPublicacao?.executed}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Início Sessão Pública */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Início da Sessão Pública pela SALC</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="sessaoDefined">Prazo Definido</Label>
                                    <Input
                                        id="sessaoDefined"
                                        name="sessaoDefined"
                                        type="date"
                                        defaultValue={tender.dates?.inicioSessaoPublica?.defined}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="sessaoExecuted">Prazo Executado</Label>
                                    <Input
                                        id="sessaoExecuted"
                                        name="sessaoExecuted"
                                        type="date"
                                        defaultValue={tender.dates?.inicioSessaoPublica?.executed}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Homologação */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Homologação pela SALC</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="homologacaoDefined">Prazo Definido</Label>
                                    <Input
                                        id="homologacaoDefined"
                                        name="homologacaoDefined"
                                        type="date"
                                        defaultValue={tender.dates?.homologacao?.defined}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="homologacaoExecuted">Prazo Executado</Label>
                                    <Input
                                        id="homologacaoExecuted"
                                        name="homologacaoExecuted"
                                        type="date"
                                        defaultValue={tender.dates?.homologacao?.executed}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Vigência Anterior e Prazo GCALC */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Datas Adicionais</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="vigenciaAnterior">Vigência do Pregão Anterior</Label>
                                    <Input
                                        id="vigenciaAnterior"
                                        name="vigenciaAnterior"
                                        type="date"
                                        defaultValue={tender.dates?.vigenciaAnterior}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="prazoGCALC">Prazo do GCALC</Label>
                                    <Input
                                        id="prazoGCALC"
                                        name="prazoGCALC"
                                        type="date"
                                        defaultValue={tender.dates?.prazoGCALC}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Gestão e Responsáveis */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Gestão e Responsáveis</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="responsibleInternal">Resp. Fase Interna</Label>
                                    <Input
                                        id="responsibleInternal"
                                        name="responsibleInternal"
                                        defaultValue={tender.responsibleInternal}
                                        placeholder="Ex: S Ten L Alves"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="responsibleExternal">Pregoeiro / Fase Externa</Label>
                                    <Input
                                        id="responsibleExternal"
                                        name="responsibleExternal"
                                        defaultValue={tender.responsibleExternal}
                                        placeholder="Ex: 2º Sgt Octávio"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="biPublication">Publicação em BI</Label>
                                    <Input
                                        id="biPublication"
                                        name="biPublication"
                                        defaultValue={tender.biPublication}
                                        placeholder="Ex: BI nº4/ 2026"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="nextDeadline">Próximo Prazo crítico</Label>
                                    <Input
                                        id="nextDeadline"
                                        name="nextDeadline"
                                        defaultValue={tender.nextDeadline}
                                        placeholder="Ex: 2026-02-25"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <Label htmlFor="nextActivity">Próxima Atividade da Licitação</Label>
                                <Input
                                    id="nextActivity"
                                    name="nextActivity"
                                    defaultValue={tender.nextActivity}
                                    placeholder="Ex: 8 Adjudicação e Homologação"
                                />
                            </div>
                        </div>

                        {/* Notas de Otimização e Intercorrências */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Notas Adicionais</h4>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="optimizationNotes">O que pode ser otimizado?</Label>
                                    <textarea
                                        id="optimizationNotes"
                                        name="optimizationNotes"
                                        defaultValue={tender.optimizationNotes}
                                        className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Sugestões de otimização..."
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="intercurrences">Intercorrências / Notas</Label>
                                    <textarea
                                        id="intercurrences"
                                        name="intercurrences"
                                        defaultValue={tender.intercurrences}
                                        className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Problemas identificados..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="sticky bottom-0 bg-white dark:bg-slate-950 pt-4 border-t z-20 mt-4 pb-2">
                        <Button
                            type="submit"
                            className="w-full bg-radar-dark hover:bg-black text-white font-bold h-12 transition-all hover:scale-[1.02] shadow-lg"
                        >
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
