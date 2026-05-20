"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, TrendingUp, Calendar, ShieldCheck } from "lucide-react"
import { useTenders } from "@/contexts/tenders-context"
import { generateSpedDocument, SpedDocumentData, generateDiexDocument, DiexParaData } from "@/lib/document-utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function ReportsPage() {
    const { tenders } = useTenders()

    const handleDownloadSped = () => {
        const data: SpedDocumentData[] = tenders.map(t => ({
            tenderNumber: t.number,
            uasg: t.uasg,
            openingDate: t.openingDate,
            responsible: t.department || "SALC / PREGOEIRO",
            status: t.currentStage || "Em Andamento"
        }))

        generateSpedDocument(data)
    }

    const handleDownloadDiex = async () => {
        console.log("Iniciando geração de DIEx...");
        const activeTenders = tenders.filter(t => !['HOMOLOGADO', 'ABANDONADO', 'CANCELADO POR ABANDONO', 'CANCELADO POR REVOGAÇÃO', 'CANCELADO POR DUPLICIDADE DE OBJETO'].includes(t.status));
        console.log(`Pregões ativos encontrados: ${activeTenders.length}`);

        if (activeTenders.length === 0) {
            alert("Nenhum pregão ATIVO encontrado para gerar o DIEx de cobrança.");
            return;
        }

        const data: DiexParaData[] = activeTenders.map(t => {
            // Lógica automática de providência baseada na fase
            let reason = "o protocolo inicial do TR";

            if (t.currentStage?.includes("Publicado")) {
                reason = "a devolução do processo para análise de recursos";
            } else if (t.currentStage?.includes("Homologado")) {
                reason = "o encerramento da fase administrativa no sistema";
            }

            return {
                omds: t.section || t.department || "OM Requisitante",
                tenderNumber: t.number,
                nup: "65345.000123/2026-00",
                object: t.description,
                deadline: "20 FEV 26",
                reason: reason
            }
        })

        try {
            await generateDiexDocument(data);
            console.log("DIEx gerado com sucesso!");
        } catch (error) {
            console.error("Erro ao gerar DIEx:", error);
            alert("Erro ao gerar o documento DIEx. Verifique o console do navegador.");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-radar-dark tracking-tighter uppercase italic flex items-center">
                        <FileText className="mr-2 h-6 w-6 text-radar-gold" />
                        Módulo de Relatórios
                    </h1>
                    <p className="text-sm text-gray-500">Documentos oficiais e auditoria de prazos da SALC.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card DIEx - Notificação Formal */}
                <Card className="border-none shadow-xl bg-white overflow-hidden group hover:ring-2 ring-radar-gold transition-all border-l-4 border-l-radar-gold">
                    <div className="h-2 bg-radar-dark" />
                    <CardHeader>
                        <div className="flex items-center space-x-2 mb-2">
                            <ShieldCheck className="w-5 h-5 text-radar-gold" />
                            <Badge className="bg-radar-gold text-radar-dark text-[9px] uppercase font-black">Urgente</Badge>
                        </div>
                        <CardTitle className="text-xl font-black text-radar-dark uppercase leading-tight">
                            Notificação DIEx <br /> (Editável .docx)
                        </CardTitle>
                        <CardDescription className="text-xs font-medium uppercase mt-2">
                            Gera automaticamente o texto do DIEx de cobrança para as OMDS requisitantes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-3 bg-radar-gold/5 rounded-lg border border-dashed border-radar-gold/20">
                            <p className="text-[10px] text-radar-dark font-bold uppercase italic">Vantagens:</p>
                            <ul className="mt-2 text-[10px] space-y-1 text-gray-600 font-medium">
                                <li>• Agrupamento automático por OMDS</li>
                                <li>• Sugestão de Providência e Prazo</li>
                                <li>• Formato compatível com Google Docs</li>
                                <li>• Redução de tempo (de 1 dia para 1 clique)</li>
                            </ul>
                        </div>
                        <Button
                            onClick={handleDownloadDiex}
                            className="w-full bg-radar-dark text-white hover:bg-black font-black uppercase tracking-tighter shadow-lg group-hover:bg-radar-gold group-hover:text-radar-dark transition-colors"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Gerar DIEx de Cobrança
                        </Button>
                    </CardContent>
                </Card>

                {/* Card SPED - Controle de Prazos */}
                <Card className="border-none shadow-xl bg-white overflow-hidden group hover:ring-2 ring-radar-gold transition-all">
                    <div className="h-2 bg-gray-400" />
                    <CardHeader>
                        <div className="flex items-center space-x-2 mb-2">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <Badge variant="outline" className="text-[9px] uppercase font-black border-radar-dark/20 text-gray-400">PDF/TXT</Badge>
                        </div>
                        <CardTitle className="text-xl font-black text-radar-dark uppercase leading-tight">
                            Controle de Prazos <br /> (SPED)
                        </CardTitle>
                        <CardDescription className="text-xs font-medium uppercase mt-2">
                            Relatório consolidado para auditoria interna de prazos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            onClick={handleDownloadSped}
                            variant="outline"
                            className="w-full border-radar-dark text-radar-dark hover:bg-radar-dark hover:text-white font-black uppercase tracking-tighter transition-colors"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Emitir Listagem SPED
                        </Button>
                    </CardContent>
                </Card>

                {/* Placeholder para Documentos Futuros */}
                <Card className="border-none shadow-lg bg-gray-50/50 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 opacity-60">
                    <TrendingUp className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-[10px] uppercase font-black text-gray-400">Relatório de Desempenho</p>
                    <p className="text-[9px] text-gray-400 text-center mt-1">Implementação futura conforme solicitação.</p>
                </Card>
            </div>
        </div>
    )
}
