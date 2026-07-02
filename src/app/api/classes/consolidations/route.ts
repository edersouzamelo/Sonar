import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { inflateSync } from 'node:zlib';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'class-consolidations';
const openAiApiKey = process.env.SONAR_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const SINGLE_FILE_OCR_TIMEOUT_MS = 22000;
const BATCH_FILE_OCR_TIMEOUT_MS = 9000;
const DEFAULT_COLUMNS = [
    "Demanda inicial",
    "Mapa de necessidades",
    "Documento de consolidação",
];

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) throw new Error('Supabase admin credentials not configured.');
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
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
        .slice(0, 140) || 'consolidacao';

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
        if (start >= 0 && end > start) chunks.push(decodePdfEscapes(token.slice(start + 1, end)));
    }

    for (const match of raw.matchAll(arrayText)) {
        const parts = Array.from(match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)).map(item =>
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

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
};

const hasUsefulExtractedText = (text: string) => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length < 120) return false;

    const letters = normalized.match(/[A-Za-zÀ-ÿ]/g)?.length || 0;
    const words = normalized.match(/[A-Za-zÀ-ÿ]{3,}/g)?.length || 0;
    return letters / normalized.length >= 0.45 && words >= 20;
};

const extractDocumentTextWithOpenAI = async (
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    timeoutMs = SINGLE_FILE_OCR_TIMEOUT_MS
): Promise<string> => {
    if (!openAiApiKey) return '';
    if (buffer.length > 7 * 1024 * 1024) return '';

    try {
        const uploadForm = new FormData();
        uploadForm.append('purpose', 'assistants');
        const binary = Uint8Array.from(buffer);
        uploadForm.append('file', new Blob([binary], { type: mimeType || 'application/octet-stream' }), fileName);

        const fileUpload = await fetchWithTimeout('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openAiApiKey}` },
            body: uploadForm,
        }, Math.min(timeoutMs, 10000));

        if (!fileUpload.ok) return '';
        const fileJson = await fileUpload.json();
        const fileId = fileJson?.id;
        if (!fileId) return '';

        const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
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
                                text: [
                                    'Leia este arquivo enviado para uma celula de Consolidacoes do SONAR.',
                                    'Se for documento escaneado ou imagem, faca OCR.',
                                    'Preserve no inicio o tipo e numero do documento quando houver, especialmente DIEx, oficio, relatorio, remessa ou recebimento.',
                                    'Extraia o texto util em portugues, preservando OM, datas, quantidades, valores, itens, medidas, justificativas e observacoes.',
                                    'Nao invente dados. Se algo estiver ilegivel, marque como [ilegivel].',
                                ].join(' '),
                            },
                        ],
                    },
                ],
            }),
        }, timeoutMs);

        if (!response.ok) return '';
        const json = await response.json();
        return getResponseOutputText(json).slice(0, 20000);
    } catch {
        return '';
    }
};

const getExtension = (fileName: string) => {
    const match = fileName.match(/(\.[a-z0-9]{1,8})$/i);
    return match?.[1] || '';
};

const withoutExtension = (fileName: string) => fileName.replace(/\.[^.]+$/, '').trim();

const normalizeDisplayFileName = (label: string, originalFileName: string) => {
    const extension = getExtension(originalFileName);
    const cleaned = label
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
    return `${cleaned || withoutExtension(originalFileName) || 'Documento'}${extension}`;
};

const findDiexNumber = (text: string) => {
    const patterns = [
        /\bDIEx\s*(?:n[ºo°.]*)?\s*[:\-]?\s*([0-9]{1,6}(?:[./-][A-Za-z0-9]+)*(?:\s*[-/]\s*[A-Za-z0-9ºª .-]{1,40})?)/i,
        /\bDIEx\b[\s\S]{0,80}?\bn[ºo°.]?\s*[:\-]?\s*([0-9]{1,6}(?:[./-][A-Za-z0-9]+)*(?:\s*[-/]\s*[A-Za-z0-9ºª .-]{1,40})?)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        const number = match?.[1]?.replace(/\s+/g, ' ').trim();
        if (number) return number;
    }

    return '';
};

const looksLikeDiexReceipt = (text: string) =>
    /\bDIEx\b[\s\S]{0,160}\b(recebimento|recebido|remessa|encaminh\w*|resposta)\b/i.test(text) ||
    /\b(recebimento|recebido|remessa|encaminh\w*|resposta)\b[\s\S]{0,160}\bDIEx\b/i.test(text);

const looksLikeAttachmentReference = (text: string) =>
    /\banexo\b/i.test(text) && !looksLikeDiexReceipt(text);

const inferDisplayNameWithOpenAI = async (text: string, originalFileName: string) => {
    if (!openAiApiKey || text.trim().length < 80) return '';

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
                                    'Identifique o documento abaixo para nomear um arquivo no sistema SONAR.',
                                    'Retorne SOMENTE JSON valido no formato:',
                                    '{"tipo":"DIEx|Anexo|Documento","numero":"texto ou null","rotulo":"nome curto sem extensao"}.',
                                    'Se for DIEx, o rotulo deve ser exatamente "DIEx nº X", substituindo X pelo numero identificado.',
                                    'Se for DIEx de recebimento, remessa, encaminhamento ou resposta, use "DIEx de recebimento nº X" quando o numero existir.',
                                    'Se for anexo de DIEx e o numero do DIEx aparecer, use "Anexo do DIEx nº X".',
                                    'Nao invente numero. Se nao tiver certeza, use o nome original limpo.',
                                    `Nome original: ${originalFileName}`,
                                    `Texto lido: ${text.slice(0, 8000)}`,
                                ].join('\n\n'),
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) return '';
        const json = await response.json();
        const outputText = getResponseOutputText(json)
            .replace(/^```json/i, '')
            .replace(/^```/i, '')
            .replace(/```$/i, '')
            .trim();
        const parsed = JSON.parse(outputText);
        return typeof parsed?.rotulo === 'string' ? parsed.rotulo.trim() : '';
    } catch {
        return '';
    }
};

const inferDisplayFileName = async (
    extractedText: string,
    originalFileName: string,
    primaryDocumentLabel: string,
    batchIndex: number
) => {
    const source = `${originalFileName}\n${extractedText}`;
    const diexNumber = findDiexNumber(source);
    const isDiexReceipt = looksLikeDiexReceipt(source);
    const isAttachmentReference = looksLikeAttachmentReference(source);

    if (diexNumber && isDiexReceipt) {
        return normalizeDisplayFileName(`DIEx de recebimento nº ${diexNumber}`, originalFileName);
    }

    if (diexNumber && isAttachmentReference) {
        return normalizeDisplayFileName(`Anexo do DIEx nº ${diexNumber}`, originalFileName);
    }

    if (diexNumber) {
        return normalizeDisplayFileName(`DIEx nº ${diexNumber}`, originalFileName);
    }

    const aiLabel = await inferDisplayNameWithOpenAI(extractedText, originalFileName);
    if (aiLabel) return normalizeDisplayFileName(aiLabel, originalFileName);

    if (isDiexReceipt) {
        return normalizeDisplayFileName('DIEx de recebimento', originalFileName);
    }

    if (/\bDIEx\b/i.test(source) && !isAttachmentReference) {
        return normalizeDisplayFileName('DIEx', originalFileName);
    }

    if (primaryDocumentLabel && batchIndex > 0) {
        return normalizeDisplayFileName(`Anexo do ${withoutExtension(primaryDocumentLabel)}`, originalFileName);
    }

    return originalFileName;
};

const maybeExtractStoredFileText = async (
    admin: ReturnType<typeof getAdminClient>,
    path: string,
    fileName: string,
    mimeType: string,
    sizeBytes: number,
    batchTotal: number
) => {
    if (sizeBytes > 4 * 1024 * 1024) {
        return {
            text: '',
            status: 'empty',
            error: 'Arquivo grande salvo sem leitura/OCR para evitar limite de processamento.',
        };
    }

    try {
        const { data, error } = await admin.storage.from(BUCKET).download(path);
        if (error || !data) {
            return {
                text: '',
                status: 'empty',
                error: error?.message || 'Nao foi possivel baixar o arquivo para leitura.',
            };
        }

        const buffer = Buffer.from(await data.arrayBuffer());
        const localExtractedText = extractText(buffer, fileName, mimeType || '');
        const localTextIsUseful = hasUsefulExtractedText(localExtractedText);
        const ocrTimeoutMs = batchTotal > 1 ? BATCH_FILE_OCR_TIMEOUT_MS : SINGLE_FILE_OCR_TIMEOUT_MS;
        const aiExtractedText = localTextIsUseful
            ? ''
            : await extractDocumentTextWithOpenAI(buffer, fileName, mimeType || 'application/octet-stream', ocrTimeoutMs);
        const text = (
            localTextIsUseful
                ? localExtractedText.trim()
                : (aiExtractedText.trim() || localExtractedText.trim())
        ).slice(0, 20000);

        return {
            text,
            status: text ? 'done' : 'empty',
            error: null,
        };
    } catch (err: any) {
        return {
            text: '',
            status: 'empty',
            error: err?.message || 'Falha na leitura/OCR do arquivo salvo.',
        };
    }
};

const insertFileRecord = async (
    admin: ReturnType<typeof getAdminClient>,
    payload: Record<string, any>
) => {
    const { data, error } = await admin
        .from('class_consolidation_files')
        .insert(payload)
        .select('*')
        .single();

    if (error && /schema cache|Could not find .* column|extracted_text|extraction_status|extraction_error|original_file_name/i.test(error.message || '')) {
        const fallbackPayload = { ...payload } as Record<string, any>;
        delete fallbackPayload.original_file_name;
        delete fallbackPayload.extracted_text;
        delete fallbackPayload.extraction_status;
        delete fallbackPayload.extraction_error;

        const fallback = await admin
            .from('class_consolidation_files')
            .insert(fallbackPayload)
            .select('*')
            .single();

        if (fallback.error) throw fallback.error;
        return {
            file: fallback.data,
            warning: 'Arquivo salvo, mas os campos de leitura/OCR ainda nao existem no Supabase. Execute o supabase_class_consolidations.sql atualizado.',
        };
    }

    if (error) throw error;
    return { file: data };
};

const ensureBucket = async (admin: ReturnType<typeof getAdminClient>) => {
    const { data } = await admin.storage.listBuckets();
    if (!data?.some(bucket => bucket.id === BUCKET)) {
        const { error } = await admin.storage.createBucket(BUCKET, { public: false });
        if (error && !error.message.toLowerCase().includes('already exists')) throw error;
    }
};

const ensureDefaultColumns = async (admin: ReturnType<typeof getAdminClient>, classKey: string) => {
    const { data: allColumns, error: allColumnsError } = await admin
        .from('class_consolidation_columns')
        .select('*')
        .eq('class_key', classKey)
        .order('position', { ascending: true });

    if (allColumnsError) throw allColumnsError;
    if (allColumns?.length) return allColumns.filter((column: any) => column.is_active);

    const { data: inserted, error: insertError } = await admin
        .from('class_consolidation_columns')
        .insert(DEFAULT_COLUMNS.map((name, index) => ({
            class_key: classKey,
            name,
            position: index + 1,
            is_active: true,
        })))
        .select('*')
        .order('position', { ascending: true });

    if (insertError) throw insertError;
    return inserted || [];
};

const loadColumns = async (admin: ReturnType<typeof getAdminClient>, classKey: string, isActive: boolean) => {
    const { data, error } = await admin
        .from('class_consolidation_columns')
        .select('*')
        .eq('class_key', classKey)
        .eq('is_active', isActive)
        .order('position', { ascending: true });

    if (error) throw error;
    return data || [];
};

const getDownloadUrl = async (admin: ReturnType<typeof getAdminClient>, file: any) => {
    if (file.file_data_base64) {
        return `data:${file.file_data_mime || file.mime_type || 'application/octet-stream'};base64,${file.file_data_base64}`;
    }

    if (!file.file_path) return '';

    const { data, error } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(file.file_path, 3600);

    if (error) throw error;
    return data?.signedUrl || '';
};

const withSetupHint = (error: any) => {
    const message = String(error?.message || error || '');
    if (/due_date|consolidation_scope/i.test(message)) {
        return 'A tabela de consolidacoes existe, mas ainda nao tem os campos novos de prazo e modo Por OM/Por Cmdo. Execute o SQL complementar de alter table em class_consolidation_columns.';
    }
    if (/original_file_name|extracted_text|extraction_status|extraction_error/i.test(message)) {
        return 'A tabela de consolidacoes existe, mas ainda nao tem os campos de leitura/OCR dos anexos. Execute novamente o supabase_class_consolidations.sql atualizado.';
    }
    if (/duplicate key|unique constraint|class_consolidation_files_class_key_row_id_column_id/i.test(message)) {
        return 'A tabela de consolidacoes ainda esta com a restricao antiga de apenas 1 arquivo por celula. Execute novamente o supabase_class_consolidations.sql atualizado para permitir anexos cumulativos.';
    }
    if (/permission denied/i.test(message)) {
        return 'As tabelas de consolidacoes existem, mas estao sem permissao no Supabase. Execute novamente o supabase_class_consolidations.sql atualizado para aplicar os GRANTs.';
    }
    if (/class_consolidation_columns|class_consolidation_files|does not exist|schema cache|Could not find/i.test(message)) {
        return 'Estrutura de consolidacoes ainda nao criada no Supabase. Execute o SQL supabase_class_consolidations.sql e tente novamente.';
    }
    return message || 'Erro inesperado.';
};

export async function GET(req: NextRequest) {
    try {
        const admin = getAdminClient();
        await requireUser(req, admin);

        const fileId = req.nextUrl.searchParams.get('fileId');
        if (fileId) {
            const { data: file, error } = await admin
                .from('class_consolidation_files')
                .select('*')
                .eq('id', fileId)
                .single();

            if (error) throw error;

            return NextResponse.json({
                fileName: file.file_name,
                downloadUrl: await getDownloadUrl(admin, file),
            });
        }

        const classKey = req.nextUrl.searchParams.get('classKey') || 'classe-ii-material-de-intendencia';
        const columns = await ensureDefaultColumns(admin, classKey);
        const archivedColumns = await loadColumns(admin, classKey, false);
        const { data: files, error: filesError } = await admin
            .from('class_consolidation_files')
            .select('*')
            .eq('class_key', classKey)
            .order('uploaded_at', { ascending: false });

        if (filesError) throw filesError;
        return NextResponse.json({ columns, archivedColumns, files: files || [] });
    } catch (err: any) {
        return NextResponse.json({ error: withSetupHint(err) }, { status: err.message?.includes('Sessao') ? 401 : 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const admin = getAdminClient();
        await requireUser(req, admin);

        const fileId = req.nextUrl.searchParams.get('fileId');
        if (!fileId) return NextResponse.json({ error: 'Arquivo invalido.' }, { status: 400 });

        const { data: file, error: fileError } = await admin
            .from('class_consolidation_files')
            .select('id, file_path')
            .eq('id', fileId)
            .single();

        if (fileError) throw fileError;

        if (file?.file_path) {
            const { error: storageError } = await admin.storage
                .from(BUCKET)
                .remove([file.file_path]);

            if (storageError && !/not found|does not exist|no such/i.test(storageError.message || '')) {
                throw storageError;
            }
        }

        const { error: deleteError } = await admin
            .from('class_consolidation_files')
            .delete()
            .eq('id', fileId);

        if (deleteError) throw deleteError;
        return NextResponse.json({ ok: true, fileId });
    } catch (err: any) {
        return NextResponse.json({ error: withSetupHint(err) }, { status: err.message?.includes('Sessao') ? 401 : 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const admin = getAdminClient();
        const user = await requireUser(req, admin);
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            await ensureBucket(admin).catch(() => undefined);
            const formData = await req.formData();
            const file = formData.get('file');
            const classKey = String(formData.get('classKey') || 'classe-ii-material-de-intendencia');
            const rowId = String(formData.get('rowId') || '');
            const rowName = String(formData.get('rowName') || '');
            const columnId = String(formData.get('columnId') || '');
            const batchIndex = Number(formData.get('batchIndex') || 0);
            const batchTotal = Number(formData.get('batchTotal') || 1);
            const primaryDocumentLabel = String(formData.get('primaryDocumentLabel') || '');

            if (!(file instanceof File)) return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 });
            if (!rowId || !rowName || !columnId) return NextResponse.json({ error: 'Celula invalida.' }, { status: 400 });

            const buffer = Buffer.from(await file.arrayBuffer());
            const safeName = sanitizeFileName(file.name);
            const path = `${classKey}/${rowId}/${columnId}/${Date.now()}-${randomUUID()}-${safeName}`;
            const { error: uploadError } = await admin.storage
                .from(BUCKET)
                .upload(path, buffer, {
                    contentType: file.type || 'application/octet-stream',
                    upsert: false,
                });

            const localExtractedText = extractText(buffer, file.name, file.type || '');
            const localTextIsUseful = hasUsefulExtractedText(localExtractedText);
            const ocrTimeoutMs = batchTotal > 1 ? BATCH_FILE_OCR_TIMEOUT_MS : SINGLE_FILE_OCR_TIMEOUT_MS;
            const aiExtractedText = localTextIsUseful
                ? ''
                : await extractDocumentTextWithOpenAI(buffer, file.name, file.type || 'application/octet-stream', ocrTimeoutMs);
            const extractedText = (
                localTextIsUseful
                    ? localExtractedText.trim()
                    : (aiExtractedText.trim() || localExtractedText.trim())
            ).slice(0, 20000);
            const displayFileName = await inferDisplayFileName(extractedText, file.name, primaryDocumentLabel, batchIndex);

            const payload = {
                class_key: classKey,
                row_id: rowId,
                row_name: rowName,
                column_id: columnId,
                file_name: displayFileName,
                original_file_name: file.name,
                file_path: uploadError ? null : path,
                mime_type: file.type || 'application/octet-stream',
                size_bytes: file.size,
                uploaded_by: user.email!,
                uploaded_at: new Date().toISOString(),
                extracted_text: extractedText,
                extraction_status: extractedText ? 'done' : 'empty',
                extraction_error: null,
                file_data_base64: uploadError ? buffer.toString('base64') : null,
                file_data_mime: uploadError ? (file.type || 'application/octet-stream') : null,
            };

            return NextResponse.json(await insertFileRecord(admin, payload));
        }

        const body = await req.json();
        const classKey = body.classKey || 'classe-ii-material-de-intendencia';

        if (body.action === 'prepareUpload') {
            await ensureBucket(admin).catch(() => undefined);

            const rowId = String(body.rowId || '');
            const columnId = String(body.columnId || '');
            const originalFileName = String(body.fileName || 'consolidacao');
            if (!rowId || !columnId) return NextResponse.json({ error: 'Celula invalida.' }, { status: 400 });

            const safeName = sanitizeFileName(originalFileName);
            const path = `${classKey}/${rowId}/${columnId}/${Date.now()}-${randomUUID()}-${safeName}`;
            const { data, error } = await admin.storage
                .from(BUCKET)
                .createSignedUploadUrl(path);

            if (error) throw error;
            return NextResponse.json({
                bucket: BUCKET,
                path,
                token: data?.token,
                signedUrl: data?.signedUrl,
            });
        }

        if (body.action === 'finalizeUpload') {
            const rowId = String(body.rowId || '');
            const rowName = String(body.rowName || '');
            const columnId = String(body.columnId || '');
            const filePath = String(body.filePath || '');
            const originalFileName = String(body.fileName || 'Documento');
            const mimeType = String(body.mimeType || 'application/octet-stream');
            const sizeBytes = Number(body.sizeBytes || 0);
            const batchIndex = Number(body.batchIndex || 0);
            const batchTotal = Number(body.batchTotal || 1);
            const primaryDocumentLabel = String(body.primaryDocumentLabel || '');

            if (!rowId || !rowName || !columnId || !filePath) {
                return NextResponse.json({ error: 'Arquivo ou celula invalida.' }, { status: 400 });
            }

            const extraction = await maybeExtractStoredFileText(
                admin,
                filePath,
                originalFileName,
                mimeType,
                sizeBytes,
                batchTotal
            );
            const displayFileName = await inferDisplayFileName(extraction.text, originalFileName, primaryDocumentLabel, batchIndex);

            const payload = {
                class_key: classKey,
                row_id: rowId,
                row_name: rowName,
                column_id: columnId,
                file_name: displayFileName,
                original_file_name: originalFileName,
                file_path: filePath,
                mime_type: mimeType,
                size_bytes: sizeBytes,
                uploaded_by: user.email!,
                uploaded_at: new Date().toISOString(),
                extracted_text: extraction.text,
                extraction_status: extraction.status,
                extraction_error: extraction.error,
                file_data_base64: null,
                file_data_mime: null,
            };

            return NextResponse.json(await insertFileRecord(admin, payload));
        }

        if (body.action === 'addColumn') {
            const { data: current } = await admin
                .from('class_consolidation_columns')
                .select('position')
                .eq('class_key', classKey)
                .order('position', { ascending: false })
                .limit(1);

            const nextPosition = ((current?.[0]?.position as number | undefined) || 0) + 1;
            const { data, error } = await admin
                .from('class_consolidation_columns')
                .insert({
                    class_key: classKey,
                    name: body.name || `Nova demanda ${nextPosition}`,
                    position: nextPosition,
                    is_active: true,
                })
                .select('*')
                .single();

            if (error) throw error;
            return NextResponse.json({ column: data });
        }

        if (body.action === 'renameColumn') {
            const { data, error } = await admin
                .from('class_consolidation_columns')
                .update({ name: String(body.name || 'Demanda sem nome').trim() || 'Demanda sem nome' })
                .eq('id', body.columnId)
                .eq('class_key', classKey)
                .select('*')
                .single();

            if (error) throw error;
            return NextResponse.json({ column: data });
        }

        if (body.action === 'updateColumn') {
            const { data, error } = await admin
                .from('class_consolidation_columns')
                .update({
                    name: String(body.name || 'Demanda sem nome').trim() || 'Demanda sem nome',
                    due_date: body.dueDate || null,
                    consolidation_scope: body.scope === 'command' ? 'command' : 'om',
                })
                .eq('id', body.columnId)
                .eq('class_key', classKey)
                .select('*')
                .single();

            if (error) throw error;
            return NextResponse.json({ column: data });
        }

        if (body.action === 'archiveColumn') {
            const { data, error } = await admin
                .from('class_consolidation_columns')
                .update({ is_active: false })
                .eq('id', body.columnId)
                .eq('class_key', classKey)
                .select('*')
                .single();

            if (error) throw error;
            return NextResponse.json({ column: data });
        }

        if (body.action === 'restoreColumn') {
            const { data, error } = await admin
                .from('class_consolidation_columns')
                .update({ is_active: true })
                .eq('id', body.columnId)
                .eq('class_key', classKey)
                .select('*')
                .single();

            if (error) throw error;
            return NextResponse.json({ column: data });
        }

        if (body.action === 'deleteColumn') {
            const confirmation = String(body.confirmation || '').trim().toUpperCase();
            if (confirmation !== 'ELIMINAR') {
                return NextResponse.json({ error: 'Confirmacao invalida para eliminar coluna.' }, { status: 400 });
            }

            const { data: columnFiles, error: filesToRemoveError } = await admin
                .from('class_consolidation_files')
                .select('file_path')
                .eq('class_key', classKey)
                .eq('column_id', body.columnId)
                .not('file_path', 'is', null);

            if (filesToRemoveError) throw filesToRemoveError;

            const storagePaths = (columnFiles || [])
                .map((file: any) => file.file_path)
                .filter(Boolean);

            if (storagePaths.length > 0) {
                await admin.storage.from(BUCKET).remove(storagePaths);
            }

            const { error } = await admin
                .from('class_consolidation_columns')
                .delete()
                .eq('id', body.columnId)
                .eq('class_key', classKey);

            if (error) throw error;
            return NextResponse.json({ ok: true, columnId: body.columnId });
        }

        return NextResponse.json({ error: 'Acao invalida.' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: withSetupHint(err) }, { status: err.message?.includes('Sessao') ? 401 : 500 });
    }
}
