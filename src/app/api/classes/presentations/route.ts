import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { addPresentationAsset, addSlide, addSlideFromLibrary, createChartSlideFromAsset, createConsolidatedPresentation, createPresentation, createPresentationTemplate, createTableSlideFromAsset, deletePresentation, deleteSlide, duplicatePresentation, getPresentationWorkspaceSnapshot, presentationStatuses, removePresentationAsset, saveSlideToLibrary, slideTypes, updatePresentation, updateSlide } from "@/lib/presentations/store";
import type { PresentationSlide, SlideType } from "@/lib/presentations/types";
import { supplyClasses } from "@/lib/supply-classes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    if (isLocalDevRequest(req)) {
        return { id: "local-dev", email: "local-dev@sonar.local" };
    }

    const token = getBearerToken(req);
    if (!token) throw new Error("Sessao ausente.");

    const { data, error } = await getAdminClient().auth.getUser(token);
    if (error || !data.user?.email) throw new Error("Sessao invalida.");
    return data.user;
};

const jsonResponse = (extra: Record<string, unknown> = {}) => NextResponse.json({
    ...extra,
    workspace: getPresentationWorkspaceSnapshot(),
    statuses: presentationStatuses,
    slideTypes,
    classes: supplyClasses,
});

const canReadAsText = (fileName: string, mimeType: string) =>
    mimeType.startsWith("text/") || /\.(csv|txt|md|json|xml)$/i.test(fileName);

const readFormFile = async (file: File) => {
    const buffer = Buffer.from(await file.arrayBuffer());
    return {
        buffer,
        text: canReadAsText(file.name, file.type || "") ? buffer.toString("utf8") : "",
    };
};

const statusForError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || "");
    return message.includes("Sessao") ? 401 : 500;
};

export async function GET(req: NextRequest) {
    try {
        await requireUser(req);
        return jsonResponse();
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar apresentacoes." }, { status: statusForError(error) });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await requireUser(req);
        const presentationId = req.nextUrl.searchParams.get("presentationId") || "";
        const assetId = req.nextUrl.searchParams.get("assetId") || "";

        if (assetId) {
            if (!presentationId) return NextResponse.json({ error: "Apresentacao invalida." }, { status: 400 });
            return jsonResponse({ asset: removePresentationAsset(presentationId, assetId) });
        }

        if (!presentationId) return NextResponse.json({ error: "Apresentacao invalida." }, { status: 400 });
        return jsonResponse({ presentation: deletePresentation(presentationId) });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao excluir." }, { status: statusForError(error) });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireUser(req);
        const actor = user.email || user.id;
        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const action = String(formData.get("action") || "uploadAsset");
            const file = formData.get("file");

            if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });

            const { buffer, text } = await readFormFile(file);
            const contentBase64 = buffer.toString("base64");

            if (action === "uploadTemplate") {
                const template = createPresentationTemplate({
                    name: String(formData.get("name") || file.name.replace(/\.[^.]+$/, "") || "Modelo"),
                    purpose: String(formData.get("purpose") || "Modelo importado para apresentacoes."),
                    classKey: String(formData.get("classKey") || "") || undefined,
                    isGlobal: String(formData.get("isGlobal") || "true") === "true",
                    isDefault: String(formData.get("isDefault") || "false") === "true",
                    fileName: file.name,
                    contentBase64,
                    actorId: actor,
                });

                return jsonResponse({ template });
            }

            const presentationId = String(formData.get("presentationId") || "");
            if (!presentationId) return NextResponse.json({ error: "Apresentacao invalida." }, { status: 400 });

            const asset = addPresentationAsset({
                presentationId,
                fileName: file.name,
                mimeType: file.type || "application/octet-stream",
                sizeBytes: file.size,
                contentBase64,
                textContent: text,
                actorId: actor,
                slideId: String(formData.get("slideId") || "") || undefined,
            });

            return jsonResponse({ asset });
        }

        const body = await req.json();
        const action = String(body.action || "");

        if (action === "createPresentation") {
            const presentation = createPresentation({
                title: String(body.title || "Nova apresentacao"),
                classKey: String(body.classKey || "classe-ii-material-de-intendencia"),
                context: String(body.context || "Briefing logistico"),
                presentationDate: body.presentationDate ? String(body.presentationDate) : undefined,
                notes: body.notes ? String(body.notes) : undefined,
                templateId: body.templateId ? String(body.templateId) : undefined,
                modelName: body.modelName ? String(body.modelName) : undefined,
                responsible: String(body.responsible || actor),
                isConsolidated: Boolean(body.isConsolidated),
            }, actor);
            return jsonResponse({ presentation });
        }

        if (action === "createPlanningDemand") {
            const title = String(body.title || "Nova palestra").trim();
            const context = String(body.context || "Demanda da Secao de Planejamento").trim();
            const presentationDate = body.presentationDate ? String(body.presentationDate) : undefined;
            const workspace = getPresentationWorkspaceSnapshot();
            const presentations = supplyClasses.map(supplyClass => {
                const existing = workspace.presentations.find(presentation =>
                    !presentation.isConsolidated &&
                    presentation.classKey === supplyClass.key &&
                    presentation.title.trim() === title &&
                    presentation.context.trim() === context,
                );
                return existing || createPresentation({
                    title,
                    classKey: supplyClass.key,
                    context,
                    presentationDate,
                    notes: "Demanda criada pela Secao de Planejamento.",
                    responsible: supplyClass.shortLabel,
                }, actor);
            });
            return jsonResponse({ presentations });
        }

        if (action === "updatePresentation") {
            const presentation = updatePresentation(String(body.presentationId || ""), body.patch || {});
            return jsonResponse({ presentation });
        }

        if (action === "updatePlanningGroup") {
            const title = String(body.title || "").trim();
            const context = String(body.context || "").trim();
            if (!title || !context) throw new Error("Palestra invalida.");
            const workspace = getPresentationWorkspaceSnapshot();
            const group = workspace.presentations.filter(presentation =>
                !presentation.isConsolidated &&
                presentation.title.trim() === title &&
                presentation.context.trim() === context,
            );
            const reference = group[0];
            const presentations = supplyClasses.map(supplyClass => {
                const existing = group.find(presentation => presentation.classKey === supplyClass.key);
                const target = existing || createPresentation({
                    title,
                    classKey: supplyClass.key,
                    context,
                    presentationDate: reference?.presentationDate,
                    notes: "Demanda criada pela Secao de Planejamento.",
                    responsible: supplyClass.shortLabel,
                }, actor);
                return updatePresentation(target.id, body.patch || {});
            });
            return jsonResponse({ presentations });
        }

        if (action === "deletePresentation") {
            const presentation = deletePresentation(String(body.presentationId || ""));
            return jsonResponse({ presentation });
        }

        if (action === "duplicatePresentation") {
            const presentation = duplicatePresentation(String(body.presentationId || ""));
            return jsonResponse({ presentation });
        }

        if (action === "addSlide") {
            const slide = addSlide(String(body.presentationId || ""), String(body.slideType || "livre") as SlideType, {
                copyFromSlideId: body.copyFromSlideId ? String(body.copyFromSlideId) : undefined,
            });
            return jsonResponse({ slide });
        }

        if (action === "addSlideFromLibrary") {
            const slide = addSlideFromLibrary(String(body.presentationId || ""), String(body.libraryItemId || ""));
            return jsonResponse({ slide });
        }

        if (action === "updateSlide") {
            const slide = updateSlide(String(body.presentationId || ""), String(body.slideId || ""), body.patch as Partial<PresentationSlide>);
            return jsonResponse({ slide });
        }

        if (action === "deleteSlide") {
            const slide = deleteSlide(String(body.presentationId || ""), String(body.slideId || ""));
            return jsonResponse({ slide });
        }

        if (action === "createTableFromAsset") {
            const slide = createTableSlideFromAsset(String(body.presentationId || ""), String(body.assetId || ""), actor);
            return jsonResponse({ slide });
        }

        if (action === "createChartFromAsset") {
            const slide = createChartSlideFromAsset(String(body.presentationId || ""), String(body.assetId || ""), actor);
            return jsonResponse({ slide });
        }

        if (action === "saveSlideToLibrary") {
            const libraryItem = saveSlideToLibrary(String(body.presentationId || ""), String(body.slideId || ""), actor);
            return jsonResponse({ libraryItem });
        }

        if (action === "createConsolidated") {
            const presentation = createConsolidatedPresentation({
                title: String(body.title || "Briefing consolidado"),
                context: String(body.context || "Consolidacao CCOL"),
                selectedSlideIds: Array.isArray(body.selectedSlideIds) ? body.selectedSlideIds.map(String) : [],
                actorId: actor,
            });
            return jsonResponse({ presentation });
        }

        return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar apresentacao." }, { status: statusForError(error) });
    }
}
