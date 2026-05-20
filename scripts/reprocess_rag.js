const { createClient } = require('@supabase/supabase-js');

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

function chunkText(text) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + CHUNK_SIZE));
        i += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks;
}

async function getEmbeddingsBatch(texts) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.SONAR_OPENAI_API_KEY || process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            input: texts.map(t => t.replace(/\n/g, ' ')),
            model: 'text-embedding-ada-002'
        })
    });

    if (!response.ok) {
        let errText = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} - ${errText}`);
    }

    const result = await response.json();
    return result.data.map(item => item.embedding);
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function reprocessAllFiles() {
    console.log("Starting bulk reprocessing of existing files via localhost API...");

    // 1. Get all files
    const { data: files, error: filesError } = await supabase
        .from('tender_files')
        .select('*');

    if (filesError) {
        console.error("Error fetching files:", filesError);
        return;
    }

    console.log(`Found ${files.length} files to process.`);

    for (const file of files) {
        console.log(`Processing ${file.file_name} (${file.id})...`);
        try {
            // Check if already processed
            const { count } = await supabase
                .from('tender_document_chunks')
                .select('*', { count: 'exact', head: true })
                .eq('file_id', file.id);

            if (count > 0) {
                console.log(`  -> Already processed. Skipping.`);
                continue;
            }

            // Call the local API built for this exact purpose
            const reqUrl = process.env.SONAR_RAG_PROCESS_URL || 'http://localhost:3000/api/rag/process';

            const response = await fetch(reqUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileUrl: file.file_url,
                    tenderId: file.tender_id,
                    fileId: file.id,
                    fileName: file.file_name
                })
            });

            const jsonRes = await response.json();

            if (!response.ok) {
                throw new Error(jsonRes.error || response.statusText);
            }

            console.log(`  -> Successfully processed via API: ${jsonRes.chunksProcessed} chunks.`);

        } catch (err) {
            console.error(`  -> ERROR processing ${file.file_name}:`, err.message);
        }
    }

    console.log("Reprocessing complete!");
}

reprocessAllFiles();
