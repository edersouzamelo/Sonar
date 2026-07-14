import { NextResponse } from 'next/server';
// @ts-ignore
import pdfParse from 'pdf-parse';
import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('file') as File[];
        
        let totalDisponivel = 0;
        let totalALiquidar = 0;
        let totalEmLiquidacao = 0;
        let totalLiquidado = 0;
        let totalPago = 0;

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.pdf')) {
                const data = await pdfParse(buffer);
                const text = data.text;
                
                // Regex to find 5 consecutive monetary values in Brazilian format (e.g. 1.000,00) without spaces.
                // Example format: 1,87478,130,000,000,0099.61%0.00%
                const regex = /((?:\d{1,3}\.)*\d+,\d{2})((?:\d{1,3}\.)*\d+,\d{2})((?:\d{1,3}\.)*\d+,\d{2})((?:\d{1,3}\.)*\d+,\d{2})((?:\d{1,3}\.)*\d+,\d{2})/g;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const parseVal = (str: string) => {
                        const val = parseFloat(str.replace(/\./g, '').replace(',', '.'));
                        return isNaN(val) ? 0 : val;
                    };
                    totalDisponivel += parseVal(match[1]);
                    totalALiquidar += parseVal(match[2]);
                    totalEmLiquidacao += parseVal(match[3]);
                    totalLiquidado += parseVal(match[4]);
                    totalPago += parseVal(match[5]);
                }
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
                const workbook = xlsx.read(buffer, { type: 'buffer' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = xlsx.utils.sheet_to_json<any>(worksheet, { header: 1 });
                
                let disponivelIndex = -1;
                let aLiquidarIndex = -1;
                let emLiquidacaoIndex = -1;
                let liquidadoIndex = -1;
                let pagoIndex = -1;
                
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i] as string[];
                    // Find header row
                    if (disponivelIndex === -1) {
                        for (let j = 0; j < row.length; j++) {
                            if (typeof row[j] === 'string') {
                                const header = row[j].toUpperCase();
                                if (header.includes('DISPONIVEL') || header.includes('DISPONÍVEL')) disponivelIndex = j;
                                else if (header.includes('A LIQUIDAR')) aLiquidarIndex = j;
                                else if (header.includes('EM LIQUIDACAO') || header.includes('EM LIQUIDAÇÃO')) emLiquidacaoIndex = j;
                                else if (header.includes('LIQUIDADO')) liquidadoIndex = j;
                                else if (header.includes('PAGO')) pagoIndex = j;
                            }
                        }
                    } else {
                        // Data row
                        const parseExcelVal = (idx: number) => {
                            if (idx === -1) return 0;
                            if (row && row.length > idx) {
                                let val = row[idx];
                                if (typeof val === 'number') return val;
                                if (typeof val === 'string') {
                                    const parsedVal = parseFloat(val.replace(/\./g, '').replace(',', '.'));
                                    if (!isNaN(parsedVal)) return parsedVal;
                                }
                            }
                            return 0;
                        };

                        totalDisponivel += parseExcelVal(disponivelIndex);
                        totalALiquidar += parseExcelVal(aLiquidarIndex);
                        totalEmLiquidacao += parseExcelVal(emLiquidacaoIndex);
                        totalLiquidado += parseExcelVal(liquidadoIndex);
                        totalPago += parseExcelVal(pagoIndex);
                    }
                }
            }
        }

        return NextResponse.json({ 
            totalDisponivel,
            totalALiquidar,
            totalEmLiquidacao,
            totalLiquidado,
            totalPago
        });

    } catch (error) {
        console.error('Error parsing SAG file:', error);
        return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }
}
