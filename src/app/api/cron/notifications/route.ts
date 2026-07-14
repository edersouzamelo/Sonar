import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(`${dateStr}T00:00:00`);
    deadline.setHours(0, 0, 0, 0);
    if (Number.isNaN(deadline.getTime())) return null;
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateStr: string) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR');

const buildEmailHtml = (recipientName: string, deadline: any, diffDays: number) => `
    <div style="font-family: Arial, sans-serif; background: #f4f7f9; padding: 32px; color: #334155;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: #1A1A1A; padding: 24px; border-bottom: 4px solid #FFB000;">
                <h1 style="margin: 0; color: #ffffff; font-size: 22px;">SONAR</h1>
                <p style="margin: 6px 0 0; color: #FFB000; font-size: 12px; font-weight: 700;">Alerta automatico de agenda</p>
            </div>
            <div style="padding: 28px;">
                <h2 style="margin-top: 0; color: #0f172a;">Ola, ${recipientName}</h2>
                <p>Um prazo extraido de Ordem de Servico esta se aproximando.</p>
                <div style="margin: 24px 0; padding: 18px; border-left: 4px solid #1A1A1A; background: #f8fafc;">
                    <p style="margin: 0; font-size: 17px; font-weight: 700; color: #1e293b;">${deadline.title}</p>
                    <p style="margin: 10px 0 0; color: #475569;">
                        ${diffDays === 0 ? 'Vence hoje' : `Faltam ${diffDays} dia(s)`}: ${formatDate(deadline.due_date)}
                    </p>
                </div>
                <p><strong>Arquivo:</strong> ${deadline.source_file || 'Nao informado'}</p>
                <div style="text-align: center; margin-top: 28px;">
                    <a href="https://radar-jet.vercel.app/agenda" style="background: #1A1A1A; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: 700;">Acessar agenda</a>
                </div>
            </div>
        </div>
    </div>
`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const testEmail = searchParams.get('testEmail');

    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');

        const resend = new Resend(process.env.RESEND_API_KEY);
        const todayStr = new Date().toISOString().split('T')[0];

        const { data: deadlines, error: deadlinesError } = await supabase
            .from('service_order_deadlines')
            .select('id, title, due_date, source_file')
            .gte('due_date', todayStr);

        if (deadlinesError) throw deadlinesError;

        const { data: team, error: teamError } = await supabase
            .from('team_members')
            .select('name, email, type');

        if (teamError) throw teamError;

        const recipients = testEmail
            ? [{ name: 'Teste', email: testEmail }]
            : (team || []).filter(member => member.type === 'supervisor' && member.email);

        const notificationsSent: Array<{ to: string; source: string; title: string }> = [];

        for (const deadline of deadlines || []) {
            const diffDays = getDaysUntil(deadline.due_date);
            if (diffDays === null || ![5, 1, 0].includes(diffDays)) continue;

            for (const recipient of recipients) {
                await resend.emails.send({
                    from: 'SONAR <notificacoes@resend.dev>',
                    to: [recipient.email],
                    subject: `[SONAR] Prazo de OS: ${diffDays === 0 ? 'vence hoje' : `faltam ${diffDays} dia(s)`}`,
                    html: buildEmailHtml(recipient.name || 'usuario', deadline, diffDays),
                });
                notificationsSent.push({
                    to: recipient.email,
                    source: deadline.source_file || 'OS',
                    title: deadline.title,
                });
            }
        }

        return NextResponse.json({
            success: true,
            source: 'service_order_deadlines',
            date: todayStr,
            notificationsCount: notificationsSent.length,
            details: notificationsSent,
        });
    } catch (error: any) {
        console.error('Cron job error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
