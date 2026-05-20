const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../import/data.csv');
const outputPath = path.join(__dirname, '../src/lib/data.ts');

const content = fs.readFileSync(csvPath, 'utf8');

function splitCSV(content) {
    const lines = content.split(/\r?\n/);
    const result = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // HEURÍSTICA: Se a linha começa com um padrão de pregão, força o fechamento da linha anterior
        // Padrões: 900012/2025, 001/2025, A definir, - (seguido de vírgula)
        const isNewTender = /^\d{3,6}\/202\d/.test(line) || /^A definir/.test(line) || /^-[, ]/.test(line);

        if (isNewTender && i > 0 && !inQuotes) {
            // Se já tínhamos uma célula sendo formada, fecha ela e a linha
            // (Mas aqui o split por \n já quebrou, então precisamos ver se a linha anterior estava "aberta")
        }

        // Se a linha anterior terminou com aspas abertas, o split por \n pode ter quebrado o campo.
        // Mas se a NOVA linha parece um pregão, as aspas anteriores provavelmente estavam mal formadas.
        if (isNewTender && inQuotes) {
            inQuotes = false;
            // Se inQuotes mudou forçadamente, a currentRow anterior estava incompleta ou terminada
            if (currentRow.length > 0) {
                result.push(currentRow);
                currentRow = [];
            }
        }

        // Processamento simples por vírgula e aspas na linha
        let chars = line.split('');
        for (let j = 0; j < chars.length; j++) {
            const char = chars[j];
            if (char === '"') {
                if (inQuotes && chars[j + 1] === '"') {
                    currentCell += '"';
                    j++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else {
                currentCell += char;
            }
        }

        if (!inQuotes) {
            currentRow.push(currentCell.trim());
            if (currentRow.length > 0) result.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            // Se ainda está em aspas, adiciona a quebra de linha que o split removeu
            currentCell += '\n';
        }
    }
    return result;
}

function parseDate(dateStr) {
    if (!dateStr) return undefined;
    const clean = dateStr.replace(/✔️|ERA|-|🆕.*|\n/g, '').trim();
    if (!clean) return undefined;

    // Catch common patterns
    const match = clean.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
        let [_, d, m, y] = match;
        if (y.length === 2) y = '20' + y;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return undefined;
}

const rows = splitCSV(content);
const dataRows = rows.slice(3); // Skip header rows

const tenders = dataRows.map((row, idx) => {
    const number = row[0];
    const description = row[1];

    // Ignore rows that are clearly not tenders (too short or empty description)
    if (!description || description.length < 5) {
        return null;
    }

    // Skip header-like rows or empty rows
    if (description.includes('CONTROLE DE LICITAÇÕES') || description.includes('Objeto')) {
        return null;
    }

    const uasg = "122456";
    const isGCALC = (row[2] || '').toLowerCase().includes('sim');
    const coord = row[3];
    const department = row[4];
    const nup = row[10] || ''; // Ajustado conforme análise visual da planilha (Col K - 10) - Espera-se que seja o NUP se presente em alguma coluna

    // Mapeamento de Datas (Colunas do CSV baseadas na linha 3)
    const dates = {
        protocoloSetorRequisitante: {
            defined: parseDate(row[5]),
            executed: parseDate(row[6])
        },
        cjuSendDeadline: parseDate(row[8]),
        cjuReturnDate: parseDate(row[9]),
        publicationAdjustmentsDeadline: parseDate(row[10]),
        publicationDate: parseDate(row[11]),
        proposalOpeningDate: parseDate(row[12]),
        homologationForecast: parseDate(row[15]),
        homologationDeadline: parseDate(row[16]),
        minutesSignatureDeadline: parseDate(row[17]),
        vigenciaAnterior: parseDate(row[18]),
        prazoGCALC: parseDate(row[20]) // Verificando coluna 20 na linha 3
    };

    const openingDateStr = row[12];
    const openingDate = parseDate(openingDateStr) || '2026-01-01';

    const obs = row[14] || '';

    // Status mapping more robust
    let status = 'active';
    if (obs.includes('Homologado') || obs.includes('Concluído')) status = 'completed';
    else if (obs.includes('Suspenso') || obs.includes('Cancelado') || obs.includes('Abandonado')) status = 'suspended';

    // Stage mapping based on obs and other hints
    let currentStage = 'Edital Publicado';
    if (row[27]) currentStage = row[27]; // Use a última coluna se preenchida
    else if (obs.includes('Homologação')) currentStage = 'Homologação';
    else if (obs.includes('Habilitação')) currentStage = 'Habilitação';
    else if (obs.includes('Julgamento')) currentStage = 'Julgamento';
    else if (obs.includes('Disputa') || obs.includes('Seção')) currentStage = 'Disputa';

    const responsibleInternal = row[21];
    const responsibleExternal = row[22];
    const biPublication = row[23];
    const intercurrences = row[24];
    const optimizationNotes = row[25];
    const nextDeadline = row[26];
    const nextActivity = row[27];

    return {
        id: `tender-${(number || 'TBD').replace(/[\/\s\.]/g, '-')}-${idx}`,
        uasg,
        number: number || "A definir",
        description,
        department,
        openingDate: `${openingDate}T09:00:00`,
        status,
        currentStage,
        hasIssues: obs.includes('!') || obs.toLowerCase().includes('problema') || obs.toLowerCase().includes('atraso') || obs.includes('🆕'),
        isGCALC,
        coord,
        coordinator: coord, // Adicionando campo coordinator se esperado
        nup,
        dates,
        responsibleInternal,
        responsibleExternal,
        biPublication,
        intercurrences,
        optimizationNotes,
        nextDeadline,
        nextActivity,
        updates: [],
        observations: []
    };
}).filter(t => t !== null);

const tsContent = `import { Tender } from "@/types";

export const tenders: Tender[] = ${JSON.stringify(tenders, null, 4)};
`;

fs.writeFileSync(outputPath, tsContent);
console.log(`Successfully wrote ${tenders.length} tenders to ${outputPath}`);
