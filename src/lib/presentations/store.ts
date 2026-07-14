import { randomUUID } from "node:crypto";
import { createPresentationWorkspace } from "@/lib/presentations/data";
import { assetTypeFromFile, chartFromPreview, processPresentationFile, sanitizeUploadedFileName, tableFromPreview } from "@/lib/presentations/processing";
import type { ClassPresentation, PresentationAsset, PresentationSlide, PresentationSlideContent, PresentationStatus, PresentationTemplate, PresentationWorkspace, SlideLibraryItem, SlideType } from "@/lib/presentations/types";

const globalForPresentations = globalThis as unknown as { sonarPresentationWorkspace?: PresentationWorkspace };

const now = () => new Date().toISOString();
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function sortSlides(slides: PresentationSlide[]) {
    return slides.sort((a, b) => a.position - b.position);
}

function normalizeSlidePositions(presentation: ClassPresentation) {
    sortSlides(presentation.slides).forEach((slide, index) => {
        slide.position = index + 1;
    });
    presentation.updatedAt = now();
}

export function getPresentationWorkspace() {
    if (!globalForPresentations.sonarPresentationWorkspace) {
        globalForPresentations.sonarPresentationWorkspace = createPresentationWorkspace();
    }
    return globalForPresentations.sonarPresentationWorkspace;
}

export function getPresentationWorkspaceSnapshot() {
    const workspace = getPresentationWorkspace();
    workspace.presentations.forEach(presentation => sortSlides(presentation.slides));
    return clone(workspace);
}

export function findPresentation(presentationId: string) {
    return getPresentationWorkspace().presentations.find(presentation => presentation.id === presentationId);
}

export function findAsset(assetId: string) {
    for (const presentation of getPresentationWorkspace().presentations) {
        const asset = presentation.assets.find(candidate => candidate.id === assetId);
        if (asset) return asset;
    }
    return undefined;
}

function defaultContent(slideType: SlideType, classKey: string): PresentationSlideContent {
    switch (slideType) {
        case "capa":
            return { title: "Nova apresentacao", subtitle: classKey, body: "DADOS DEMONSTRATIVOS quando aplicavel." };
        case "indicadores":
            return {
                title: "Indicadores",
                indicators: [{
                    id: randomUUID(),
                    name: "Indicador",
                    value: "Nao informado",
                    observation: "Preencher com dado confirmado.",
                    provenance: { origin: "digitado", sourceLabel: "Digitado pelo usuario", importedAt: now() },
                }],
            };
        case "tabela":
            return {
                title: "Tabela",
                table: {
                    columns: ["Campo", "Valor"],
                    rows: [["Nao informado", "Nao informado"]],
                    provenance: { origin: "digitado", sourceLabel: "Tabela manual", importedAt: now() },
                },
            };
        case "grafico":
            return {
                title: "Grafico",
                chart: {
                    chartType: "barras",
                    data: [{ label: "Nao informado", value: 0, percent: 0 }],
                    provenance: { origin: "digitado", sourceLabel: "Grafico manual", importedAt: now() },
                },
            };
        case "processos":
            return {
                title: "Processos",
                processes: [{
                    id: randomUUID(),
                    process: "Nao informado",
                    object: "Nao informado",
                    situation: "Nao informado",
                    responsible: "Nao informado",
                    deadline: "Nao informado",
                    pending: "Nao informado",
                    nextStep: "Nao informado",
                    observation: "",
                }],
            };
        case "alerta":
            return {
                title: "Alerta",
                alert: {
                    fact: "Fato nao informado",
                    impact: "Impacto nao informado",
                    risk: "Risco nao informado",
                    action: "Providencia nao informada",
                    decisionRequired: "Decisao nao informada",
                },
            };
        case "imagem":
            return { title: "Imagem", image: { title: "Imagem de apoio", caption: "Legenda nao informada" } };
        case "branco":
            return { title: "Slide em branco", body: "" };
        default:
            return { title: "Slide livre", body: "Texto livre." };
    }
}

function createSlideForPresentation(presentation: ClassPresentation, slideType: SlideType, position = presentation.slides.length + 1, content?: PresentationSlideContent) {
    const timestamp = now();
    const resolvedContent = content || defaultContent(slideType, presentation.classKey);
    return {
        id: `slide-${randomUUID()}`,
        presentationId: presentation.id,
        title: resolvedContent.title,
        slideType,
        position,
        content: resolvedContent,
        isHidden: false,
        publishToMonitor: false,
        monitorDuration: 15,
        backgroundColor: "#1A1A1A",
        textColor: "#FFFFFF",
        textBox: { x: 8, y: 18, width: 70 },
        backgroundImage: presentation.backgroundImage,
        showFooter: true,
        classIdentification: presentation.classKey === "ccol" ? "CCOL" : presentation.classKey,
        referenceDate: presentation.presentationDate,
        dataSource: "Digitado pelo usuario",
        updatedAt: timestamp,
    } satisfies PresentationSlide;
}

export function createPresentation(input: {
    title: string;
    classKey: string;
    context: string;
    presentationDate?: string;
    notes?: string;
    templateId?: string;
    modelName?: string;
    responsible: string;
    isConsolidated?: boolean;
}, actorId: string) {
    const workspace = getPresentationWorkspace();
    const timestamp = now();
    const presentation: ClassPresentation = {
        id: `presentation-${randomUUID()}`,
        title: input.title.trim(),
        classKey: input.classKey,
        context: input.context.trim(),
        presentationDate: input.presentationDate,
        status: "Rascunho",
        templateId: input.templateId,
        modelName: input.modelName || "Modelo livre do CCOL",
        responsible: input.responsible.trim(),
        notes: input.notes,
        createdBy: actorId,
        createdAt: timestamp,
        updatedAt: timestamp,
        isConsolidated: input.isConsolidated || input.classKey === "ccol",
        assets: [],
        slides: [],
    };
    presentation.slides.push(createSlideForPresentation(presentation, "capa", 1));
    workspace.presentations.unshift(presentation);
    return clone(presentation);
}

export function updatePresentation(presentationId: string, patch: Partial<Pick<ClassPresentation, "title" | "context" | "presentationDate" | "status" | "templateId" | "modelName" | "responsible" | "notes" | "backgroundImage" | "openingDeck">> & { slideOrder?: string[] }) {
    const presentation = findPresentation(presentationId);
    if (!presentation) throw new Error("Apresentacao nao encontrada.");
    const { slideOrder, ...presentationPatch } = patch;
    if ("backgroundImage" in presentationPatch && presentationPatch.backgroundImage === null) {
        delete presentation.backgroundImage;
        delete presentationPatch.backgroundImage;
    }
    if ("openingDeck" in presentationPatch && presentationPatch.openingDeck === null) {
        delete presentation.openingDeck;
        delete presentationPatch.openingDeck;
    }
    Object.assign(presentation, presentationPatch);
    if (slideOrder) {
        const order = new Map(slideOrder.map((id, index) => [id, index + 1]));
        presentation.slides.forEach(slide => {
            slide.position = order.get(slide.id) || slide.position;
        });
        normalizeSlidePositions(presentation);
    }
    presentation.updatedAt = now();
    return clone(presentation);
}

export function deletePresentation(presentationId: string) {
    const workspace = getPresentationWorkspace();
    const index = workspace.presentations.findIndex(presentation => presentation.id === presentationId);
    if (index < 0) throw new Error("Apresentacao nao encontrada.");
    return clone(workspace.presentations.splice(index, 1)[0]);
}

export function duplicatePresentation(presentationId: string) {
    const original = findPresentation(presentationId);
    if (!original) throw new Error("Apresentacao nao encontrada.");
    const timestamp = now();
    const copy: ClassPresentation = {
        ...clone(original),
        id: `presentation-${randomUUID()}`,
        title: `${original.title} - copia`,
        status: "Rascunho",
        createdAt: timestamp,
        updatedAt: timestamp,
        slides: original.slides.map(slide => ({ ...clone(slide), id: `slide-${randomUUID()}`, presentationId: "", updatedAt: timestamp })),
        assets: original.assets.map(asset => ({ ...clone(asset), id: `asset-${randomUUID()}`, presentationId: "", uploadedAt: timestamp })),
    };
    copy.slides.forEach(slide => { slide.presentationId = copy.id; });
    copy.assets.forEach(asset => { asset.presentationId = copy.id; });
    getPresentationWorkspace().presentations.unshift(copy);
    return clone(copy);
}

export function addSlide(presentationId: string, slideType: SlideType, options?: { copyFromSlideId?: string; content?: PresentationSlideContent }) {
    const presentation = findPresentation(presentationId);
    if (!presentation) throw new Error("Apresentacao nao encontrada.");
    const source = options?.copyFromSlideId
        ? getPresentationWorkspace().presentations.flatMap(item => item.slides).find(slide => slide.id === options.copyFromSlideId)
        : undefined;
    const slide = source
        ? { ...clone(source), id: `slide-${randomUUID()}`, presentationId, position: presentation.slides.length + 1, title: `${source.title} - copia`, updatedAt: now() }
        : createSlideForPresentation(presentation, slideType, presentation.slides.length + 1, options?.content);
    presentation.slides.push(slide);
    normalizeSlidePositions(presentation);
    return clone(slide);
}

export function updateSlide(presentationId: string, slideId: string, patch: Partial<PresentationSlide>) {
    const presentation = findPresentation(presentationId);
    if (!presentation) throw new Error("Apresentacao nao encontrada.");
    const slide = presentation.slides.find(candidate => candidate.id === slideId);
    if (!slide) throw new Error("Slide nao encontrado.");
    Object.assign(slide, patch, { updatedAt: now() });
    presentation.updatedAt = now();
    return clone(slide);
}

export function deleteSlide(presentationId: string, slideId: string) {
    const presentation = findPresentation(presentationId);
    if (!presentation) throw new Error("Apresentacao nao encontrada.");
    const index = presentation.slides.findIndex(slide => slide.id === slideId);
    if (index < 0) throw new Error("Slide nao encontrado.");
    const [removed] = presentation.slides.splice(index, 1);
    normalizeSlidePositions(presentation);
    return clone(removed);
}

export function addPresentationAsset(args: { presentationId: string; fileName: string; mimeType: string; sizeBytes: number; contentBase64: string; textContent: string; actorId: string; slideId?: string }) {
    const presentation = findPresentation(args.presentationId);
    if (!presentation) throw new Error("Apresentacao nao encontrada.");
    const fileName = sanitizeUploadedFileName(args.fileName);
    const processing = processPresentationFile(fileName, args.mimeType, args.textContent);
    const asset: PresentationAsset = {
        id: `asset-${randomUUID()}`,
        presentationId: args.presentationId,
        slideId: args.slideId,
        fileName,
        originalFileName: args.fileName,
        filePath: `memory://${args.presentationId}/${fileName}`,
        mimeType: args.mimeType,
        sizeBytes: args.sizeBytes,
        assetType: assetTypeFromFile(fileName),
        uploadedBy: args.actorId,
        uploadedAt: now(),
        contentBase64: args.contentBase64,
        ...processing,
    };
    presentation.assets.unshift(asset);
    presentation.updatedAt = now();
    return clone(asset);
}

export function removePresentationAsset(presentationId: string, assetId: string) {
    const presentation = findPresentation(presentationId);
    if (!presentation) throw new Error("Apresentacao nao encontrada.");
    const index = presentation.assets.findIndex(asset => asset.id === assetId);
    if (index < 0) throw new Error("Arquivo nao encontrado.");
    const [removed] = presentation.assets.splice(index, 1);
    presentation.updatedAt = now();
    return clone(removed);
}

export function createTableSlideFromAsset(presentationId: string, assetId: string, actorId: string) {
    const presentation = findPresentation(presentationId);
    const asset = presentation?.assets.find(candidate => candidate.id === assetId);
    if (!presentation || !asset?.parsedPreview) throw new Error("Arquivo processado com tabela nao encontrado.");
    return addSlide(presentationId, "tabela", {
        content: {
            title: `Tabela - ${asset.fileName}`,
            subtitle: "Gerada a partir de arquivo importado",
            table: tableFromPreview(asset.parsedPreview.columns, asset.parsedPreview.rows, asset.fileName, actorId),
        },
    });
}

export function createChartSlideFromAsset(presentationId: string, assetId: string, actorId: string) {
    const presentation = findPresentation(presentationId);
    const asset = presentation?.assets.find(candidate => candidate.id === assetId);
    if (!presentation || !asset?.parsedPreview) throw new Error("Arquivo processado com dados nao encontrado.");
    return addSlide(presentationId, "grafico", {
        content: {
            title: `Grafico - ${asset.fileName}`,
            subtitle: "Gerado por codigo, sem inferencia de IA",
            chart: chartFromPreview(asset.parsedPreview.columns, asset.parsedPreview.rows, asset.fileName, actorId),
        },
    });
}

export function saveSlideToLibrary(presentationId: string, slideId: string, actorId: string) {
    const presentation = findPresentation(presentationId);
    const slide = presentation?.slides.find(candidate => candidate.id === slideId);
    if (!presentation || !slide) throw new Error("Slide nao encontrado.");
    const item: SlideLibraryItem = {
        id: `library-${randomUUID()}`,
        classKey: presentation.classKey,
        title: slide.title,
        slideType: slide.slideType,
        content: clone(slide.content),
        createdBy: actorId,
        createdAt: now(),
        updatedAt: now(),
        usedInPresentationIds: [presentation.id],
    };
    getPresentationWorkspace().slideLibrary.unshift(item);
    return clone(item);
}

export function addSlideFromLibrary(presentationId: string, libraryItemId: string) {
    const workspace = getPresentationWorkspace();
    const item = workspace.slideLibrary.find(candidate => candidate.id === libraryItemId);
    if (!item) throw new Error("Slide da biblioteca nao encontrado.");

    return addSlide(presentationId, item.slideType, {
        content: clone(item.content),
    });
}

export function createPresentationTemplate(args: { name: string; purpose: string; classKey?: string; isGlobal: boolean; isDefault: boolean; fileName: string; contentBase64: string; actorId: string }) {
    const workspace = getPresentationWorkspace();
    const timestamp = now();
    const template: PresentationTemplate = {
        id: `template-${randomUUID()}`,
        name: args.name,
        purpose: args.purpose,
        classKey: args.classKey,
        filePath: `memory://templates/${sanitizeUploadedFileName(args.fileName)}`,
        isGlobal: args.isGlobal,
        isDefault: args.isDefault,
        archived: false,
        layouts: [{ id: `layout-${randomUUID()}`, name: "Layout com marcadores", markers: ["{{TITULO}}", "{{SUBTITULO}}", "{{CLASSE}}", "{{DATA}}", "{{TABELA_1}}", "{{GRAFICO_1}}"] }],
        configuration: {
            originalFileName: args.fileName,
            storageMode: "memory-mvp",
            contentBase64: args.contentBase64,
            limitation: "MVP armazena o PPTX e permite mapeamento interno; edicao segura de qualquer PPTX fica para evolucao.",
        },
        createdBy: args.actorId,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    workspace.templates.unshift(template);
    return clone(template);
}

export function createConsolidatedPresentation(args: { title: string; context: string; selectedSlideIds: string[]; actorId: string }) {
    const presentation = createPresentation({ title: args.title, classKey: "ccol", context: args.context, responsible: "Consolidador", isConsolidated: true }, args.actorId);
    const live = findPresentation(presentation.id);
    if (!live) throw new Error("Falha ao criar apresentacao consolidada.");
    live.slides = [];
    const allSlides = getPresentationWorkspace().presentations.flatMap(item =>
        item.slides.map(slide => ({
            ...slide,
            backgroundImage: slide.backgroundImage || item.backgroundImage,
        })),
    );
    args.selectedSlideIds.forEach(slideId => {
        const source = allSlides.find(slide => slide.id === slideId);
        if (source) {
            live.slides.push({ ...clone(source), id: `slide-${randomUUID()}`, presentationId: live.id, position: live.slides.length + 1, librarySourceId: source.id, publishToMonitor: false, updatedAt: now() });
        }
    });
    if (!live.slides.length) live.slides.push(createSlideForPresentation(live, "capa", 1));
    normalizeSlidePositions(live);
    return clone(live);
}

export const presentationStatuses: PresentationStatus[] = ["Rascunho", "Em elaboracao", "Pronta", "Conferido", "Arquivada"];
export const slideTypes: SlideType[] = ["capa", "livre", "indicadores", "tabela", "grafico", "processos", "alerta", "imagem", "branco"];
