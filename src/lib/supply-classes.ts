export type SupplyClass = {
    key: string;
    shortLabel: string;
    label: string;
    description: string;
};

export const supplyClasses: SupplyClass[] = [
    {
        key: "classe-i-generos",
        shortLabel: "Classe I",
        label: "Classe I (Generos)",
        description: "Generos de subsistencia.",
    },
    {
        key: "classe-ii-material-de-intendencia",
        shortLabel: "Classe II",
        label: "Classe II (Material de Intendencia)",
        description: "Material de intendencia.",
    },
    {
        key: "classe-iii-combustiveis",
        shortLabel: "Classe III",
        label: "Classe III (Combustiveis)",
        description: "Combustiveis, oleos e lubrificantes.",
    },
    {
        key: "classe-iv-construcao",
        shortLabel: "Classe IV",
        label: "Classe IV (Construcao)",
        description: "Material de construcao e engenharia.",
    },
    {
        key: "classe-v-armamento",
        shortLabel: "Classe V",
        label: "Classe V (Armamento)",
        description: "Armamento.",
    },
    {
        key: "classe-v-municao",
        shortLabel: "Classe V",
        label: "Classe V (Municao)",
        description: "Municao.",
    },
    {
        key: "classe-vi-material-de-engenharia",
        shortLabel: "Classe VI",
        label: "Classe VI (Material de Engenharia)",
        description: "Material de engenharia.",
    },
    {
        key: "classe-vii-comunicacoes",
        shortLabel: "Classe VII",
        label: "Classe VII (Comunicacoes)",
        description: "Material de comunicacoes, eletronica e informatica.",
    },
    {
        key: "classe-viii-saude-e-pasa",
        shortLabel: "Classe VIII",
        label: "Classe VIII (Saude e PASA)",
        description: "Material de saude.",
    },
    {
        key: "classe-ix-motomecanizacao",
        shortLabel: "Classe IX",
        label: "Classe IX (Motomecanizacao)",
        description: "Material de motomecanizacao.",
    },
    {
        key: "classe-x-outras-classes",
        shortLabel: "Classe X",
        label: "Classe X (Outras Classes)",
        description: "Outros materiais e suprimentos.",
    },
];

export const defaultSupplyClassKey = "classe-ii-material-de-intendencia";

export const supplyClassByKey = new Map(supplyClasses.map(item => [item.key, item]));

export const getSupplyClass = (key?: string | null) =>
    supplyClassByKey.get(key || "") || supplyClassByKey.get(defaultSupplyClassKey)!;
