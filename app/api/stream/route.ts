import { NextRequest, NextResponse } from 'next/server';
import { emitter } from '../emitter';

// This is required to make Next.js treat this route as an active stream
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();

    // Create a new continuous TransformStream representing the SSE connection
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = async (data: any) => {
        try {
            await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
            console.error('Error writing to stream', err);
        }
    };

    const url = new URL(req.url);
    const room = url.searchParams.get('room') || 'default';
    const eventName = `new_html_data_${room}`;

    // Subscribes to the event emitted by the POST route for this specific room
    emitter.on(eventName, sendEvent);

    // Detect when the client disconnects and clean up the listener
    req.signal.addEventListener('abort', () => {
        emitter.off(eventName, sendEvent);
        writer.close().catch(() => { });
    });

    return new NextResponse(stream.readable, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
