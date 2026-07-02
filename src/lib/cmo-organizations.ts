export type CmoOrganization = {
    id: string;
    name: string;
    position?: number;
};

export type CmoOrganizationGroup = {
    id: string;
    name: string;
    location: string;
    position?: number;
    units: CmoOrganization[];
};

export const cmoOrganizationGroups: CmoOrganizationGroup[] = [
    {
        id: "cmo-diretas",
        name: "Comando Militar do Oeste / OMs diretamente subordinadas",
        location: "Campo Grande/MS",
        units: [
            { id: "om-cmdo-cmo", name: "Comando do CMO - Campo Grande/MS" },
            { id: "om-badm-ap-cmo", name: "Base de Administração e Apoio do CMO - Campo Grande/MS" },
            { id: "om-cib", name: "Campo de Instrução de Betione - Campo Grande/MS" },
            { id: "om-3-bavex", name: "3º Batalhão de Aviação do Exército - Campo Grande/MS" },
            { id: "om-6-cta", name: "6º Centro de Telemática de Área - Campo Grande/MS" },
            { id: "om-6-bim", name: "6º Batalhão de Inteligência Militar - Campo Grande/MS" },
            { id: "om-9-bcomge", name: "9º Batalhão de Comunicações e Guerra Eletrônica - Campo Grande/MS" },
            { id: "om-9-bpe", name: "9º Batalhão de Polícia do Exército - Campo Grande/MS" },
            { id: "om-cmcg", name: "Colégio Militar de Campo Grande - Campo Grande/MS" },
        ],
    },
    {
        id: "9-rm",
        name: "9ª Região Militar",
        location: "Campo Grande/MS",
        units: [
            { id: "om-cmdo-9-rm", name: "Comando da 9ª Região Militar - Campo Grande/MS" },
            { id: "om-hmilacg", name: "Hospital Militar de Área de Campo Grande - Campo Grande/MS" },
            { id: "om-9-cgcfex", name: "9º Centro de Gestão, Contabilidade e Finanças do Exército - Campo Grande/MS" },
            { id: "om-tg-sinop", name: "Tiro de Guerra de Sinop - Sinop/MT" },
            { id: "om-tg-alta-floresta", name: "Tiro de Guerra de Alta Floresta - Alta Floresta/MT" },
            { id: "om-tg-juara", name: "Tiro de Guerra de Juara - Juara/MT" },
            { id: "om-tg-colider", name: "Tiro de Guerra de Colíder - Colíder/MT" },
        ],
    },
    {
        id: "4-bda-c-mec",
        name: "4ª Brigada de Cavalaria Mecanizada",
        location: "Dourados/MS",
        units: [
            { id: "om-cmdo-4-bda-c-mec", name: "Comando da 4ª Brigada de Cavalaria Mecanizada - Dourados/MS" },
            { id: "om-esqd-cmdo-4-bda-c-mec", name: "Esquadrão de Comando da 4ª Brigada de Cavalaria Mecanizada - Dourados/MS" },
            { id: "om-10-rc-mec", name: "10º Regimento de Cavalaria Mecanizado - Bela Vista/MS" },
            { id: "om-11-rc-mec", name: "11º Regimento de Cavalaria Mecanizado - Ponta Porã/MS" },
            { id: "om-17-rc-mec", name: "17º Regimento de Cavalaria Mecanizado - Amambai/MS" },
            { id: "om-20-rcb", name: "20º Regimento de Cavalaria Blindado - Campo Grande/MS" },
            { id: "om-9-gac", name: "9º Grupo de Artilharia de Campanha - Nioaque/MS" },
            { id: "om-28-b-log", name: "28º Batalhão Logístico - Dourados/MS" },
            { id: "om-3-bia-aae", name: "3ª Bateria de Artilharia Antiaérea - Três Lagoas/MS" },
            { id: "om-4-cia-e-cmb-mec", name: "4ª Companhia de Engenharia de Combate Mecanizada - Jardim/MS" },
            { id: "om-14-cia-com-mec", name: "14ª Companhia de Comunicações Mecanizada - Dourados/MS" },
            { id: "om-4-pel-pe", name: "4º Pelotão de Polícia do Exército - Dourados/MS" },
        ],
    },
    {
        id: "13-bda-inf-mtz",
        name: "13ª Brigada de Infantaria Motorizada",
        location: "Cuiabá/MT",
        units: [
            { id: "om-cmdo-13-bda-inf-mtz", name: "Comando da 13ª Brigada de Infantaria Motorizada - Cuiabá/MT" },
            { id: "om-cia-cmdo-13-bda-inf-mtz", name: "Companhia de Comando da 13ª Brigada de Infantaria Motorizada - Cuiabá/MT" },
            { id: "om-44-bi-mtz", name: "44º Batalhão de Infantaria Motorizado - Cuiabá/MT" },
            { id: "om-58-bi-mtz", name: "58º Batalhão de Infantaria Motorizado - Aragarças/GO" },
            { id: "om-c-fron-jauru-66-bi-mtz", name: "Comando de Fronteira Jauru / 66º Batalhão de Infantaria Motorizado - Cáceres/MT" },
            { id: "om-18-gac", name: "18º Grupo de Artilharia de Campanha - Rondonópolis/MT" },
            { id: "om-13-pel-pe", name: "13º Pelotão de Polícia do Exército - Cuiabá/MT" },
            { id: "om-13-pel-com", name: "13º Pelotão de Comunicações - Cuiabá/MT" },
        ],
    },
    {
        id: "18-bda-inf-pan",
        name: "18ª Brigada de Infantaria de Pantanal",
        location: "Corumbá/MS",
        units: [
            { id: "om-cmdo-18-bda-inf-pan", name: "Comando da 18ª Brigada de Infantaria de Pantanal - Corumbá/MS" },
            { id: "om-cia-cmdo-18-bda-inf-pan", name: "Companhia de Comando da 18ª Brigada de Infantaria de Pantanal - Corumbá/MS" },
            { id: "om-c-fron-pan-17-b-fron", name: "Comando de Fronteira Pantanal / 17º Batalhão de Fronteira - Corumbá/MS" },
            { id: "om-47-bi", name: "47º Batalhão de Infantaria - Coxim/MS" },
            { id: "om-2-cia-fron", name: "2ª Companhia de Fronteira - Porto Murtinho/MS" },
            { id: "om-18-cia-com", name: "18ª Companhia de Comunicações - Corumbá/MS" },
            { id: "om-18-pel-pe", name: "18º Pelotão de Polícia do Exército - Corumbá/MS" },
        ],
    },
    {
        id: "3-gpt-e",
        name: "3º Grupamento de Engenharia",
        location: "Campo Grande/MS",
        units: [
            { id: "om-cmdo-3-gpt-e", name: "Comando do 3º Grupamento de Engenharia - Campo Grande/MS" },
            { id: "om-9-be-cmb", name: "9º Batalhão de Engenharia de Combate - Aquidauana/MS" },
            { id: "om-9-bec", name: "9º Batalhão de Engenharia de Construção - Cuiabá/MT" },
            { id: "om-cro-3-gpt-e", name: "Comissão Regional de Obras / 3º Grupamento de Engenharia - Campo Grande/MS" },
        ],
    },
    {
        id: "9-gpt-log",
        name: "9º Grupamento Logístico",
        location: "Campo Grande/MS",
        units: [
            { id: "om-cmdo-9-gpt-log", name: "Comando do 9º Grupamento Logístico - Campo Grande/MS" },
            { id: "om-cia-cmdo-9-gpt-log", name: "Companhia de Comando do 9º Grupamento Logístico - Campo Grande/MS" },
            { id: "om-9-b-sup", name: "9º Batalhão de Suprimento - Campo Grande/MS" },
            { id: "om-9-b-mnt", name: "9º Batalhão de Manutenção - Campo Grande/MS" },
            { id: "om-9-b-sau", name: "9º Batalhão de Saúde - Campo Grande/MS" },
            { id: "om-18-b-trnp", name: "18º Batalhão de Transporte - Campo Grande/MS" },
        ],
    },
];

export const cmoOrganizations = cmoOrganizationGroups.flatMap(group => group.units);
