import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://llkdzgduchmp.supabase.co',
    'ey...' // Will use env var logic from dotenv
);

async function check() {
    const { data, error, count } = await supabase
        .from('tender_document_chunks')
        .select('id, tender_id, file_id', { count: 'exact' });

    console.log("Error:", error);
    console.log("Count:", count);
    console.log("Data sample:", data?.slice(0, 5));
}
check();
