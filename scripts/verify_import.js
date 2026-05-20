const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, count } = await supabase
        .from('tenders')
        .select('id, number, nup', { count: 'exact' });

    console.log(`📊 Total de processos no Cloud: ${count}`);
    if (data) {
        console.log('📝 Amostra de dados:');
        data.slice(0, 3).forEach(t => console.log(` - [${t.number}] NUP: ${t.nup || 'Vazio'}`));
    }
}

check();
