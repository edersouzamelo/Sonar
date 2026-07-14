import type { ClassPresentation, DataProvenance, PresentationTemplate, PresentationWorkspace, SlideLibraryItem, SlideType } from "@/lib/presentations/types";

const DEMO_DATE = "2026-07-14T12:00:00.000Z";
const DEMO_USER = "operador-demo@sonar.local";
const CLASS_II = "classe-ii-material-de-intendencia";

const demoProvenance = (sourceLabel: string, note?: string): DataProvenance => ({
    origin: "demonstrativo",
    sourceLabel,
    fileName: "SONAR_CLASSE_II_DEMO.csv",
    sheetName: "DADOS_DEMONSTRATIVOS",
    importedAt: DEMO_DATE,
    confirmedBy: DEMO_USER,
    note: note || "Dados sinteticos apenas para demonstrar o fluxo do modulo.",
});

function baseSlide(suffix: string, slideType: SlideType, position: number, title: string, publishToMonitor = false) {
    return {
        id: `slide-classe-ii-${suffix}`,
        presentationId: "presentation-classe-ii-piloto",
        title,
        slideType,
        position,
        isHidden: false,
        publishToMonitor,
        monitorDuration: publishToMonitor ? 18 : 12,
        backgroundColor: "#1A1A1A",
        textColor: "#FFFFFF",
        textBox: { x: 8, y: 18, width: 70 },
        showFooter: true,
        classIdentification: "Classe II - DADOS DEMONSTRATIVOS",
        referenceDate: "2026-07-14",
        dataSource: "Base demonstrativa do piloto SONAR",
        updatedAt: DEMO_DATE,
    };
}

export function createPresentationWorkspace(): PresentationWorkspace {
    const templates: PresentationTemplate[] = [
        {
            id: "template-briefing-logistico",
            name: "Briefing Logistico",
            purpose: "Modelo interno para reunioes regulares do CCOL.",
            classKey: CLASS_II,
            filePath: "sonar/templates/briefing-logistico.pptx",
            isGlobal: true,
            isDefault: true,
            archived: false,
            layouts: [
                { id: "layout-capa", name: "Capa institucional", markers: ["{{TITULO}}", "{{SUBTITULO}}", "{{CLASSE}}", "{{DATA}}"] },
                { id: "layout-conteudo", name: "Conteudo com rodape", markers: ["{{TITULO}}", "{{TEXTO_1}}", "{{TABELA_1}}", "{{GRAFICO_1}}"] },
            ],
            configuration: {
                strategy: "Modelo interno equivalente. Edicao direta de PPTX arbitrario fica para evolucao posterior.",
            },
            createdBy: DEMO_USER,
            createdAt: DEMO_DATE,
            updatedAt: DEMO_DATE,
        },
    ];

    const pilot: ClassPresentation = {
        id: "presentation-classe-ii-piloto",
        title: "Briefing Logistico - Classe II",
        classKey: CLASS_II,
        context: "Piloto do modulo de apresentacoes",
        presentationDate: "2026-07-14",
        status: "Em elaboracao",
        templateId: "template-briefing-logistico",
        modelName: "Briefing Logistico",
        responsible: "Operador demonstrativo",
        notes: "DADOS DEMONSTRATIVOS. Nao utilizar como fonte administrativa.",
        createdBy: DEMO_USER,
        createdAt: DEMO_DATE,
        updatedAt: DEMO_DATE,
        isConsolidated: false,
        assets: [
            {
                id: "asset-classe-ii-demo-csv",
                presentationId: "presentation-classe-ii-piloto",
                fileName: "SONAR_CLASSE_II_DEMO.csv",
                originalFileName: "SONAR_CLASSE_II_DEMO.csv",
                filePath: "memory://presentation-classe-ii-piloto/SONAR_CLASSE_II_DEMO.csv",
                mimeType: "text/csv",
                sizeBytes: 218,
                assetType: "dados",
                processingStatus: "processado",
                uploadedBy: DEMO_USER,
                uploadedAt: DEMO_DATE,
                processedAt: DEMO_DATE,
                extractedText: "Item,Quantidade,Percentual\nLinha demonstrativa A,40,40\nLinha demonstrativa B,35,35\nLinha demonstrativa C,25,25",
                parsedPreview: {
                    columns: ["Item", "Quantidade", "Percentual"],
                    rows: [
                        ["Linha demonstrativa A", "40", "40"],
                        ["Linha demonstrativa B", "35", "35"],
                        ["Linha demonstrativa C", "25", "25"],
                    ],
                    sheetName: "DADOS_DEMONSTRATIVOS",
                    numericColumns: ["Quantidade", "Percentual"],
                },
            },
        ],
        slides: [
            {
                ...baseSlide("capa", "capa", 1, "Capa"),
                content: {
                    title: "Classe II - Material de Intendencia",
                    subtitle: "DADOS DEMONSTRATIVOS | Briefing Logistico",
                    body: "Quadro piloto para reduzir montagem manual de slides no CCOL.",
                    notes: "Substituir por dados oficiais validados antes de uso operacional.",
                },
            },
            {
                ...baseSlide("processos", "processos", 2, "Processos em andamento"),
                content: {
                    title: "Processos em andamento",
                    subtitle: "DADOS DEMONSTRATIVOS",
                    processes: [
                        {
                            id: "processo-demo-1",
                            process: "Processo demonstrativo 01",
                            object: "Objeto nao operacional",
                            situation: "Em elaboracao",
                            responsible: "Responsavel demonstrativo",
                            deadline: "Sem prazo real",
                            pending: "Vinculo administrativo nao identificado",
                            nextStep: "Confirmar fonte oficial",
                            observation: "Nao representa processo real.",
                        },
                        {
                            id: "processo-demo-2",
                            process: "Processo demonstrativo 02",
                            object: "Objeto nao operacional",
                            situation: "Aguardando validacao",
                            responsible: "Responsavel demonstrativo",
                            deadline: "Sem prazo real",
                            pending: "Associacao nao cadastrada",
                            nextStep: "Inserir documento fonte",
                            observation: "Linha sintetica para piloto.",
                        },
                    ],
                },
            },
            {
                ...baseSlide("orcamento", "indicadores", 3, "Execucao orcamentaria"),
                content: {
                    title: "Execucao orcamentaria",
                    subtitle: "DADOS DEMONSTRATIVOS",
                    indicators: [
                        {
                            id: "ind-demo-credito",
                            name: "Credito demonstrativo",
                            value: "Valor nao informado",
                            percent: 0,
                            comparison: "Sem comparacao real",
                            observation: "Aguardando importacao de fonte oficial.",
                            source: "Digitado pelo usuario / demonstracao",
                            updatedAt: DEMO_DATE,
                            provenance: demoProvenance("Campo demonstrativo digitado", "Nenhum valor financeiro real foi inferido."),
                        },
                        {
                            id: "ind-demo-pendencias",
                            name: "Pendencias demonstrativas",
                            value: "2 itens",
                            percent: 20,
                            comparison: "Calculado sobre base demonstrativa",
                            observation: "Percentual sintetico do piloto.",
                            source: "SONAR_CLASSE_II_DEMO.csv",
                            updatedAt: DEMO_DATE,
                            provenance: demoProvenance("Tabela demonstrativa", "Calculo feito por codigo sobre linhas sinteticas."),
                        },
                    ],
                },
            },
            {
                ...baseSlide("tabela", "tabela", 4, "Tabela importada"),
                content: {
                    title: "Tabela importada de planilha",
                    subtitle: "DADOS DEMONSTRATIVOS",
                    table: {
                        columns: ["Item", "Quantidade", "Percentual"],
                        rows: [
                            ["Linha demonstrativa A", "40", "40%"],
                            ["Linha demonstrativa B", "35", "35%"],
                            ["Linha demonstrativa C", "25", "25%"],
                        ],
                        totals: { Quantidade: "100", Percentual: "100%" },
                        provenance: demoProvenance("Arquivo CSV demonstrativo", "Totais calculados por codigo."),
                    },
                },
            },
            {
                ...baseSlide("grafico", "grafico", 5, "Grafico percentual"),
                content: {
                    title: "Grafico percentual",
                    subtitle: "DADOS DEMONSTRATIVOS",
                    chart: {
                        chartType: "barras",
                        data: [
                            { label: "A", value: 40, percent: 40 },
                            { label: "B", value: 35, percent: 35 },
                            { label: "C", value: 25, percent: 25 },
                        ],
                        provenance: demoProvenance("Arquivo CSV demonstrativo", "Percentuais calculados pelo sistema."),
                    },
                },
            },
            {
                ...baseSlide("alerta", "alerta", 6, "Alerta ou pendencia", true),
                content: {
                    title: "Alerta ou pendencia",
                    subtitle: "DADOS DEMONSTRATIVOS",
                    alert: {
                        fact: "Associacao entre codigo e organizacao nao foi identificada na base cadastrada.",
                        impact: "Nao gerar conclusao automatica sem validacao humana.",
                        risk: "Uso indevido de dado nao confirmado em reuniao.",
                        action: "Inserir fonte oficial ou confirmar manualmente antes de publicar.",
                        decisionRequired: "Confirmar se a informacao sera usada na apresentacao final.",
                    },
                },
            },
            {
                ...baseSlide("livre", "livre", 7, "Slide livre"),
                content: {
                    title: "Slide livre",
                    subtitle: "DADOS DEMONSTRATIVOS",
                    body: "Espaco para texto do comando, observacoes e imagens de apoio. O usuario pode duplicar, ocultar, reorganizar ou salvar este slide na biblioteca.",
                },
            },
            {
                ...baseSlide("monitor", "branco", 8, "Slide publicado no monitor", true),
                content: {
                    title: "Monitor da Classe II",
                    subtitle: "DADOS DEMONSTRATIVOS",
                    body: "Slide publicado para TV. Use os controles do editor para ajustar tempo, ocultar temporariamente ou retirar do monitor.",
                },
            },
        ],
    };

    const consolidated: ClassPresentation = {
        ...pilot,
        id: "presentation-ccol-consolidado-demo",
        title: "Briefing Logistico Consolidado",
        classKey: "ccol",
        context: "Consolidacao geral do CCOL",
        responsible: "Consolidador demonstrativo",
        notes: "Apresentacao consolidada de exemplo. DADOS DEMONSTRATIVOS.",
        isConsolidated: true,
        slides: pilot.slides.slice(0, 2).map((slide, index) => ({
            ...slide,
            id: `slide-ccol-demo-${index + 1}`,
            presentationId: "presentation-ccol-consolidado-demo",
            position: index + 1,
            librarySourceId: slide.id,
            publishToMonitor: index === 0,
        })),
        assets: [],
    };

    const slideLibrary: SlideLibraryItem[] = [
        {
            id: "library-classe-ii-alerta",
            classKey: CLASS_II,
            title: "Alerta de associacao nao identificada",
            slideType: "alerta",
            content: pilot.slides[5].content,
            createdBy: DEMO_USER,
            createdAt: DEMO_DATE,
            updatedAt: DEMO_DATE,
            usedInPresentationIds: [pilot.id],
        },
    ];

    return { presentations: [pilot, consolidated], templates, slideLibrary };
}
