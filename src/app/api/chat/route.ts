import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
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

        const systemPrompt = `
Voce e "Colosso", o assistente de inteligencia artificial do sistema SONAR.
Sua missao e responder sobre processos logisticos, processos licitatorios, equipes, ordens de servico, estoques, classes de suprimento e dados operacionais disponiveis no painel.

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

Regras de resposta:
1. Responda em portugues do Brasil, com clareza e objetividade.
2. Se perguntarem sobre carga de trabalho, cruze os dados dos processos com os dados da equipe.
3. Se alguma informacao aparecer como "Nao informado", vazia ou ausente, diga que o dado ainda nao consta nos registros.
4. Mantenha tom firme, respeitoso e prestativo.
5. Se perguntarem algo fora do SONAR, diga que voce, Colosso, so pode responder sobre a base logistica, licitatoria, ordens de servico e de pessoal do sistema.
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
