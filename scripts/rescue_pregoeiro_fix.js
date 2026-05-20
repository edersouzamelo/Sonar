const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const rescueData = [
    { num: '90012/2025', status: 'HOMOLOGADO', comp: 'GCALC', coord: 'CCOL', req: '9º B Sup', dates: { cjuSendDeadline: '15/06/2025', publicationDate: '04/06/2025' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' },
    { num: '90013/2025', status: 'FASE INTERNA NA OMDS', comp: 'GCALC', coord: 'CAF', req: '18º B Trnp', dates: { cjuSendDeadline: '29/05/2025', publicationDate: '29/05/2025' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' },
    { num: '90014/2025', status: 'FASE EXTERNA - EDITAL PUBLICADO', comp: 'GCALC', coord: 'CCOL', req: '9º B Mnt', dates: { cjuSendDeadline: '28/05/2025', publicationDate: '23/05/2025' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' },
    { num: '90017/2025', status: 'FASE INTERNA NA OMDS', comp: 'GCALC', coord: 'CAF', req: '18º B Trnp', dates: { cjuSendDeadline: '05/06/2025', publicationDate: '11/07/2025' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' },
    { num: '90023/2025', status: 'FASE INTERNA NA OMDS', comp: 'GCALC', coord: 'CAF', req: '18º B Trnp', dates: { cjuSendDeadline: '25/08/2025', publicationDate: '09/09/2025' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' },
    { num: '90018/2025', status: 'FASE INTERNA NA OMDS', comp: 'PCA da OM', coord: 'CCOL', req: '9º B Trnp', dates: { cjuSendDeadline: '18/08/2025', publicationDate: '14/08/2025' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' },
    { num: '90021/2025', status: 'FASE INTERNA NA OMDS', comp: 'GCALC', coord: 'CCOL', req: '9º B Sup', dates: { cjuSendDeadline: '15/08/2025', publicationDate: '21/08/2025' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' },
    { num: '90001/2026', status: 'FASE INTERNA NA OMDS', comp: 'GCALC', coord: 'CAF', req: 'Cmdo 9º Gpt', dates: { cjuSendDeadline: '23/12/2025', publicationDate: '05/01/2026', cjuReturnDate: '28/02/2026' }, checks: { cjuSendDeadline: true, publicationDate: true, cjuReturnDate: true }, conf: 'OK' },
    { num: '001/2025', status: 'FASE INTERNA NA OMDS', comp: 'PCA da OM', coord: 'CAF', req: '9º B Mnt', dates: { cjuSendDeadline: '21/07/2025', publicationDate: '25/07/2025' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' },
    { num: '002/2025', status: 'FASE INTERNA NA OMDS', comp: 'PCA da OM', coord: 'CCOL', req: '9º B Mnt', dates: { cjuSendDeadline: '21/07/2025', publicationDate: '25/07/2025' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' },
    { num: '65345.000650/2025-61', status: 'FASE INTERNA NA OMDS', comp: 'PCA da OM', coord: 'CCOL', req: '9º B Mnt', dates: { cjuSendDeadline: '28/02/2026', publicationDate: '07/03/2025' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' },
    { num: '90003/2026', status: 'FASE INTERNA NA OMDS', comp: 'PCA da OM', coord: 'CCOL', req: '9º B Mnt', dates: { cjuSendDeadline: '30/04/2025', publicationDate: '20/02/2026' }, checks: { cjuSendDeadline: true, publicationDate: true }, conf: 'OK' }
];

async function runRescue() {
    console.log('🚑 Iniciando Resgate FINAL (Status + Datas + Checks)...');
    const { data: currentTenders } = await supabase.from('tenders').select('id, number, nup');

    for (const item of rescueData) {
        const match = currentTenders.find(t => t.number === item.num || (t.nup && t.nup.includes(item.num)));

        if (match) {
            console.log(`✅ Aplicando resgate ao item: ${item.num}`);

            const { error } = await supabase.from('tenders').update({
                status: item.status,
                commitment: item.comp,
                coordinator: item.coord,
                requester_sector: item.req,
                dates: {
                    ...item.dates,
                    _audit_trail_checks: item.checks
                },
                verification_status: item.conf,
                last_updated_by: 'IA CORRIGIDA - Resgate via Print'
            }).eq('id', match.id);

            if (error) console.error(`❌ Erro ao resgatar ${item.num}:`, error);
        } else {
            console.log(`⚠️ Não encontrei o item ${item.num} no banco.`);
        }
    }
    console.log('🏁 Resgate Total V1.2 Finalizado.');
}

runRescue();
