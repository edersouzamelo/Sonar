import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { findPresentation } from "@/lib/presentations/store";
import { generatePptx, pptxFileName } from "@/lib/presentations/pptx";

export const dynamic = "force-dynamic";

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) throw new Error("Supabase admin credentials not configured.");
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
};

const getBearerToken = (req: NextRequest) => {
    const authHeader = req.headers.get("authorization") || "";
    return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
};

const isLocalDevRequest = (req: NextRequest) => {
    if (process.env.NODE_ENV !== "development") return false;
    if (req.headers.get("x-sonar-local-dev") !== "true") return false;
    const host = req.headers.get("host") || "";
    return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
};

const requireUser = async (req: NextRequest) => {
    if (isLocalDevRequest(req)) return;

    const token = getBearerToken(req);
    if (!token) throw new Error("Sessao ausente.");
    const { data, error } = await getAdminClient().auth.getUser(token);
    if (error || !data.user?.email) throw new Error("Sessao invalida.");
};

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await requireUser(req);
        const { id } = await context.params;
        const presentation = findPresentation(id);
        if (!presentation) return NextResponse.json({ error: "Apresentacao nao encontrada." }, { status: 404 });

        const fileName = pptxFileName(presentation.title);
        const pptx = generatePptx(presentation);
        return new NextResponse(pptx, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao exportar apresentacao.";
        return NextResponse.json({ error: message }, { status: message.includes("Sessao") ? 401 : 500 });
    }
}
