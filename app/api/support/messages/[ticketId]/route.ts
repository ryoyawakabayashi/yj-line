import { NextRequest, NextResponse } from 'next/server';
import { getTicketMessages } from '@/lib/database/support-queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const messages = await getTicketMessages(ticketId);

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        ticketId: m.ticketId,
        role: m.role,
        content: m.content,
        senderName: m.senderName,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
