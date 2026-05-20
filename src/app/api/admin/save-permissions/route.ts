import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Cliente com service role — bypassa RLS completamente
const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!serviceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.');
    }
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
};

export async function POST(req: NextRequest) {
    try {
        const { memberId, permissions, profileId } = await req.json();

        if (!memberId || !permissions) {
            return NextResponse.json({ error: 'memberId e permissions são obrigatórios' }, { status: 400 });
        }

        const admin = getAdminClient();

        // Salva em team_members (sempre)
        const { error: tmErr } = await admin
            .from('team_members')
            .update({ permissions })
            .eq('id', memberId);

        if (tmErr) {
            console.error('[API] Erro team_members:', tmErr);
            return NextResponse.json({ error: tmErr.message }, { status: 500 });
        }

        // Sincroniza em profiles se tiver login (opcional)
        if (profileId) {
            const { error: pErr } = await admin
                .from('profiles')
                .update({ permissions })
                .eq('id', profileId);
            if (pErr) console.warn('[API] Aviso profiles:', pErr.message);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[API] Erro inesperado:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
