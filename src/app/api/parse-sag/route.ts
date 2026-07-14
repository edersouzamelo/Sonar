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
                    const valueStr = match[1].replace(/\./g, '').replace(',', '.');
                    const value = parseFloat(valueStr);
                    if (!isNaN(value)) {
                        totalDisponivel += value;
                    }
                }
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
                const workbook = xlsx.read(buffer, { type: 'buffer' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = xlsx.utils.sheet_to_json<any>(worksheet, { header: 1 });
                
                let disponivelIndex = -1;
                
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i] as string[];
                    // Find header row
                    if (disponivelIndex === -1) {
                        for (let j = 0; j < row.length; j++) {
                            if (typeof row[j] === 'string' && row[j].toUpperCase().includes('DISPONIVEL')) {
                                disponivelIndex = j;
                                break;
                            }
                        }
                    } else {
                        // Data row
                        if (row && row.length > disponivelIndex) {
                            let val = row[disponivelIndex];
                            if (typeof val === 'number') {
                                totalDisponivel += val;
                            } else if (typeof val === 'string') {
                                const parsedVal = parseFloat(val.replace(/\./g, '').replace(',', '.'));
                                if (!isNaN(parsedVal)) totalDisponivel += parsedVal;
                            }
                        }
                    }
                }
            }
        }

        return NextResponse.json({ totalDisponivel });

    } catch (error) {
        console.error('Error parsing SAG file:', error);
        return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }
}
