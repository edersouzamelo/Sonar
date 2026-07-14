import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cmoOrganizations } from '@/lib/cmo-organizations';
import { supplyClasses } from '@/lib/supply-classes';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    : supabase;
const openAiApiKey = process.env.SONAR_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const config = new Configuration({
    apiKey: openAiApiKey,
});
const openai = new OpenAIApi(config);

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        if (!openAiApiKey) {
            return NextResponse.json({ error: 'Chave da OpenAI nao configurada.' }, { status: 500 });
        }

        const { messages, tendersData, teamData } = await req.json();
        const lastMessage = messages[messages.length - 1];
        let ragContext = '';
        let serviceOrdersContext = '';
        let legalDocumentsContext = '';
        let consolidationsContext = '';

        if (lastMessage && lastMessage.role === 'user') {
            try {
                const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${openAiApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        input: lastMessage.content.replace(/\n/g, ' '),
                        model: 'text-embedding-ada-002',
                    }),
                });

                if (embeddingResponse.ok) {
                    const embeddingResult = await embeddingResponse.json();
                    const queryEmbedding = embeddingResult.data[0].embedding;
                    const specificTenderId = tendersData?.length === 1 && tendersData[0].id
                        ? tendersData[0].id
                        : null;

                    const { data: chunks, error } = await supabase.rpc('match_document_chunks', {
                        query_embedding: queryEmbedding,
                        match_threshold: 0.70,
                        match_count: 6,
                        p_tender_id: specificTenderId,
                    });

                    if (!error && chunks?.length > 0) {
                        ragContext = chunks.map((chunk: any) => chunk.content).join('\n\n---\n\n');
                    }
                }
            } catch (ragError) {
                console.error('Erro no fluxo de RAG Vectors:', ragError);
            }
        }

        try {
            const { data: serviceOrders, error: serviceOrdersError } = await supabase
                .from('service_orders')
                .select('id, file_name, uploaded_at, uploaded_by, extracted_text, service_order_deadlines(due_date, title, source_file)')
                .order('uploaded_at', { ascending: false })
                .limit(25);

            if (!serviceOrdersError && serviceOrders?.length) {
                const reduced = serviceOrders.map((order: any) => ({
                    id: order.id,
                    arquivo: order.file_name,
                    enviado_em: order.uploaded_at,
                    enviado_por: order.uploaded_by,
                    resumo_texto: typeof order.extracted_text === 'string' ? order.extracted_text.slice(0, 3000) : '',
                    prazos: (order.service_order_deadlines || []).map((d: any) => ({
                        data: d.due_date,
                        titulo: d.title,
                        origem: d.source_file,
                    })),
                }));
                serviceOrdersContext = JSON.stringify(reduced);
            }
        } catch (serviceOrderError) {
            console.error('Erro ao carregar Ordens de Servico para o Colosso:', serviceOrderError);
        }

        try {
            const { data: legalDocuments, error: legalDocumentsError } = await supabase
                .from('legal_documents')
                .select('id, file_name, uploaded_at, uploaded_by, document_type, document_number, issuing_body, subject, effective_date, tags, extracted_text, legal_document_deadlines(due_date, title, source_file)')
                .order('uploaded_at', { ascending: false })
                .limit(40);

            if (!legalDocumentsError && legalDocuments?.length) {
                const reduced = legalDocuments.map((document: any) => ({
                    id: document.id,
                    arquivo: document.file_name,
                    enviado_em: document.uploaded_at,
                    enviado_por: document.uploaded_by,
                    tipo: document.document_type,
                    numero: document.document_number,
                    orgao_emissor: document.issuing_body,
                    assunto: document.subject,
                    vigencia: document.effective_date,
                    tags: document.tags || [],
                    resumo_texto: typeof document.extracted_text === 'string' ? document.extracted_text.slice(0, 5000) : '',
                    datas_relevantes: (document.legal_document_deadlines || []).map((d: any) => ({
                        data: d.due_date,
                        titulo: d.title,
                        origem: d.source_file,
                    })),
                }));
                legalDocumentsContext = JSON.stringify(reduced);
            }
        } catch (legalDocumentError) {
            console.error('Erro ao carregar DIEx normativos, regulamentos e legislacoes para o Colosso:', legalDocumentError);
        }

        try {
            const { data: officialOrganizations } = await supabaseAdmin
                .from('military_organizations')
                .select('id, name')
                .eq('is_active', true)
                .order('position', { ascending: true });
            const organizationRows = officialOrganizations?.length ? officialOrganizations : cmoOrganizations;
            const organizationNameById = new Map(organizationRows.map((organization: any) => [organization.id, organization.name]));
            organizationRows.forEach((organization: any, index: number) => {
                organizationNameById.set(`om-${index + 1}`, organization.name);
            });
            const allOms = organizationRows.map((organization: any) => organization.name).sort();

            const classSummaries = await Promise.all(supplyClasses.map(async (supplyClass) => {
                const [{ data: columns, error: columnsError }, { data: files, error: filesError }] = await Promise.all([
                    supabaseAdmin
                        .from('class_consolidation_columns')
                        .select('id, name, position, due_date, consolidation_scope')
                        .eq('class_key', supplyClass.key)
                        .eq('is_active', true)
                        .order('position', { ascending: true }),
                    supabaseAdmin
                        .from('class_consolidation_files')
                        .select('id, row_id, row_name, column_id, file_name, uploaded_by, uploaded_at, extracted_text, extraction_status')
                        .eq('class_key', supplyClass.key)
                        .order('uploaded_at', { ascending: false }),
                ]);

                if (columnsError || filesError || !columns?.length) return null;
                const fileRows = files || [];
                const columnsSummary = columns.map((column: any) => {
                    const sentFiles = fileRows.filter((file: any) => file.column_id === column.id);
                    const sentOms = Array.from(new Set(sentFiles.map((file: any) => organizationNameById.get(file.row_id) || file.row_name).filter(Boolean))).sort();
                    const missingOms = allOms.filter((om: string) => !sentOms.includes(om));

                    return {
                        coluna_id: column.id,
                        demanda: column.name,
                        prazo: column.due_date || null,
                        modo_consolidacao: column.consolidation_scope === 'command' ? 'Por Cmdo' : 'Por OM',
                        total_enviado: sentOms.length,
                        total_pendente: missingOms.length,
                        oms_que_enviaram: sentOms,
                        oms_pendentes: missingOms,
                        arquivos: sentFiles.map((file: any) => ({
                            om: organizationNameById.get(file.row_id) || file.row_name,
                            arquivo: file.file_name,
                            enviado_por: file.uploaded_by,
                            enviado_em: file.uploaded_at,
                            status_leitura: file.extraction_status || null,
                            texto_lido_do_anexo: typeof file.extracted_text === 'string' ? file.extracted_text.slice(0, 4000) : '',
                        })),
                    };
                });

                return {
                    classe_key: supplyClass.key,
                    classe: supplyClass.label,
                    colunas: columnsSummary,
                };
            }));

            const activeClassSummaries = classSummaries.filter(Boolean);
            if (activeClassSummaries.length) {
                consolidationsContext = JSON.stringify({
                    modulo: 'Consolidacoes das Classes de Suprimento',
                    observacao: 'Cada classe tem area de trabalho isolada por classe_key. Use estes dados para responder quem enviou ou nao enviou cada demanda e, quando houver texto_lido_do_anexo, use tambem o conteudo extraido/OCR dos arquivos enviados.',
                    classes: activeClassSummaries,
                });
            }
        } catch (consolidationsError) {
            console.error('Erro ao carregar Consolidacoes para o Colosso:', consolidationsError);
        }

        const systemPrompt = `
Voce e "Colosso", o assistente de inteligencia artificial do sistema SONAR.
Sua missao e responder sobre processos logisticos, processos licitatorios, equipes, ordens de servico, DIEx normativos, regulamentos, legislacoes, estoques, classes de suprimento e dados operacionais disponiveis no painel.

${ragContext ? `
============ DADOS RAG (ARQUIVOS DO SISTEMA) ============
Abaixo estao trechos de PDFs e documentos oficiais enviados pelos usuarios ao banco de dados:
"""
${ragContext}
"""
Se a pergunta do usuario puder ser respondida usando os trechos acima, use essas informacoes e diga que encontrou nos arquivos anexados.
=========================================================
` : ''}

DADOS DOS PROCESSOS ATUAIS NO SISTEMA:
${JSON.stringify(tendersData)}

DADOS DA EQUIPE E SEUS CARGOS:
${JSON.stringify(teamData || {})}

DADOS DE ORDENS DE SERVICO (OS) E PRAZOS:
${serviceOrdersContext || 'Sem ordens de servico registradas no momento.'}

DADOS DE DIEX NORMATIVOS, REGULAMENTOS E LEGISLACOES:
${legalDocumentsContext || 'Sem DIEx normativos, regulamentos ou legislacoes registrados no momento.'}

DADOS DE CONSOLIDACOES DAS CLASSES DE SUPRIMENTO:
${consolidationsContext || 'Sem consolidacoes registradas no momento.'}

Regras de resposta:
1. Responda em portugues do Brasil, com clareza e objetividade.
2. Se perguntarem sobre carga de trabalho, cruze os dados dos processos com os dados da equipe.
3. Se alguma informacao aparecer como "Nao informado", vazia ou ausente, diga que o dado ainda nao consta nos registros.
4. Mantenha tom firme, respeitoso e prestativo.
5. Se perguntarem sobre fundamentacao normativa, priorize os DIEx normativos, regulamentos e legislacoes carregados no sistema e cite o documento de origem quando houver.
6. Se perguntarem sobre Consolidacoes, responda com base na matriz da classe de suprimento citada pelo usuario. Demandas equivalem aos nomes das colunas, OM equivalem as linhas e upload registrado equivale a recebimento da demanda.
7. Se perguntarem "qual OM ainda nao enviou" uma demanda de Consolidacoes, procure a coluna mais parecida com o termo citado e liste as OM pendentes. Se a coluna nao existir, diga que a demanda ainda nao foi criada como coluna.
8. Se perguntarem "quanto" uma OM pediu em Consolidacoes, procure primeiro no texto_lido_do_anexo dos arquivos daquela OM e daquela demanda; se houver quantidade, item, valor ou medida clara, responda citando a OM, demanda e arquivo de origem. Se houver apenas upload de arquivo sem texto extraido/OCR, diga que o arquivo foi recebido, mas que o conteudo ainda nao foi lido para consulta.
9. Se perguntarem algo fora do SONAR, diga que voce, Colosso, so pode responder sobre a base logistica, licitatoria, normativa, ordens de servico, consolidacoes e de pessoal do sistema.
`;

        const response = await openai.createChatCompletion({
            model: 'gpt-4o-mini',
            stream: true,
            temperature: 0.1,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map((message: any) => ({
                    role: message.role,
                    content: message.content,
                })),
            ],
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro da OpenAI:', response.status, errorText);
            return NextResponse.json({ error: 'Falha ao chamar a OpenAI.' }, { status: response.status });
        }

        const stream = OpenAIStream(response);
        return new StreamingTextResponse(stream);
    } catch (error) {
        console.error('Erro no Chat API:', error);
        return NextResponse.json({ error: 'Falha ao processar solicitacao da IA.' }, { status: 500 });
    }
}
