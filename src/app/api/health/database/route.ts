import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        return NextResponse.json({ ok: false }, { status: 503, headers: noStoreHeaders });
    }

    try {
        const admin = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error } = await admin
            .from('class_consolidation_columns')
            .select('id', { count: 'exact', head: true })
            .limit(1);

        if (error) throw error;

        return NextResponse.json(
            { ok: true, checkedAt: new Date().toISOString() },
            { headers: noStoreHeaders }
        );
    } catch {
        return NextResponse.json({ ok: false }, { status: 503, headers: noStoreHeaders });
    }
}
