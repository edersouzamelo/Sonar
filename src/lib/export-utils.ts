import { Tender, TenderStatus, TenderStage } from "@/types";

// Função auxiliar para formatar check como SIM/NÃO
const chk = (val: boolean | undefined) => val ? "SIM" : "";

export function exportTendersToCSV(
    tenders: Tender[],
    userName: string,
    dateChecks: Record<string, Record<string, boolean>> = {}
) {
    const now = new Date();

    const headers = [
        "Número", "UASG", "NUP", "Objeto", "Status", "Fase Atual",
        "Compromisso", "Coordenador", "Setor Requisitante",
        // Datas + checks
        "Prazo CJU", "✓ Prazo CJU",
        "Retorno CJU", "✓ Retorno CJU",
        "Prazo Ajustes Pub", "✓ Prazo Ajustes Pub",
        "Data Pub", "✓ Data Pub",
        "Abertura/Julgamento", "✓ Abertura/Julgamento",
        "Prev Homologação", "✓ Prev Homologação",
        "Prazo Homologação", "✓ Prazo Homologação",
        "Assinatura Atas", "✓ Assinatura Atas",
        "Vigência Ant", "Prazo GCALC",
        // Pregoeiros
        "Pregoeiro Interno", "Pregoeiro Externo",
        // Outros
        "Notas Rápidas", "Observações",
        "Última Atualização", "Atualizado Por"
    ];

    const escapeCSV = (val: string) => `"${(val || "").replace(/"/g, '""')}"`;

    const rows = tenders.map(t => {
        const checks = dateChecks[t.id] || (t.dates as any)?._date_checks || {};
        return [
            t.number,
            t.uasg,
            t.nup || "",
            escapeCSV(t.description),
            t.status,
            t.currentStage,
            t.commitment || "",
            t.coordinator || "",
            t.requesterSector || "",
            // Prazo CJU
            t.dates?.cjuSendDeadline || "",
            chk(checks["cjuSendDeadline"]),
            // Retorno CJU
            t.dates?.cjuReturnDate || "",
            chk(checks["cjuReturnDate"]),
            // Prazo Ajustes Pub
            t.dates?.publicationAdjustmentsDeadline || "",
            chk(checks["publicationAdjustmentsDeadline"]),
            // Data Pub
            t.dates?.publicationDate || "",
            chk(checks["publicationDate"]),
            // Abertura/Julgamento
            t.dates?.proposalOpeningDate || "",
            chk(checks["proposalOpeningDate"]),
            // Prev Homologação
            t.dates?.homologationForecast || "",
            chk(checks["homologationForecast"]),
            // Prazo Homologação
            t.dates?.homologationDeadline || "",
            chk(checks["homologationDeadline"]),
            // Assinatura Atas
            t.dates?.minutesSignatureDeadline || "",
            chk(checks["minutesSignatureDeadline"]),
            // Outros
            t.dates?.vigenciaAnterior || "",
            t.dates?.prazoGCALC || "",
            t.pregoeiroFaseInternaId || "",
            t.pregoeiroFaseExternaId || "",
            escapeCSV(t.quickNotes || ""),
            escapeCSV((t.observations || []).map(obs => `[${obs.date}] ${obs.author}: ${obs.content}`).join(" | ")),
            t.lastUpdatedAt || "",
            t.lastUpdatedBy || ""
        ];
    });

    const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `radar_backup_completo_${now.getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export async function parseCSVToTenders(csvText: string): Promise<Partial<Tender>[]> {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));

    const results: Partial<Tender>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(\".*?\"|[^\",\s]+)(?=\s*,|\s*$)/g) || [];
        const cleanValues = values.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').replace(/\r/g, ''));

        const row: any = {};
        headers.forEach((header, index) => {
            row[header] = cleanValues[index];
        });

        const getValue = (key: string) => row[key];

        const tender: Partial<Tender> = {
            number: getValue("Número"),
            uasg: getValue("UASG"),
            nup: getValue("NUP"),
            description: getValue("Objeto") || getValue("Descrição"),
            status: (getValue("Status") || "FASE INTERNA NA OMDS") as TenderStatus,
            currentStage: (getValue("Fase Atual") || "1. Entrada do TR na SAL") as TenderStage,
            commitment: getValue("Compromisso") as any,
            coordinator: getValue("Coordenador") as any,
            requesterSector: getValue("Setor Requisitante") as any,
            dates: {
                cjuSendDeadline: getValue("Prazo CJU"),
                cjuReturnDate: getValue("Retorno CJU"),
                publicationAdjustmentsDeadline: getValue("Prazo Ajustes Pub"),
                publicationDate: getValue("Data Pub"),
                proposalOpeningDate: getValue("Abertura/Julgamento"),
                homologationForecast: getValue("Prev Homologação"),
                homologationDeadline: getValue("Prazo Homologação"),
                minutesSignatureDeadline: getValue("Assinatura Atas"),
                vigenciaAnterior: getValue("Vigência Ant"),
                prazoGCALC: getValue("Prazo GCALC"),
            },
            quickNotes: getValue("Notas Rápidas"),
            lastUpdatedAt: getValue("Última Atualização"),
            lastUpdatedBy: getValue("Atualizado Por"),
            observations: getValue("Observações") ? getValue("Observações").split(" | ").filter((obs: string) => obs.trim() !== "").map((obs: string, index: number) => {
                const match = obs.match(/\[(.*?)\] (.*?): (.*)/);
                if (match) {
                    return { id: `imported-obs-${Date.now()}-${index}`, date: match[1], author: match[2], content: match[3] };
                }
                return { id: `imported-obs-raw-${Date.now()}-${index}`, date: new Date().toISOString().split('T')[0], author: "Backup", content: obs };
            }) : []
        };

        if (tender.number && tender.number !== "undefined") {
            results.push(tender);
        }
    }

    return results;
}
