import { NextRequest, NextResponse } from 'next/server';
import { emitter } from '../emitter';

function mapHeaderName(rawHeader: string): string | null {
    const clean = rawHeader.toLowerCase().trim();
    if (!clean) return null;

    if (clean.includes('name') || clean.includes('nama')) {
        return 'NAME';
    }
    if (clean.includes('id number') || clean.includes('nomor id') || clean.includes('nim') || clean.includes('student id')) {
        return 'ID NUMBER';
    }
    if (clean.includes('status') || clean.includes('state') || clean.includes('keadaan')) {
        return 'STATUS';
    }
    if (clean.includes('started') || clean.includes('dimulai')) {
        return 'STARTED';
    }
    if (clean.includes('completed') || clean.includes('selesai')) {
        return 'COMPLETED';
    }
    if (clean.includes('duration') || clean.includes('durasi') || clean.includes('time taken') || clean.includes('waktu yang dihabiskan')) {
        return 'DURATION';
    }
    return null;
}

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
        const rawBody = await request.text();

        if (!rawBody) {
            return NextResponse.json(
                { error: 'No HTML content provided' },
                { status: 400, headers: corsHeaders }
            );
        }

        let htmlContent = rawBody;
        try {
            const parsed = JSON.parse(rawBody);
            if (parsed && typeof parsed.html === 'string') {
                htmlContent = parsed.html;
            }
        } catch {
            // rawBody is raw HTML text
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
        const headers: (string | null)[] = [];

        $table.find('thead th').each((_: any, el: any) => {
            const headerText = $(el).text().trim().replace(/\s+/g, ' ');
            headers.push(mapHeaderName(headerText));
        });

        $table.find('tbody tr').each((_: any, tr: any) => {
            const $tr = $(tr);
            if ($tr.hasClass('emptyrow')) {
                return;
            }
            if ($tr.find('td').length === 1 && $tr.find('.tabledivider').length > 0) {
                return;
            }

            const rowData: Record<string, string> = {};

            $tr.find('td').each((index: number, td: any) => {
                const headerKey = headers[index];
                if (!headerKey) return;

                let cellData = $(td).text().trim().replace(/\s+/g, ' ');

                if ($(td).find('input[type="checkbox"]').length > 0 && !cellData) {
                    cellData = $(td).find('input[type="checkbox"]').val() as string;
                }

                rowData[headerKey] = cellData;
            });

            if (rowData['NAME']) {
                rowData['NAME'] = rowData['NAME']
                    .replace(/Review attempt/gi, '')
                    .replace(/Overall average/gi, '')
                    .replace(/Rata-rata keseluruhan/gi, '')
                    .trim();

                if (!rowData['NAME'] || rowData['NAME'].toLowerCase() === 'overall average' || rowData['NAME'].toLowerCase() === 'rata-rata keseluruhan') {
                    return;
                }
            }

            if (rowData['NAME'] && (rowData['STATUS'] || rowData['DURATION'])) {
                data.push(rowData);
            }
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
