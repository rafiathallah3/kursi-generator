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

        // Dynamically import cheerio (must be installed: npm install cheerio)
        const cheerio = require('cheerio');
        const $ = cheerio.load(htmlContent);

        // Check if a table exists
        const $table = $('table');
        if ($table.length === 0) {
            // "If it is not, the POST will be ignored."
            return NextResponse.json(
                { error: 'Ignored: No table element found in the provided HTML.' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Clean up hidden screen reader elements before extracting text
        $table.find('.accesshide').remove();
        $table.find('.commands').remove();
        // Remove "Review attempt" links to clean up user names
        $table.find('.reviewlink').remove();

        const data: any[] = [];
        const headers: string[] = [];

        // Parse Table Headers
        $table.find('thead th').each((_: any, el: any) => {
            const headerText = $(el).text().trim().replace(/\s+/g, ' ');
            headers.push(headerText || `Unknown_Col_${headers.length}`);
        });

        // Parse Table Rows
        $table.find('tbody tr').each((_: any, tr: any) => {
            const $tr = $(tr);
            // Skip dividers or rows that don't match the attempt format
            if ($tr.find('td').length === 1 && $tr.find('.tabledivider').length > 0) {
                return;
            }

            const rowData: Record<string, string> = {};

            $tr.find('td').each((index: any, td: any) => {
                const headerName = headers[index];
                let cellData = $(td).text().trim().replace(/\s+/g, ' ');

                // Some special cases for the checkbox or empty columns
                if ($(td).find('input[type="checkbox"]').length > 0 && !cellData) {
                    cellData = $(td).find('input[type="checkbox"]').val() as string;
                }

                if (HEADER_TO_IGNORE.includes(headerName)) {
                    return;
                }

                rowData[headerName] = cellData;
            });

            // Find the key for the Name column
            const nameKey = Object.keys(rowData).find(key => key.includes('First name') || key.includes('Last name'));

            // Clean up name further and handle empty records
            if (nameKey) {
                // Remove fallback string if the element wasn't caught by .reviewlink
                rowData[nameKey] = rowData[nameKey].replace(/Review attempt/i, '').replace(/Overall average/i, '').trim();

                // If name is empty, ignore the row entirely
                if (!rowData[nameKey]) {
                    return;
                }
            }

            data.push(rowData);
        });

        // Get room from URL, defaults to 'default'
        const url = new URL(request.url);
        const room = url.searchParams.get('room') || 'default';

        // Broadcast the parsed data to any SSE client in that specific room
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
