import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { inflateSync } from 'node:zlib';

export const dynamic = 'force-dynamic';

if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const BUCKET = 'legal-documents';
const openAiApiKey = process.env.SONAR_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
type AIDeadline = { due_date: string; title?: string };
type AIMetadata = {
    document_type?: string;
    document_number?: string;
    issuing_body?: string;
    subject?: string;
    effective_date?: string;
    tags?: string[];
};

const getResponseOutputText = (payload: any): string => {
    if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
        return payload.output_text.trim();
    }

    const segments: string[] = [];
    const output = Array.isArray(payload?.output) ? payload.output : [];
    for (const item of output) {
        const content = Array.isArray(item?.content) ? item.content : [];
        for (const part of content) {
            if (typeof part?.text === 'string' && part.text.trim()) segments.push(part.text.trim());
            if (typeof part?.output_text === 'string' && part.output_text.trim()) segments.push(part.output_text.trim());
        }
    }
    return segments.join('\n').trim();
};

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) throw new Error('Supabase admin credentials not configured.');
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
};

const getUserClient = (token: string) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anonKey) throw new Error('Supabase public credentials not configured.');
    return createClient(url, anonKey, {
        accessToken: async () => token,
        auth: { autoRefreshToken: false, persistSession: false },
    });
};

const getBearerToken = (req: NextRequest) => {
    const authHeader = req.headers.get('authorization') || '';
    return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
};

const requireUser = async (req: NextRequest, admin = getAdminClient()) => {
    const token = getBearerToken(req);
    if (!token) throw new Error('Sessao ausente.');

    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user?.email) throw new Error('Sessao invalida.');
    return data.user;
};

const sanitizeFileName = (name: string) =>
    name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 140) || 'norma-legislacao';

const canReadAsText = (fileName: string, mimeType: string) =>
    mimeType.startsWith('text/') || /\.(txt|md|csv|json|html|xml)$/i.test(fileName);

const looksLikePdf = (fileName: string, mimeType: string) =>
    mimeType === 'application/pdf' || /\.pdf$/i.test(fileName);

const decodePdfEscapes = (input: string) =>
    input
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');

const collectPdfTextChunks = (raw: string) => {
    const chunks: string[] = [];
    const literalText = /\((?:\\.|[^\\)])*\)\s*Tj/g;
    const arrayText = /\[(.*?)\]\s*TJ/g;
    const hexText = /<([0-9A-Fa-f\s]+)>\s*Tj/g;

    for (const match of raw.matchAll(literalText)) {
        const token = match[0];
        const start = token.indexOf('(');
        const end = token.lastIndexOf(')');
        if (start >= 0 && end > start) {
            chunks.push(decodePdfEscapes(token.slice(start + 1, end)));
        }
    }

    for (const match of raw.matchAll(arrayText)) {
        const arr = match[1];
        const parts = Array.from(arr.matchAll(/\((?:\\.|[^\\)])*\)/g)).map(item =>
            decodePdfEscapes(item[0].slice(1, -1))
        );
        if (parts.length > 0) chunks.push(parts.join(' '));
    }

    for (const match of raw.matchAll(hexText)) {
        const hex = match[1].replace(/\s+/g, '');
        if (hex.length < 2 || hex.length % 2 !== 0) continue;
        try {
            chunks.push(Buffer.from(hex, 'hex').toString('latin1'));
        } catch {
            // ignore malformed hex chunks
        }
    }

    return chunks;
};

const extractPdfLikeText = (buffer: Buffer) => {
    const chunks: string[] = [];
    const raw = buffer.toString('latin1');
    chunks.push(...collectPdfTextChunks(raw));

    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    for (const match of raw.matchAll(streamRegex)) {
        const streamBody = match[1];
        if (!streamBody) continue;
        try {
            const inflated = inflateSync(Buffer.from(streamBody, 'latin1')).toString('latin1');
            chunks.push(...collectPdfTextChunks(inflated));
        } catch {
            // non-deflated stream, ignore
        }
    }

    return chunks
        .join(' ')
        .replace(/\\([()\\])/g, '$1')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const extractText = (buffer: Buffer, fileName: string, mimeType: string) => {
    if (canReadAsText(fileName, mimeType)) return buffer.toString('utf-8');
    if (looksLikePdf(fileName, mimeType)) return extractPdfLikeText(buffer);
    return '';
};

const extractDeadlines = (text: string, sourceFile: string) => {
    const dates = new Set<string>();
    const ddmmyyyy = /\b([0-3]?\d)\/([01]?\d)\/(\d{2}|\d{4})\b/g;
    const ddmmyyyyHyphen = /\b([0-3]?\d)-([01]?\d)-(\d{2}|\d{4})\b/g;
    const yyyyMMdd = /\b(20\d{2})-([01]\d)-([0-3]\d)\b/g;
    const ddMonYYYY = /\b([0-3]?\d)\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\s+de\s+(20\d{2})\b/gi;
    const monthMap: Record<string, string> = {
        jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
        jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
    };

    const addDate = (year: string, month: string, day: string) => {
        const y = Number(year);
        const m = Number(month);
        const d = Number(day);
        if (y < 2000 || y > 2100) return;
        if (m < 1 || m > 12) return;
        if (d < 1 || d > 31) return;
        dates.add(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    };

    for (const match of text.matchAll(ddmmyyyy)) {
        addDate(match[3].length === 2 ? `20${match[3]}` : match[3], match[2], match[1]);
    }

    for (const match of text.matchAll(ddmmyyyyHyphen)) {
        addDate(match[3].length === 2 ? `20${match[3]}` : match[3], match[2], match[1]);
    }

    for (const match of text.matchAll(yyyyMMdd)) {
        addDate(match[1], match[2], match[3]);
    }

    for (const match of text.matchAll(ddMonYYYY)) {
        const month = monthMap[match[2].slice(0, 3).toLowerCase()];
        if (!month) continue;
        addDate(match[3], month, match[1]);
    }

    return Array.from(dates).sort().map(date => ({
        title: `Data relevante identificada em ${sourceFile}`,
        due_date: date,
        source_file: sourceFile,
    }));
};

const extractDeadlinesWithOpenAI = async (buffer: Buffer, fileName: string, mimeType: string): Promise<AIDeadline[]> => {
    if (!openAiApiKey) return [];
    if (buffer.length > 7 * 1024 * 1024) return [];

    try {
        const uploadForm = new FormData();
        uploadForm.append('purpose', 'assistants');
        const binary = Uint8Array.from(buffer);
        uploadForm.append('file', new Blob([binary], { type: mimeType || 'application/octet-stream' }), fileName);

        const fileUpload = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openAiApiKey}`,
            },
            body: uploadForm,
        });

        if (!fileUpload.ok) {
            const detail = await fileUpload.text();
            console.error('[LegalDocuments] OpenAI file upload failed:', fileUpload.status, detail);
            return [];
        }

        const fileJson = await fileUpload.json();
        const fileId = fileJson?.id;
        if (!fileId) {
            console.error('[LegalDocuments] OpenAI file upload missing id');
            return [];
        }

        const prompt = [
            'Extraia todas as datas explicitas relevantes no documento, como publicacao, vigencia, revogacao, prazo de adequacao ou prazo de cumprimento.',
            'Retorne SOMENTE JSON valido no formato: {"deadlines":[{"due_date":"YYYY-MM-DD","title":"texto curto"}]}.',
            'Nao invente datas. Se nao houver datas relevantes, retorne {"deadlines":[]}.',
        ].join(' ');

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openAiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                input: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'input_file',
                                file_id: fileId,
                            },
                            {
                                type: 'input_text',
                                text: prompt,
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) {
            const detail = await response.text();
            console.error('[LegalDocuments] OpenAI deadline extraction failed:', response.status, detail);
            return [];
        }
        const json = await response.json();
        const outputText = getResponseOutputText(json);
        const normalized = outputText
            .replace(/^```json/i, '')
            .replace(/^```/i, '')
            .replace(/```$/i, '')
            .trim();

        if (!normalized) {
            console.warn('[LegalDocuments] OpenAI returned empty output for deadline extraction');
            return [];
        }

        let deadlines: any[] = [];
        try {
            const parsed = JSON.parse(normalized);
            deadlines = Array.isArray(parsed?.deadlines) ? parsed.deadlines : [];
        } catch {
            const fallback = extractDeadlines(normalized, fileName);
            return fallback.map(item => ({ due_date: item.due_date, title: item.title }));
        }

        return deadlines
            .filter((item: any) => typeof item?.due_date === 'string')
            .map((item: any) => ({
                due_date: item.due_date,
                title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : 'Data relevante identificada no documento',
            }));
    } catch (error) {
        console.error('[LegalDocuments] OpenAI extraction error:', error);
        return [];
    }
};

const extractDocumentTextWithOpenAI = async (buffer: Buffer, fileName: string, mimeType: string): Promise<string> => {
    if (!openAiApiKey) return '';
    if (buffer.length > 7 * 1024 * 1024) return '';

    try {
        const uploadForm = new FormData();
        uploadForm.append('purpose', 'assistants');
        const binary = Uint8Array.from(buffer);
        uploadForm.append('file', new Blob([binary], { type: mimeType || 'application/octet-stream' }), fileName);

        const fileUpload = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openAiApiKey}` },
            body: uploadForm,
        });

        if (!fileUpload.ok) return '';
        const fileJson = await fileUpload.json();
        const fileId = fileJson?.id;
        if (!fileId) return '';

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openAiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                input: [
                    {
                        role: 'user',
                        content: [
                            { type: 'input_file', file_id: fileId },
                            {
                                type: 'input_text',
                                text: 'Extraia o texto util deste documento em portugues, preservando datas, prazos, nomes, numerdocumento e a sequencia ddocumento itens. Nao invente dados.',
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) return '';
        const json = await response.json();
        const content = getResponseOutputText(json);
        return content.slice(0, 15000);
    } catch {
        return '';
    }
};

const normalizeDate = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : value;
};

const inferMetadataFromFilename = (fileName: string): AIMetadata => {
    const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const typeMatch = baseName.match(/\b(lei|decreto|portaria|instrucao normativa|instrução normativa|manual|norma|resolucao|resolução)\b/i);
    const numberMatch = baseName.match(/\b(?:n[ºo.]?\s*)?(\d{1,6}(?:[./-]\d{2,4})?)\b/i);
    return {
        document_type: typeMatch?.[1] || null as any,
        document_number: numberMatch?.[1] || null as any,
        subject: baseName || null as any,
        tags: typeMatch?.[1] ? [typeMatch[1].toLowerCase()] : [],
    };
};

const inferLegalMetadataWithOpenAI = async (text: string, fileName: string): Promise<AIMetadata> => {
    const fallback = inferMetadataFromFilename(fileName);
    if (!openAiApiKey || text.trim().length < 80) return fallback;

    try {
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openAiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                input: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'input_text',
                                text: [
                                    'Analise o documento normativo abaixo e extraia metadados objetivos.',
                                    'Retorne SOMENTE JSON valido no formato:',
                                    '{"document_type":"Lei|Decreto|Portaria|Manual|Norma|Outro","document_number":"texto ou null","issuing_body":"texto ou null","subject":"texto curto","effective_date":"YYYY-MM-DD ou null","tags":["tag1","tag2"]}.',
                                    'Nao invente dados. Se nao houver certeza, use null. Tags devem ser curtas, em portugues, sem repetir.',
                                    `Nome do arquivo: ${fileName}`,
                                    `Texto extraido: ${text.slice(0, 12000)}`,
                                ].join('\n\n'),
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) return fallback;
        const json = await response.json();
        const outputText = getResponseOutputText(json)
            .replace(/^```json/i, '')
            .replace(/^```/i, '')
            .replace(/```$/i, '')
            .trim();
        const parsed = JSON.parse(outputText);
        const parsedTags: string[] = Array.isArray(parsed?.tags)
            ? Array.from(new Set<string>(
                parsed.tags
                    .filter((tag: any) => typeof tag === 'string')
                    .map((tag: string) => tag.trim().toLowerCase())
                    .filter(Boolean)
            )).slice(0, 8)
            : (fallback.tags || []);

        return {
            document_type: typeof parsed?.document_type === 'string' ? parsed.document_type.trim() : fallback.document_type,
            document_number: typeof parsed?.document_number === 'string' ? parsed.document_number.trim() : fallback.document_number,
            issuing_body: typeof parsed?.issuing_body === 'string' ? parsed.issuing_body.trim() : null as any,
            subject: typeof parsed?.subject === 'string' ? parsed.subject.trim() : fallback.subject,
            effective_date: normalizeDate(parsed?.effective_date) || null as any,
            tags: parsedTags,
        };
    } catch {
        return fallback;
    }
};

const ensureBucket = async (admin: ReturnType<typeof getAdminClient>) => {
    const { data } = await admin.storage.listBuckets();
    if (!data?.some(bucket => bucket.id === BUCKET)) {
        const { error } = await admin.storage.createBucket(BUCKET, { public: false });
        if (error && !error.message.toLowerCase().includes('already exists')) throw error;
    }
};

const cleanString = (value: FormDataEntryValue | null) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;

const mapDocument = async (storageClient: ReturnType<typeof getUserClient>, document: any) => {
    const signed = document.file_data_base64
        ? { signedUrl: `data:${document.file_data_mime || document.mime_type || 'application/octet-stream'};base64,${document.file_data_base64}` }
        : (await storageClient.storage.from(BUCKET).createSignedUrl(document.file_path, 3600)).data;
    const relevantDates = (document.legal_document_deadlines || []).map((deadline: any) => ({
        id: deadline.id,
        title: deadline.title,
        date: deadline.due_date,
        sourceFile: deadline.source_file,
        sourceDocumentId: deadline.legal_document_id,
    }));

    return {
        id: document.id,
        name: document.file_name,
        size: document.size_bytes,
        type: document.mime_type || 'arquivo',
        uploadedAt: document.uploaded_at,
        uploadedBy: document.uploaded_by,
        documentType: document.document_type || '',
        documentNumber: document.document_number || '',
        issuingBody: document.issuing_body || '',
        subject: document.subject || '',
        effectiveDate: document.effective_date || '',
        tags: Array.isArray(document.tags) ? document.tags : [],
        downloadUrl: signed?.signedUrl || '',
        relevantDates,
    };
};

export async function GET(req: NextRequest) {
    try {
        const admin = getAdminClient();
        const token = getBearerToken(req);
        await requireUser(req, admin);
        const userClient = getUserClient(token);

        const { data, error } = await userClient
            .from('legal_documents')
            .select('*, legal_document_deadlines(*)')
            .order('uploaded_at', { ascending: false });

        if (error) throw error;

        const documents = await Promise.all((data || []).map(document => mapDocument(userClient, document)));
        return NextResponse.json({ documents });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.message?.includes('Sessao') ? 401 : 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const admin = getAdminClient();
        const token = getBearerToken(req);
        const user = await requireUser(req, admin);
        const userClient = getUserClient(token);
        await ensureBucket(admin).catch(() => undefined);

        const formData = await req.formData();
        const file = formData.get('file');
        const existingId = String(formData.get('existingId') || '');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const safeName = sanitizeFileName(file.name);
        const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${safeName}`;

        if (existingId) {
            const { data: existing } = await userClient
                .from('legal_documents')
                .select('file_path')
                .eq('id', existingId)
                .maybeSingle();

            if (existing?.file_path) await userClient.storage.from(BUCKET).remove([existing.file_path]);
        }

        const { error: uploadError } = await userClient.storage
            .from(BUCKET)
            .upload(path, buffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: false,
            });

        const localExtractedText = extractText(buffer, file.name, file.type || '');
        const aiExtractedText = localExtractedText.length < 120
            ? await extractDocumentTextWithOpenAI(buffer, file.name, file.type || 'application/pdf')
            : '';
        const extractedText = (localExtractedText.trim() || aiExtractedText.trim()).slice(0, 20000);
        const inferredMetadata = await inferLegalMetadataWithOpenAI(extractedText, file.name);
        const incomingTags = String(formData.get('tags') || '')
            .split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(Boolean);
        const tags = Array.from(new Set(incomingTags.length ? incomingTags : (inferredMetadata.tags || []))).slice(0, 8);
        const documentPayload = {
            file_name: file.name,
            file_path: path,
            mime_type: file.type || 'application/octet-stream',
            size_bytes: file.size,
            uploaded_by: user.email!,
            uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            document_type: cleanString(formData.get('documentType')) || inferredMetadata.document_type || null,
            document_number: cleanString(formData.get('documentNumber')) || inferredMetadata.document_number || null,
            issuing_body: cleanString(formData.get('issuingBody')) || inferredMetadata.issuing_body || null,
            subject: cleanString(formData.get('subject')) || inferredMetadata.subject || null,
            effective_date: normalizeDate(cleanString(formData.get('effectiveDate')) || inferredMetadata.effective_date),
            tags,
            extracted_text: extractedText,
            file_data_base64: uploadError ? buffer.toString('base64') : null,
            file_data_mime: uploadError ? (file.type || 'application/octet-stream') : null,
        };

        const documentQuery = existingId
            ? userClient.from('legal_documents').update(documentPayload).eq('id', existingId).select('*, legal_document_deadlines(*)').single()
            : userClient.from('legal_documents').insert(documentPayload).select('*, legal_document_deadlines(*)').single();

        const { data: document, error: documentError } = await documentQuery;
        if (documentError) throw documentError;

        await userClient.from('legal_document_deadlines').delete().eq('legal_document_id', document.id);

        const aiDeadlines = await extractDeadlinesWithOpenAI(buffer, file.name, file.type || 'application/pdf');
        const deadlinesBase = aiDeadlines.length > 0
            ? aiDeadlines.map((item: AIDeadline) => ({
                title: `${item.title} (${file.name})`,
                due_date: item.due_date,
                source_file: file.name,
            }))
            : extractDeadlines(extractedText, file.name);

        const uniqueDeadlines = Array.from(
            new Map(deadlinesBase.map(deadline => [`${deadline.due_date}-${deadline.title}`, deadline])).values()
        );

        const deadlines = uniqueDeadlines.map(deadline => ({
            ...deadline,
            legal_document_id: document.id,
        }));

        if (deadlines.length > 0) {
            const { error: deadlineError } = await userClient.from('legal_document_deadlines').insert(deadlines);
            if (deadlineError) throw deadlineError;
        }

        console.log('[LegalDocuments] Extraction summary:', {
            file: file.name,
            extractedLength: extractedText.length,
            deadlinesCount: deadlines.length,
        });

        const { data: refreshed, error: refreshError } = await userClient
            .from('legal_documents')
            .select('*, legal_document_deadlines(*)')
            .eq('id', document.id)
            .single();

        if (refreshError) throw refreshError;

        return NextResponse.json({ document: await mapDocument(userClient, refreshed) });
    } catch (err: any) {
        console.error('[LegalDocuments] Upload error:', err);
        return NextResponse.json({ error: err.message }, { status: err.message?.includes('Sessao') ? 401 : 500 });
    }
}
