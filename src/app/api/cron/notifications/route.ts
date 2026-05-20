import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const testEmail = searchParams.get('testEmail');

    // Verificar token simples para segurança do cron (opcional, mas recomendado)

    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return new Response('Unauthorized', { status: 401 });
    }

    try {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY missing');
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const isFirstDayOfMonth = today.getDate() === 1;
        const logoUrl = 'https://radar-jet.vercel.app/radar-logo.png';


        // 1. Buscar Tenders
        const { data: tenders, error: tendersError } = await supabase.from('tenders').select('*');
        if (tendersError) throw tendersError;

        // 2. Buscar Membros da Equipe (Requisitantes)
        const { data: team, error: teamError } = await supabase.from('team_members').select('*');
        if (teamError) throw teamError;

        const notificationsSent = [];

        for (const tender of tenders) {
            if (tender.status === 'HOMOLOGADO' || tender.status.includes('CANCELADO')) continue;

            const deadlineStr = tender.dates?.protocoloSetorRequisitante?.defined;
            if (!deadlineStr) continue;

            // Sincronia com a Agenda: Se o usuário já deu "check" azul (OK), não notifica
            const checks = tender.dates?._date_checks || {};
            if (checks["protocoloSetorRequisitante.defined"]) continue;

            const deadline = new Date(deadlineStr);
            const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));


            // Identificar destinatários do setor requisitante
            let recipients = team.filter(m =>
                m.type === 'requisitante' &&
                m.om === tender.requester_sector &&
                m.email
            );

            // Adicionar pregoeiros vinculados (Fase Interna e Externa)
            const pregoeiroInterno = team.find(m => m.id === tender.pregoeiro_fase_interna_id);
            const pregoeiroExterno = team.find(m => m.id === tender.pregoeiro_fase_externa_id);

            if (pregoeiroInterno && pregoeiroInterno.email) recipients.push(pregoeiroInterno);
            if (pregoeiroExterno && pregoeiroExterno.email && pregoeiroExterno.id !== pregoeiroInterno?.id) {
                recipients.push(pregoeiroExterno);
            }

            // Remover duplicatas de e-mail (caso alguém tenha múltiplos papéis)
            const uniqueRecipients = Array.from(new Map(recipients.map(r => [r.email, r])).values());
            recipients = uniqueRecipients;


            // MODO DE TESTE: Sobrescrever destinatários se testEmail for fornecido
            if (testEmail) {
                // Se for teste, enviamos apenas para o e-mail solicitado
                recipients = [{ name: `TESTE (${testEmail})`, email: testEmail } as any];
            }

            if (recipients.length === 0) continue;

            const objectName = tender.description || 'Objeto não identificado';
            const tenderNum = tender.number || '---';



            let shouldNotify = false;
            let subject = '';
            let message = '';

            if (diffDays === 30) {
                shouldNotify = true;
                subject = `[RADAR] Alerta 30 Dias: Pregão ${tenderNum}`;
                message = `O prazo de envio do Termo de Referência do Processo de <strong>${objectName}</strong> vai expirar em 30 dias.`;
            } else if (diffDays === 5) {
                shouldNotify = true;
                subject = `[RADAR] Alerta URGENTE 5 Dias: Pregão ${tenderNum}`;
                message = `O prazo de envio do Termo de Referência do Processo de <strong>${objectName}</strong> vai expirar em 5 dias. Favor protocolar imediatamente.`;
            } else if (diffDays === 0) {
                shouldNotify = true;
                subject = `[RADAR] Prazo VENCE HOJE: Pregão ${tenderNum}`;
                message = `O prazo de envio do Termo de Referência do Processo de <strong>${objectName}</strong> vence hoje (${new Date(deadlineStr).toLocaleDateString('pt-BR')}).`;
            } else if (diffDays < 0) {
                shouldNotify = true;
                subject = `[RADAR] Prazo ATRASADO: Pregão ${tenderNum}`;
                message = `O prazo de envio do Termo de Referência do Processo de <strong>${objectName}</strong> está atrasado há ${Math.abs(diffDays)} dias.`;
            }


            if (shouldNotify) {
                for (const recipient of recipients) {
                    try {
                        await resend.emails.send({
                            from: 'Radar <notificacoes@resend.dev>',
                            to: [recipient.email],
                            subject: subject,
                            html: `
                                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; padding: 40px 20px; color: #334155;">
                                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                        <!-- Header -->
                                        <div style="background-color: #1A1A1A; padding: 30px; text-align: center; border-bottom: 4px solid #FFB000;">
                                            <img src="${logoUrl}" alt="Radar Logo" style="width: 80px; height: auto; margin-bottom: 10px; filter: brightness(0) invert(1);">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">RADAR</h1>
                                            <p style="color: #FFB000; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; letter-spacing: 1px;">SISTEMA DE GESTÃO DE LICITAÇÕES</p>
                                        </div>

                                        
                                        <!-- Body -->
                                        <div style="padding: 40px 30px;">
                                            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Olá, ${recipient.name}</h2>
                                            <p style="font-size: 16px; line-height: 1.6;">Identificamos uma atualização importante na agenda de prazos que requer sua atenção:</p>
                                            
                                            <div style="margin: 30px 0; padding: 25px; background-color: #f8fafc; border-left: 4px solid #1A1A1A; border-radius: 4px;">
                                                <p style="margin: 0; font-size: 18px; color: #1e293b; font-weight: bold;">${subject.replace('[RADAR] ', '')}</p>
                                                <p style="margin: 15px 0 0 0; color: #475569; font-size: 15px;">${message}</p>
                                            </div>

                                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                                                <tr>
                                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 120px;">Objeto</td>
                                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">${objectName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Pregão</td>
                                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">${tenderNum}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">UASG</td>
                                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; font-weight: 600;">${tender.uasg}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Data Limite</td>
                                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #ef4444; font-size: 14px; font-weight: bold;">${new Date(deadlineStr).toLocaleDateString('pt-BR')}</td>
                                                </tr>
                                            </table>

                                            <p style="font-size: 12px; color: #64748b; font-style: italic; margin-bottom: 20px;">
                                                * Se o TR já foi enviado, desconsidere esta notificação. Para conferência, verifique no sistema Radar.
                                            </p>

                                            <div style="text-align: center; margin-top: 40px;">
                                                <a href="https://radar-jet.vercel.app/agenda" style="background-color: #1A1A1A; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">ACESSAR AGENDA NO RADAR</a>
                                            </div>

                                        </div>

                                        <!-- Footer -->
                                        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #f1f5f9;">
                                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">Este é um e-mail gerado automaticamente pelo Sistema Radar.</p>
                                            <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 12px;">© 2026 Radar - Gestão Estratégica</p>
                                        </div>
                                    </div>
                                </div>
                            `

                        });
                        notificationsSent.push({ to: recipient.email, tender: tender.number, type: subject });
                    } catch (e) {
                        console.error(`Error sending to ${recipient.email}:`, e);
                    }
                }
            }
        }

        // 3. LOGICA PARA SUPERVISORES (Resumo Geral)
        const summaryTenders = tenders.filter(t => {
            if (t.status === 'HOMOLOGADO' || t.status.includes('CANCELADO')) return false;
            const ds = t.dates?.protocoloSetorRequisitante?.defined;
            if (!ds) return false;
            const diff = Math.ceil((new Date(ds).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diff <= 30; // Mostrar tudo que vence em 30 dias ou está atrasado
        });

        if (summaryTenders.length > 0) {
            const supervisorsList = team.filter(m => m.type === 'supervisor' && m.email);

            // Em modo de teste, o resumo também vai para o testEmail
            const finalSupervisors = testEmail ? [{ name: `Resumo Teste`, email: testEmail }] : supervisorsList;

            for (const supervisor of finalSupervisors) {
                await resend.emails.send({
                    from: 'Radar <notificacoes@resend.dev>',
                    to: [supervisor.email],
                    subject: `[RADAR] Resumo Diário de Prazos - ${today.toLocaleDateString('pt-BR')}`,
                    html: `
                        <div style="font-family: sans-serif; background-color: #f4f7f9; padding: 40px 20px;">
                            <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                                <div style="background-color: #1A1A1A; padding: 20px; text-align: center; border-bottom: 4px solid #FFB000;">
                                    <h2 style="color: #ffffff; margin: 0; font-size: 20px;">RESUMO DE SUPERVISÃO</h2>
                                </div>
                                <div style="padding: 30px;">
                                    <p>Olá, ${supervisor.name}. Segue a situação atual dos prazos SAL (Entrega de TR):</p>
                                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                        <thead>
                                            <tr style="background-color: #1A1A1A; color: #ffffff;">
                                                <th style="padding: 10px; text-align: left; font-size: 12px;">Processo/Objeto</th>
                                                <th style="padding: 10px; text-align: left; font-size: 12px;">Setor</th>
                                                <th style="padding: 10px; text-align: center; font-size: 12px;">Prazo</th>
                                                <th style="padding: 10px; text-align: center; font-size: 12px;">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${summaryTenders.map(st => {
                        const ds = st.dates?.protocoloSetorRequisitante?.defined;
                        const diff = Math.ceil((new Date(ds).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        let statusColor = diff < 0 ? '#ef4444' : (diff <= 5 ? '#f59e0b' : '#3b82f6');
                        let statusText = diff < 0 ? `Atrasado ${Math.abs(diff)}d` : (diff === 0 ? 'Vence Hoje' : `Faltam ${diff}d`);

                        return `
                                                    <tr style="border-bottom: 1px solid #f1f5f9;">
                                                        <td style="padding: 10px; font-size: 12px;"><strong>${st.number || '---'}</strong><br><span style="color: #64748b;">${st.description}</span></td>
                                                        <td style="padding: 10px; font-size: 12px;">${st.requester_sector}</td>
                                                        <td style="padding: 10px; font-size: 11px; text-align: center;">${new Date(ds).toLocaleDateString('pt-BR')}</td>
                                                        <td style="padding: 10px; font-size: 11px; text-align: center; color: ${statusColor}; font-weight: bold;">${statusText}</td>
                                                    </tr>
                                                `;
                    }).join('')}
                                        </tbody>
                                    </table>
                                    <div style="text-align: center; margin-top: 30px;">
                                        <a href="https://radar-jet.vercel.app/agenda" style="background-color: #FFB000; color: #1A1A1A; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">VER AGENDA COMPLETA</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                });
                notificationsSent.push({ to: supervisor.email, tender: 'RESUMO GERAL', type: 'SUPERVISOR_SUMMARY' });
            }
        }

        // 4. LOGICA PARA RELATÓRIO MENSAL (No 1º dia do mês)
        if (isFirstDayOfMonth || testEmail === 'mensal@teste.com') {
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const monthName = today.toLocaleString('pt-BR', { month: 'long' });

            const monthTenders = tenders.filter(t => {
                if (t.status === 'HOMOLOGADO' || t.status.includes('CANCELADO')) return false;
                const ds = t.dates?.protocoloSetorRequisitante?.defined;
                if (!ds) return false;
                const d = new Date(ds);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });

            if (monthTenders.length > 0) {
                const finalRecipients = testEmail ? [{ name: 'Teste Mensal', email: testEmail === 'mensal@teste.com' ? 'edersouzamelo@gmail.com' : testEmail }] : team.filter(m => m.type === 'supervisor' && m.email);

                for (const recipient of finalRecipients) {
                    await resend.emails.send({
                        from: 'Radar <notificacoes@resend.dev>',
                        to: [recipient.email],
                        subject: `[RADAR] Relatório Mensal de Prazos - ${monthName} / ${currentYear}`,
                        html: `
                            <div style="font-family: sans-serif; background-color: #f4f7f9; padding: 40px 20px;">
                                <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                                    <div style="background-color: #1A1A1A; padding: 25px; text-align: center; border-bottom: 4px solid #FFB000;">
                                        <img src="${logoUrl}" alt="Radar Logo" style="width: 60px; height: auto; margin-bottom: 10px; filter: brightness(0) invert(1);">
                                        <h2 style="color: #ffffff; margin: 0; font-size: 18px;">RELATÓRIO MENSAL DE PLANEJAMENTO</h2>
                                        <p style="color: #FFB000; margin: 5px 0 0 0; font-size: 13px;">Situação do Prazo SAL - ${monthName}</p>
                                    </div>
                                    <div style="padding: 30px;">
                                        <p style="color: #334155; font-size: 14px;">Olá, ${recipient.name}. Abaixo, a relação de todos os processos com entrega de TR prevista para este mês:</p>
                                        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                            <thead>
                                                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                                    <th style="padding: 12px; text-align: left; font-size: 11px; color: #64748b;">PROCESSO</th>
                                                    <th style="padding: 12px; text-align: left; font-size: 11px; color: #64748b;">SETOR</th>
                                                    <th style="padding: 12px; text-align: center; font-size: 11px; color: #64748b;">DATA LIMITE</th>
                                                    <th style="padding: 12px; text-align: center; font-size: 11px; color: #64748b;">SITUAÇÃO</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${monthTenders.map(mt => {
                            const ds = mt.dates?.protocoloSetorRequisitante?.defined;
                            const checks = mt.dates?._date_checks || {};
                            const isOk = !!checks["protocoloSetorRequisitante.defined"];
                            const dObj = new Date(ds);
                            const diff = Math.ceil((dObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                            let statusText = isOk ? 'Cumprido' : (diff < 0 ? `Atrasado ${Math.abs(diff)}d` : `Faltam ${diff}d`);
                            let color = isOk ? '#22c55e' : (diff < 0 ? '#ef4444' : '#64748b');

                            return `
                                                        <tr style="border-bottom: 1px solid #f1f5f9;">
                                                            <td style="padding: 12px; font-size: 12px; color: #1e293b;"><strong>${mt.number || '---'}</strong><br><span style="color: #64748b; font-size: 10px;">${mt.description}</span></td>
                                                            <td style="padding: 12px; font-size: 12px; color: #475569;">${mt.requester_sector}</td>
                                                            <td style="padding: 12px; font-size: 12px; text-align: center; color: #475569;">${dObj.toLocaleDateString('pt-BR')}</td>
                                                            <td style="padding: 12px; font-size: 11px; text-align: center; color: ${color}; font-weight: bold;">${statusText}</td>
                                                        </tr>
                                                    `;
                        }).join('')}
                                            </tbody>
                                        </table>
                                        <p style="font-size: 12px; color: #64748b; font-style: italic; margin-top: 25px; text-align: center;">
                                            * Para detalhes atualizados, acesse sempre o sistema <a href="https://radar-jet.vercel.app" style="color: #1A1A1A; font-weight: bold;">Radar</a>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        `
                    });
                    notificationsSent.push({ to: recipient.email, tender: 'RELP_MENSAL', type: 'MONTHLY_SUMMARY' });
                }
            }
        }


        return NextResponse.json({
            success: true,
            date: todayStr,
            notificationsCount: notificationsSent.length,
            details: notificationsSent
        });

    } catch (error: any) {

        console.error('Cron job error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
