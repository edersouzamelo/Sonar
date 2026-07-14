import type { AssetType, PresentationChart, PresentationTable, ProcessingStatus } from "@/lib/presentations/types";

export const allowedPresentationExtensions = new Set(["xlsx", "xls", "csv", "pdf", "docx", "pptx", "png", "jpg", "jpeg"]);

export function extensionFromFileName(fileName: string) {
    return fileName.split(".").pop()?.trim().toLowerCase() || "";
}

export function sanitizeUploadedFileName(fileName: string) {
    return fileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w.\-]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 120) || "arquivo";
}

export function assetTypeFromFile(fileName: string): AssetType {
    const extension = extensionFromFileName(fileName);
    if (["csv", "xlsx", "xls"].includes(extension)) return "dados";
    if (["png", "jpg", "jpeg"].includes(extension)) return "imagem";
    if (extension === "pptx") return "modelo";
    if (["pdf", "docx"].includes(extension)) return "documento";
    return "outro";
}

function splitCsvLine(line: string) {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];
        if (char === '"' && quoted && next === '"') {
            current += '"';
            index += 1;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === "," && !quoted) {
            cells.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    cells.push(current.trim());
    return cells.map(value => (/^[=+\-@]/.test(value) ? `'${value}` : value));
}

export function parseCsvPreview(text: string) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    const columns = splitCsvLine(lines[0] || "");
    const rows = lines.slice(1, 26).map(splitCsvLine);
    const numericColumns = columns.filter((_, columnIndex) =>
        rows.length > 0 && rows.every(row => Number.isFinite(Number(String(row[columnIndex] || "").replace("%", "").replace(",", "."))))
    );
    return { columns, rows, sheetName: "CSV", numericColumns };
}

export function processPresentationFile(fileName: string, mimeType: string, textContent: string): {
    processingStatus: ProcessingStatus;
    processedAt: string;
    extractedText?: string;
    parsedPreview?: ReturnType<typeof parseCsvPreview>;
    errorMessage?: string;
} {
    const extension = extensionFromFileName(fileName);
    const processedAt = new Date().toISOString();
    if (!allowedPresentationExtensions.has(extension)) {
        return { processingStatus: "erro", processedAt, errorMessage: "Formato nao permitido para apresentacoes." };
    }
    if (extension === "csv") {
        try {
            return {
                processingStatus: "processado",
                processedAt,
                extractedText: textContent.slice(0, 12000),
                parsedPreview: parseCsvPreview(textContent),
            };
        } catch (error) {
            return {
                processingStatus: "erro",
                processedAt,
                extractedText: textContent.slice(0, 12000),
                errorMessage: error instanceof Error ? error.message : "Nao foi possivel ler o CSV.",
            };
        }
    }
    if (extension === "xlsx" || extension === "xls") {
        return {
            processingStatus: "pendente",
            processedAt,
            errorMessage: "Arquivo armazenado. Leitura nativa de XLS/XLSX fica preparada para biblioteca dedicada.",
        };
    }
    if (extension === "pdf" || extension === "docx") {
        return {
            processingStatus: "armazenado",
            processedAt,
            extractedText: mimeType.startsWith("text/") ? textContent.slice(0, 12000) : undefined,
            errorMessage: "Arquivo armazenado. Qualquer dado extraido deve ser confirmado pelo usuario antes de virar slide.",
        };
    }
    return { processingStatus: "armazenado", processedAt };
}

export function tableFromPreview(columns: string[], rows: string[][], fileName: string, actorId: string): PresentationTable {
    const totals: Record<string, string> = {};
    columns.forEach((column, index) => {
        const values = rows
            .map(row => Number(String(row[index] || "").replace("%", "").replace(",", ".")))
            .filter(value => Number.isFinite(value));
        if (values.length === rows.length && values.length > 0) {
            totals[column] = values.reduce((sum, value) => sum + value, 0).toLocaleString("pt-BR");
        }
    });
    return {
        columns,
        rows,
        totals,
        provenance: {
            origin: "importado",
            sourceLabel: "Arquivo de apoio importado pelo usuario",
            fileName,
            sheetName: "CSV",
            columns,
            importedAt: new Date().toISOString(),
            confirmedBy: actorId,
            note: "Tabela gerada por codigo a partir das colunas selecionadas.",
        },
    };
}

export function chartFromPreview(columns: string[], rows: string[][], fileName: string, actorId: string): PresentationChart {
    const numericIndex = columns.findIndex((_, index) =>
        rows.some(row => Number.isFinite(Number(String(row[index] || "").replace("%", "").replace(",", "."))))
    );
    const data = rows.slice(0, 8).map((row, index) => {
        const value = Number(String(row[numericIndex] || "0").replace("%", "").replace(",", "."));
        return { label: row[0] || `Linha ${index + 1}`, value: Number.isFinite(value) ? value : 0 };
    });
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return {
        chartType: "barras",
        data: data.map(item => ({ ...item, percent: total > 0 ? Math.round((item.value / total) * 100) : 0 })),
        provenance: {
            origin: "calculado",
            sourceLabel: "Grafico gerado por codigo a partir de arquivo importado",
            fileName,
            sheetName: "CSV",
            columns,
            importedAt: new Date().toISOString(),
            calculatedAt: new Date().toISOString(),
            confirmedBy: actorId,
            note: "Percentuais calculados sem inferencia de IA.",
        },
    };
}
