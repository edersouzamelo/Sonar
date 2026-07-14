import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const BUCKET = 'legal-documents';

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

export async function DELETE(req: NextRequest, context: any) {
    try {
        const admin = getAdminClient();
        const token = getBearerToken(req);
        await requireUser(req, admin);
        const userClient = getUserClient(token);
        const { id } = await context.params;

        const { data: order, error: findError } = await userClient
            .from('legal_documents')
            .select('file_path')
            .eq('id', id)
            .maybeSingle();

        if (findError) throw findError;
        if (!order) return NextResponse.json({ success: true });

        if (order.file_path) await userClient.storage.from(BUCKET).remove([order.file_path]);

        const { error: deleteError } = await userClient
            .from('legal_documents')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.message?.includes('Sessao') ? 401 : 500 });
    }
}
