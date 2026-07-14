import type { SupplyClass } from "@/lib/supply-classes";

export type PresentationStatus = "Rascunho" | "Em elaboracao" | "Pronta" | "Conferido" | "Arquivada";
export type SlideType = "capa" | "livre" | "indicadores" | "tabela" | "grafico" | "processos" | "alerta" | "imagem" | "branco";
export type ProcessingStatus = "pendente" | "processado" | "erro" | "armazenado";
export type AssetType = "dados" | "documento" | "imagem" | "modelo" | "outro";
export type DataOrigin = "importado" | "digitado" | "calculado" | "ia_sugerido" | "demonstrativo";

export type DataProvenance = {
    origin: DataOrigin;
    sourceLabel: string;
    fileName?: string;
    sheetName?: string;
    columns?: string[];
    range?: string;
    filter?: string;
    importedAt?: string;
    calculatedAt?: string;
    confirmedBy?: string;
    note?: string;
};

export type PresentationIndicator = {
    id: string;
    name: string;
    value: string;
    percent?: number;
    comparison?: string;
    observation?: string;
    source?: string;
    updatedAt?: string;
    provenance: DataProvenance;
};

export type PresentationTable = {
    columns: string[];
    rows: string[][];
    highlightedRows?: number[];
    totals?: Record<string, string>;
    provenance: DataProvenance;
};

export type PresentationChart = {
    chartType: "barras" | "colunas" | "linha" | "pizza" | "rosca";
    data: Array<{ label: string; value: number; percent?: number }>;
    provenance: DataProvenance;
};

export type ProcessRow = {
    id: string;
    process: string;
    object: string;
    situation: string;
    responsible: string;
    deadline: string;
    pending: string;
    nextStep: string;
    observation: string;
};

export type AlertContent = {
    fact: string;
    impact: string;
    risk: string;
    action: string;
    decisionRequired: string;
};

export type PresentationSlideContent = {
    title: string;
    subtitle?: string;
    body?: string;
    notes?: string;
    indicators?: PresentationIndicator[];
    table?: PresentationTable;
    chart?: PresentationChart;
    processes?: ProcessRow[];
    alert?: AlertContent;
    image?: {
        assetId?: string;
        title?: string;
        caption?: string;
        observation?: string;
    };
};

export type PresentationSlide = {
    id: string;
    presentationId: string;
    title: string;
    slideType: SlideType;
    position: number;
    content: PresentationSlideContent;
    isHidden: boolean;
    publishToMonitor: boolean;
    monitorDuration: number;
    backgroundColor: string;
    textColor?: string;
    textBox?: {
        x: number;
        y: number;
        width: number;
    };
    backgroundImage?: {
        dataUrl: string;
        fileName: string;
    };
    showFooter: boolean;
    classIdentification: string;
    referenceDate?: string;
    dataSource?: string;
    updatedAt: string;
    librarySourceId?: string;
};

export type PresentationAsset = {
    id: string;
    presentationId: string;
    slideId?: string;
    fileName: string;
    originalFileName: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
    assetType: AssetType;
    processingStatus: ProcessingStatus;
    uploadedBy: string;
    uploadedAt: string;
    processedAt?: string;
    errorMessage?: string;
    extractedText?: string;
    parsedPreview?: {
        columns: string[];
        rows: string[][];
        sheetName?: string;
        numericColumns: string[];
    };
    contentBase64?: string;
};

export type PresentationTemplate = {
    id: string;
    name: string;
    purpose: string;
    classKey?: string;
    filePath: string;
    isGlobal: boolean;
    isDefault: boolean;
    archived: boolean;
    layouts: Array<{ id: string; name: string; markers: string[] }>;
    configuration: Record<string, string>;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
};

export type ClassPresentation = {
    id: string;
    title: string;
    classKey: string;
    context: string;
    presentationDate?: string;
    status: PresentationStatus;
    templateId?: string;
    modelName: string;
    responsible: string;
    notes?: string;
    backgroundImage?: {
        dataUrl: string;
        fileName: string;
    };
    openingDeck?: {
        fileName: string;
        mimeType: string;
        contentBase64: string;
        uploadedAt: string;
    };
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    archivedAt?: string;
    isConsolidated: boolean;
    slides: PresentationSlide[];
    assets: PresentationAsset[];
};

export type SlideLibraryItem = {
    id: string;
    classKey: string;
    title: string;
    slideType: SlideType;
    content: PresentationSlideContent;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    usedInPresentationIds: string[];
};

export type PresentationWorkspace = {
    presentations: ClassPresentation[];
    templates: PresentationTemplate[];
    slideLibrary: SlideLibraryItem[];
};

export type PresentationClassOption = SupplyClass & {
    monitorHref: string;
};
