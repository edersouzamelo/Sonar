const fs = require('fs');
const https = require('https');

const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIEKAHj8ynUWVAERX7lo0aTIc7b0YnLcMtkr82bcIVNVt1O7phqCGnThKunYbUni383dPylBe6CG8T/pub?gid=2058179271&single=true&output=csv';
const outputFile = 'import/google_sheet_data.csv';

console.log('📥 Baixando dados da Planilha Google...');

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        if (!fs.existsSync('import')) fs.mkdirSync('import');
        fs.writeFileSync(outputFile, data);
        console.log(`✅ Dados salvos em ${outputFile}`);
        console.log('🚀 Agora vou processar esses dados para o formato do Radar...');
    });
}).on('error', (err) => {
    console.error('❌ Erro ao baixar a planilha:', err.message);
});
