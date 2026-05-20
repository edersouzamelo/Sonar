const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Função simples para carregar .env.local manualmente sem depender de dotenv
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Credenciais do Supabase não encontradas no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const inputFile = 'import/restauracao_google_sheet.csv';

const parseCSVLine = (line) => {
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

const mapStatus = (s) => {
    if (!s) return 'FASE INTERNA NA OMDS';
    const status = s.trim().toUpperCase();
    if (status.includes('HOMOLOGADO')) return 'HOMOLOGADO';
    if (status.includes('CANCELADO')) return 'ABANDONADO';
    if (status.includes('EDITAL PUBLICADO')) return 'FASE EXTERNA - EDITAL PUBLICADO';
    if (status.includes('ABERTURA E JULGAMENTO')) return 'FASE EXTERNA - ABERTURA E JULGAMENTO DAS PROPOSTAS';
    if (status.includes('LANCES')) return 'FASE EXTERNA - LANCES';
    if (status.includes('RECURSOS')) return 'FASE EXTERNA - RECURSOS E JULGAMENTO DE ADMISSIBILIDADE';
    if (status.includes('PARCIALMENTE')) return 'FASE EXTERNA - PARCIALMENTE HOMOLOGADO';
    if (status.includes('CJU')) return 'FASE INTERNA NA CJU';
    if (status.includes('SAL')) return 'FASE INTERNA NA SAL';
    if (status.includes('OMDS')) return 'FASE INTERNA NA OMDS';
    if (status.includes('IRP')) return 'FASE INTERNA - IRP';
    if (status.includes('CORREÇÕES')) return 'FASE INTERNA - CORREÇÕES PARA PUBLICAÇÃO';
    return s.trim(); // Se não bater, envia o original
};

async function runImport() {
    console.log('🚀 Iniciando Injeção Nuclear de Dados (Planilha Google -> Supabase)...');

    if (!fs.existsSync(inputFile)) {
        console.error(`❌ Erro: Arquivo ${inputFile} não encontrado.`);
        return;
    }

    const csvContent = fs.readFileSync(inputFile, 'utf-8');
    const lines = csvContent.split('\n').filter(l => l.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));

    const tenders = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => row[h] = values[idx]);

        if (!row['Número']) continue;

        // Use o ID da planilha ou gera um estável baseado no número
        const tenderId = row['ID'] && row['ID'].startsWith('tender-')
            ? row['ID']
            : `tender-${row['Número'].replace(/\//g, '-')}`;

        // Mapeamento Core de Datas - Recuperação de Dados
        const tenderDates = {
            cjuSendDeadline: row['SAL (Prazo)'],
            cjuReturnDate: row['Regresso CJU'],
            publicationAdjustmentsDeadline: row['Publicação (Prazo)'],
            publicationDate: row['Publicação (Efetiva)'],
            proposalOpeningDate: row['Sessão Pública'],
            homologationForecast: row['Homologação (Prev)'],
            homologationDeadline: row['Homologação (Prazo)'],
            vigenciaAnterior: row['Vigência Anterior'] || row['Vigência Ant'],
            prazoGCALC: row['Prazo GCALC']
        };

        // Geração de Date Checks - Se na planilha está "OK", marcamos como true no sistema
        const dateChecks = {};
        if (row['SAL (OK)'] === 'OK') dateChecks['cjuSendDeadline'] = true;
        if (row['Publicação (OK)'] === 'OK') dateChecks['publicationDate'] = true;
        if (row['Sessão Pública (OK)'] === 'OK') dateChecks['proposalOpeningDate'] = true;
        if (row['Homologação (OK)'] === 'OK') dateChecks['homologationDeadline'] = true;

        // CORREÇÃO NUCLEAR: Se a coluna date_checks não existir, injetamos DENTRO do objeto dates
        // para garantir que nada se perca na nuvem.
        const tender = {
            id: tenderId,
            uasg: row['UASG'] || '160136',
            number: row['Número'],
            nup: row['NUP'] || '',
            description: row['Descrição'] || row['Objeto'] || '',
            status: mapStatus(row['Status']),
            current_stage: row['Fase Atual'] || '1. Entrada do TR na SAL',
            commitment: row['Compromisso'] || 'PCA da OM',
            coordinator: row['Coordenador'] || 'CAF',
            requester_sector: row['Setor Requisitante'] || 'A definir',
            quick_notes: row['Quick Notes'] || '',
            last_updated_by: row['Atualizado Por'] || 'Resgate Nuclear 1h Manhã',
            has_issues: false,
            verification_status: row['Conferência Geral'] === 'OK' ? 'OK' : 'Pendente',
            dates: {
                ...tenderDates,
                _audit_trail_checks: dateChecks // Backup de segurança dentro do blob dates
            },
            // date_checks: dateChecks, // Removido temporariamente para evitar erro PGRST204
            observations: [],
            updates: []
        };

        tenders.push(tender);
    }

    console.log(`📦 Preparados ${tenders.length} processos para UPSERT.`);

    const { data, error } = await supabase
        .from('tenders')
        .upsert(tenders, { onConflict: 'id' });

    if (error) {
        console.error('❌ Erro no Upsert do Supabase:', error);
    } else {
        console.log('✅ Sincronização Nuclear concluída com sucesso!');
        console.log('🌟 Seus dados agora estão na nuvem. Basta atualizar o Radar no navegador.');
    }
}

runImport();
