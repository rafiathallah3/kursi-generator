import { NextRequest, NextResponse } from 'next/server';
import { emitter } from '../emitter';

const HEADER_TO_IGNORE = [
    'Unknown_Col_0',
    'Unknown_Col_1',
    'ID number',
    'Email address',
    'Started on',
    'Grade/100.00',
    'Q. 1/99.01',
    'Q. 2/0.99',
    'Grade/10.00',
    'Q. 1/9.90',
    'Q. 2/0.10'
]

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
        },
    });
}

export async function POST(request: NextRequest) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        // Read the raw body as text
        const htmlContent = await request.text();

        if (!htmlContent) {
            return NextResponse.json(
                { error: 'No HTML content provided' },
                { status: 400, headers: corsHeaders }
            );
        }

        const cheerio = require('cheerio');
        const $ = cheerio.load(htmlContent);

        const $table = $('table');
        if ($table.length === 0) {
            return NextResponse.json(
                { error: 'Ignored: No table element found in the provided HTML.' },
                { status: 400, headers: corsHeaders }
            );
        }

        $table.find('.accesshide').remove();
        $table.find('.commands').remove();
        $table.find('.reviewlink').remove();

        const data: any[] = [];
        const headers: string[] = [];

        $table.find('thead th').each((_: any, el: any) => {
            const headerText = $(el).text().trim().replace(/\s+/g, ' ');
            headers.push(headerText || `Unknown_Col_${headers.length}`);
        });
        $table.find('tbody tr').each((_: any, tr: any) => {
            const $tr = $(tr);
            if ($tr.find('td').length === 1 && $tr.find('.tabledivider').length > 0) {
                return;
            }

            const rowData: Record<string, string> = {};

            $tr.find('td').each((index: any, td: any) => {
                const headerName = headers[index];
                let cellData = $(td).text().trim().replace(/\s+/g, ' ');

                if ($(td).find('input[type="checkbox"]').length > 0 && !cellData) {
                    cellData = $(td).find('input[type="checkbox"]').val() as string;
                }

                if (HEADER_TO_IGNORE.includes(headerName)) {
                    return;
                }

                rowData[headerName] = cellData;
            });

            const nameKey = Object.keys(rowData).find(key => key.includes('First name') || key.includes('Last name'));

            if (nameKey) {
                rowData[nameKey] = rowData[nameKey].replace(/Review attempt/i, '').replace(/Overall average/i, '').trim();
                if (!rowData[nameKey]) {
                    return;
                }
            }

            data.push(rowData);
        });

        const url = new URL(request.url);
        const room = url.searchParams.get('room') || 'default';

        emitter.emit(`new_html_data_${room}`, data);

        return NextResponse.json(
            {
                message: 'Successfully processed HTML table',
                rowsCount: data.length,
                data: data,
            },
            {
                status: 200,
                headers: corsHeaders
            }
        );
    } catch (error) {
        console.error('Error processing HTML:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            }
        );
    }
}
