import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

/**
 * Utilitário para geração de documentos oficiais (SPED, DIEx, etc.)
 */

export interface SpedDocumentData {
    tenderNumber: string;
    uasg: string;
    openingDate: string;
    responsible: string;
    status: string;
}

/**
 * Gera um arquivo de texto formatado conforme o template SPED (Placeholder)
 */
export const generateSpedDocument = (data: SpedDocumentData[]) => {
    let content = "REGISTRO DE AUDITORIA DAS DESPESAS E AQUISIÇÕES REALIZADAS (RADAR)\n";
    content += "DOCUMENTO SPED - CONTROLE DE PRAZOS DOS PREGÕES\n";
    content += "------------------------------------------------------------------\n";
    content += `Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n\n`;

    data.forEach(item => {
        content += `PREGÃO Nº: ${item.tenderNumber} (UASG: ${item.uasg})\n`;
        content += `RESPONSÁVEL: ${item.responsible}\n`;
        content += `ABERTURA: ${new Date(item.openingDate).toLocaleDateString('pt-BR')}\n`;
        content += `STATUS ATUAL: ${item.status}\n`;
        content += `PRAZOS CRÍTICOS (30/5/0 dias): \n`;
        // Adicionar lógica de cálculo de prazos aqui futuramente
        content += `------------------------------------------------------------------\n`;
    });

    content += "\n\nAssinatura do Chefe da SALC: ___________________________\n";

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SPED_Controle_Prazos_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export interface DiexParaData {
    omds: string;
    tenderNumber: string;
    nup: string;
    object: string;
    deadline: string;
    reason: string;
}

/**
 * Gera um documento DIEx (.docx) seguindo o padrão do Exército Brasileiro
 */
export const generateDiexDocument = async (parts: DiexParaData[]) => {
    console.log("Gerando estrutura do documento DOCX...", parts);
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: "Classificação: 004.12", size: 20 }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "MINISTÉRIO DA DEFESA", bold: true, size: 24 }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "EXÉRCITO BRASILEIRO", bold: true, size: 24 }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "COMANDO DO 9º GRUPAMENTO LOGÍSTICO", bold: true, size: 24 }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "(GRUPAMENTO GENERAL PEDRO DE ALCÂNTARA CAVALCANTI DE ALBUQUERQUE)", bold: true, size: 20 }),
                    ],
                }),
                new Paragraph({ text: "", spacing: { before: 400 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `DIEx nº ${Math.floor(Math.random() * 2000)}-SAL/CAF/Cmdo 9º Gpt Log`, bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `EB: 65297.001293/${new Date().getFullYear()}-57`, bold: true }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [
                        new TextRun({ text: "\nURGENTÍSSIMO", bold: true, color: "FF0000" }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: `Campo Grande, MS, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.` }),
                    ],
                }),
                new Paragraph({ text: "", spacing: { before: 400 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Do ", bold: true }),
                        new TextRun({ text: "Chefe do Estado-Maior Interino do 9º Grupamento Logístico" }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Ao ", bold: true }),
                        new TextRun({ text: "Sr Comandante do 9º Batalhão de Manutenção, Comandante do 9º Batalhão de Saúde, Comandante do 18º Batalhão de Transporte, Comandante da Companhia de Comando do 9º Grupamento Logístico, Comandante do 9º Batalhão de Suprimento" }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Assunto: ", bold: true }),
                        new TextRun({ text: `controle de prazos das licitações do 9º Grupamento Logístico (${new Date().toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}/${new Date().getFullYear().toString().slice(-2)})` }),
                    ],
                }),
                new Paragraph({ text: "", spacing: { before: 400 } }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "1. Haja vista a observância ao cumprimento dos prazos das licitações do 9º Grupamento Logístico, disponível nesta planilha, em atendimento às determinações do Cmt 9º Gpt Log contida nos documentos referenciados e na Cartilha de Orientação aos Agentes da Administração - UG Cmdo 9º Gpt Log - Versão 2026, solicito a esse Comandante a adoção das seguintes providências:" }),
                    ],
                }),
                ...parts.map((p, index) => {
                    const letter = String.fromCharCode(97 + index); // a, b, c...
                    return new Paragraph({
                        indent: { left: 720 },
                        spacing: { before: 200 },
                        children: [
                            new TextRun({ text: `${letter}. `, bold: true }),
                            new TextRun({ text: `${p.omds}`, bold: true }),
                            new TextRun({ text: ` - providenciar, ` }),
                            new TextRun({ text: `até ${p.deadline}`, bold: true }),
                            new TextRun({ text: `, ${p.reason} referente ao certame ${p.object}, NUP ${p.nup}.` }),
                        ],
                    });
                }),
                new Paragraph({ text: "", spacing: { before: 1000 } }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "ROBSON JOSÉ OLIVEIRA - Cel", bold: true }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "Chefe do Estado-Maior Interino do 9º Grupamento Logístico" }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: '"160 ANOS DA VITÓRIA DE TUIUTI: A BATALHA DOS PATRONOS"', bold: true }),
                    ],
                }),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `DIEx_NOTIFICACAO_SALC_${new Date().toISOString().split('T')[0]}.docx`);
};
