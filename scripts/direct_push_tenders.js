const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load Credentials
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase credentials missing!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Extract Data from src/lib/data.ts
const dataFilePath = path.join(__dirname, '..', 'src', 'lib', 'data.ts');
const dataContent = fs.readFileSync(dataFilePath, 'utf-8');

const tendersMatch = dataContent.match(/export const tenders: Tender\[\] = (\[[\s\S]*?\]);/);
if (!tendersMatch) {
    console.error('❌ Error: Could not find tenders array in src/lib/data.ts');
    process.exit(1);
}

// Convert TypeScript array string to JSON
// Note: This is an approximation, but works for the current object structure
let tendersStr = tendersMatch[1]
    .replace(/\/\/.*$/gm, '') // remove comments
    .replace(/,\s*]/g, ']') // remove trailing commas
    .replace(/,\s*}/g, '}');

let tenders;
try {
    // Eval is risky but necessary for TS-to-JS object parsing if the structure is complex
    // Here we wrap in a function to avoid global namespace issues
    tenders = eval(`(${tendersStr})`);
} catch (e) {
    console.error('❌ Error parsing tenders array:', e);
    process.exit(1);
}
console.log(`📦 Loaded ${tenders.length} tenders from local data.`);

// 3. Map and Push with MERGE LOGIC
async function pushWithMerge() {
    console.log('🚀 Starting Unified Cloud Sync (Direct to Supabase with Protection)...');

    // Fetch current data to preserve quick_notes and verification_status
    const { data: currentTenders } = await supabase.from('tenders').select('id, quick_notes, verification_status, dates, assigned_pregoeiro_id, pregoeiro_fase_interna_id, pregoeiro_fase_externa_id');
    const existingMap = new Map(currentTenders?.map(t => [t.id, t]) || []);

    const uploads = tenders.map(t => {
        const existing = existingMap.get(t.id);

        return {
            id: t.id,
            uasg: t.uasg,
            number: t.number,
            nup: t.nup || '',
            description: t.description,
            department: t.department,
            opening_date: t.openingDate,
            estimated_value: t.estimatedValue || 0,
            status: t.status,
            current_stage: t.currentStage,
            has_issues: t.hasIssues || false,
            is_gcalc: t.isGCALC || false,
            commitment: t.commitment || 'PCA da OM',
            requester_sector: t.requesterSector || t.department,
            coordinator: t.coordinator || 'CAF',
            coord: t.coord || '',
            section: t.section || '',
            responsible_internal: t.responsibleInternal || '',
            responsible_external: t.responsibleExternal || '',
            bi_publication: t.biPublication || '',
            optimization_notes: t.optimizationNotes || '',
            next_deadline: t.nextDeadline || '',
            next_activity: t.nextActivity || '',
            intercurrences: t.intercurrences || '',
            last_updated_by: t.lastUpdatedBy || 'Auto-Sync Merge Engine',
            // --- PROTECTED FIELDS (MERGE LOGIC) ---
            quick_notes: (existing && existing.quick_notes) ? existing.quick_notes : (t.quickNotes || ''),
            verification_status: (existing && existing.verification_status && existing.verification_status !== 'Pendente') ? existing.verification_status : (t.verificationStatus || 'Pendente'),
            assigned_pregoeiro_id: (existing && existing.assigned_pregoeiro_id) ? existing.assigned_pregoeiro_id : (t.assignedPregoeiroId || null),
            pregoeiro_fase_interna_id: (existing && existing.pregoeiro_fase_interna_id) ? existing.pregoeiro_fase_interna_id : (t.pregoeiroFaseInternaId || null),
            pregoeiro_fase_externa_id: (existing && existing.pregoeiro_fase_externa_id) ? existing.pregoeiro_fase_externa_id : (t.pregoeiroFaseExternaId || null),
            // Merge dates checks
            dates: {
                ...(t.dates || {}),
                _date_checks: {
                    ...(existing?.dates?._date_checks || {}),
                    ...(t.dates?._date_checks || {})
                }
            },
            updates: t.updates || [],
            observations: t.observations || []
        };
    });

    // Split into chunks of 20
    const chunkSize = 20;
    for (let i = 0; i < uploads.length; i += chunkSize) {
        const chunk = uploads.slice(i, i + chunkSize);
        console.log(`📡 Pushing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(uploads.length / chunkSize)}...`);

        const { error } = await supabase
            .from('tenders')
            .upsert(chunk, { onConflict: 'id' });

        if (error) {
            console.error(`❌ Error in chunk ${i / chunkSize}:`, error);
        }
    }

    console.log('✅ Synchronized! Tenders data is now unified and protected.');
}

pushWithMerge();
