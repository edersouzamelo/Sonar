const fs = require('fs');

const inputFile = 'import/google_sheet_data.csv';
const outputFile = 'import/processed_tenders.json';

// Helper de mapeamento de status (Google Sheet -> Radar Type)
const mapStatus = (s) => {
    if (!s) return 'FASE INTERNA NA OMDS';
    const status = s.trim().toUpperCase();
    if (status.includes('HOMOLOGADO')) return 'HOMOLOGADO';
    if (status.includes('CANCELADO')) return 'ABANDONADO';
    if (status.includes('EXTERNA')) return 'FASE EXTERNA - EDITAL PUBLICADO';
    if (status.includes('CJU')) return 'FASE INTERNA NA CJU';
    return 'FASE INTERNA NA OMDS';
};

console.log('🔄 Processando CSV para o formato Radar...');

const csvContent = fs.readFileSync(inputFile, 'utf-8');
const lines = csvContent.split('\n').filter(l => l.trim() !== '');
const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));

const parseCSVLine = (line) => {
    // Regex melhorada para lidar com campos entre aspas que contém vírgulas e quebras de linha
    const result = [];
    let curVal = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(curVal.trim());
            curVal = "";
        } else {
            curVal += char;
        }
    }
    result.push(curVal.trim());
    return result.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').replace(/\r/g, ''));
};

const results = [];

for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => row[h] = values[idx]);

    if (!row['Número']) continue;

    const tender = {
        id: `tender-imported-${Date.now()}-${i}`,
        uasg: row['UASG'] || '160136',
        number: row['Número'],
        nup: row['NUP'] || '',
        description: row['Descrição'] || row['Objeto'] || 'Sem descrição',
        status: mapStatus(row['Status']),
        currentStage: row['Fase Atual'] || '1. Entrada do TR na SAL',
        hasIssues: false,
        department: row['Setor Requisitante'] || 'Não definido',
        openingDate: row['Sessão Pública'] || new Date().toISOString(),
        commitment: row['Compromisso'] || 'PCA da OM',
        coordinator: row['Coordenador'] || 'CAF',
        requesterSector: row['Setor Requisitante'] || '9º B Mnt',
        quickNotes: row['Quick Notes'] || '',
        dates: {
            cjuSendDeadline: row['SAL (Prazo)'],
            cjuReturnDate: row['Regresso CJU'],
            publicationAdjustmentsDeadline: row['Publicação (Prazo)'],
            publicationDate: row['Publicação (Efetiva)'],
            proposalOpeningDate: row['Sessão Pública'],
            homologationForecast: row['Homologação (Prev)'],
            homologationDeadline: row['Homologação (Prazo)'],
            vigenciaAnterior: row['Vigência Anterior'],
            prazoGCALC: row['Prazo GCALC']
        },
        updates: [],
        observations: []
    };

    results.push(tender);
}

fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
console.log(`✅ ${results.length} processos processados e salvos em ${outputFile}`);
console.log('\n💡 DICA: Use o novo botão "Restaurar via CSV" no Radar e selecione o arquivo import/google_sheet_data.csv para concluir a recuperação na tela!');
