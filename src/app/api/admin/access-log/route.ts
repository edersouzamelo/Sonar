import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error("Supabase admin credentials not configured.");
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

export async function POST(request: NextRequest) {
    try {
        const admin = getAdminClient();
        const authHeader = request.headers.get("authorization") || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return NextResponse.json({ ok: false, message: "Sessao ausente." }, { status: 401 });

        const { data: authUser, error: authError } = await admin.auth.getUser(token);
        if (authError || !authUser.user) {
            return NextResponse.json({ ok: false, message: "Sessao invalida." }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const user = authUser.user;
        const email = user.email || body.user_email || "";

        const { error } = await admin.from("access_logs").insert([{
            user_id: user.id,
            user_name: body.user_name || user.user_metadata?.full_name || email.split("@")[0] || "Usuario",
            user_email: email,
            user_role: body.user_role || null,
            page_path: body.page_path || null,
            user_agent: request.headers.get("user-agent") || null,
            accessed_at: new Date().toISOString()
        }]);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, message: error?.message || "Erro ao registrar acesso." }, { status: 200 });
    }
}
