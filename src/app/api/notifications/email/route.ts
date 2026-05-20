import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { to, subject, html } = await request.json();
        console.log(`Sending email to: ${to}`);

        if (!process.env.RESEND_API_KEY) {
            console.error('RESEND_API_KEY is not defined');
            return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
            from: 'Radar <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('Resend API Error:', error);
            return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
