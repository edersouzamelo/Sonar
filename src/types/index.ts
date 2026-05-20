export type TenderStatus =
    | 'PLANEJADO'
    | 'CANCELADO POR ABANDONO'
    | 'CANCELADO POR REVOGAÇÃO'
    | 'CANCELADO POR DUPLICIDADE DE OBJETO'
    | 'FASE INTERNA NA OMDS'
    | 'FASE INTERNA NA SAL'
    | 'FASE INTERNA - IRP'
    | 'FASE INTERNA NA CJU'
    | 'FASE INTERNA - CORREÇÕES PARA PUBLICAÇÃO'
    | 'FASE EXTERNA - EDITAL PUBLICADO'
    | 'FASE EXTERNA - ABERTURA E JULGAMENTO DAS PROPOSTAS'
    | 'FASE EXTERNA - LANCES'
    | 'FASE EXTERNA - RECURSOS E JULGAMENTO DE ADMISSIBILIDADE'
    | 'FASE EXTERNA - PARCIALMENTE HOMOLOGADO'
    | 'HOMOLOGADO'
    | 'ABANDONADO';

export type TenderStage =
    | 'Edital Publicado'
    | 'Acolhimento de Propostas'
    | 'Abertura de Propostas'
    | 'Disputa'
    | 'Julgamento'
    | 'Habilitação'
    | 'Adjudicação'
    | 'Homologação'
    | '8. Adjudicação e Homologação'
    | '7.2 Resposta a Recurso'
    | '3. Envio para CJU'
    | '4.1 Regresso da CONJUR'
    | '5. Ajuste para publicação na OMDS'
    | '9. Abandonado'
    | '1.2 Nomeação da Equipe de Planejamento'
    | '1. Entrada do TR pelo Set Req'
    | '1. Entrada do TR na SAL'
    | '6. Publicação do Aviso de Licitação'
    | '5.1 Ajuste para publicação na SAL'
    | 'A cargo do 9º B Sup'
    | '0. DIEx com alerta de prazo para OMDS 5 dias antes'
    | '7. Fase  Externa'
    | '8 Adjudicação e Homologação'
    | '8 Adjudicação e Homologação'
    | '9 Abandonado';

export interface TenderUpdate {
    id: string;
    date: string;
    description: string;
    author: string;
    type: 'info' | 'warning' | 'alert' | 'success';
}

export interface TenderObservation {
    id: string;
    date: string;
    author: string;
    content: string;
}

export interface TenderDates {
    // Protocolo Inicial do Setor Requisitante na SALC
    protocoloSetorRequisitante?: {
        defined?: string;  // Prazo definido
        executed?: string; // Prazo executado
    };
    // Fase Interna Preliminar da SALC até envio para CJU
    faseInternaSALC?: {
        defined?: string;
        executed?: string;
    };
    // Retorno da CJU
    retornoCJU?: {
        estimated?: string; // Prazo estimado
        occurred?: string;  // Prazo ocorrido
    };
    // Ajustes até Publicação pela SALC
    ajustesPublicacao?: {
        defined?: string;
        executed?: string;
    };
    // Início da Sessão Pública pela SALC
    inicioSessaoPublica?: {
        defined?: string;
        executed?: string;
    };
    // Homologação pela SALC
    homologacao?: {
        defined?: string;
        executed?: string;
    };
    // Vigência do Pregão Anterior
    vigenciaAnterior?: string;
    // Prazo do GCALC
    prazoGCALC?: string;

    minutesSignatureDeadline?: string; // Prazo de assinatura das atas
    cjuSendDeadline?: string;
    cjuReturnDate?: string;
    publicationAdjustmentsDeadline?: string;
    publicationDate?: string;
    proposalOpeningDate?: string;
    homologationForecast?: string;
    homologationDeadline?: string;
    _date_checks?: Record<string, boolean>; // Controle interno de conferência de datas
}

export type UserRole =
    | 'Administrador'
    | 'Ordenador de Despesas'
    | 'Agente Diretor'
    | 'Chefe da Seção de Licitações'
    | 'Pregoeiro'
    | 'Auxiliar'
    | 'Setor Requisitante';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    department?: string;
    avatar?: string;
}

export interface Subscriber {
    id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    preferences: {
        email: boolean;
        whatsapp: boolean;
        sms: boolean;
    };
    createdAt: string;
}

export interface NotificationLog {
    id: string;
    subscriberId: string;
    subscriberName: string;
    tenderNumber: string;
    channel: 'email' | 'whatsapp' | 'sms';
    type: '30_days' | '5_days' | 'deadline';
    sentAt: string;
    status: 'sent' | 'failed';
}

export interface Person {
    id: string;
    name: string;
    role: string;
    whatsapp: string;
    email: string;
    sector: string; // Setor Requisitante vinculado
}

export interface Pregoeiro {
    id: string;
    name: string;
    role: string;
    whatsapp: string;
    email: string;
}

export interface Supervisor {
    id: string;
    name: string;
    role: string;
    whatsapp: string;
    email: string;
    organization: string; // Órgão de supervisão (ex: CGU, TCU, etc)
}

export interface Tender {
    id: string;
    uasg: string;
    number: string; // e.g., "90/2024"
    nup?: string; // NUP: 17 digits
    description: string;
    department: string; // e.g., "Divisão de Logística"
    openingDate: string; // Data da sessão pública
    estimatedValue?: number;
    status: TenderStatus;
    currentStage: TenderStage;
    hasIssues: boolean;
    updates: TenderUpdate[];
    // Campos de controle e datas
    isGCALC?: boolean;
    dates?: TenderDates;
    observations?: TenderObservation[];

    // Novos campos de gestão e responsabilidade (Planilha)
    coord?: string;
    section?: string;
    responsibleInternal?: string;
    responsibleExternal?: string;
    pregoeiro?: string;
    biPublication?: string;
    optimizationNotes?: string;
    nextDeadline?: string;
    nextActivity?: string;
    intercurrences?: string;
    commitment?: 'GCALC' | 'PCA da OM' | 'Operação Perseu' | 'Outros';
    requesterSector?: '9º B Mnt' | '9º B Sup' | '18º B Trnp' | 'Cia Cmdo' | 'Cia C' | '9º B Sau' | 'Cmdo 9º Gpt' | 'A definir';
    coordinator?: 'CAF' | 'CCOL' | '9º B Sup' | 'Cia C' | 'A definir';

    // Controle de auditoria
    lastUpdatedAt?: string; // ISO date string
    lastUpdatedBy?: string; // Nome do perfil que fez a última edição
    verificationStatus?: 'OK' | 'Pendente';
    quickNotes?: string;
    assignedPregoeiroId?: string; // ID do pregoeiro vinculado (Geral)
    pregoeiroFaseInternaId?: string; // ID do pregoeiro na Fase Interna
    pregoeiroFaseExternaId?: string; // ID do pregoeiro na Fase Externa
}

export interface AgendaEvent {
    id: string;
    tenderId: string;
    tenderNumber: string;
    label: string;
    date: Date;
    type: 'deadline' | 'effective' | 'forecast';
    isOk: boolean;
    isOverdue: boolean;
    tenderStatus: string;
    uasg: string;
    description: string;
    requesterSector: string;
    daysDiff: number;
}
