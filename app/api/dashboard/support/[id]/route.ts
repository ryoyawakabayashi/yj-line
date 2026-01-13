import { NextRequest, NextResponse } from 'next/server';
import { getTicketById, updateTicket, updateTicketStatus } from '@/lib/database/support-queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticket = await getTicketById(id);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        userId: ticket.userId,
        ticketType: ticket.ticketType,
        service: ticket.service,
        status: ticket.status,
        priority: ticket.priority || 'normal',
        category: ticket.category,
        content: ticket.content,
        aiSummary: ticket.aiSummary,
        userDisplayName: ticket.userDisplayName,
        userLang: ticket.userLang,
        humanTakeover: ticket.humanTakeover || false,
        humanOperatorName: ticket.humanOperatorName,
        escalatedAt: ticket.escalatedAt?.toISOString() || null,
        escalationReason: ticket.escalationReason,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.status) {
      const success = await updateTicketStatus(id, body.status);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update status' },
          { status: 500 }
        );
      }
    }

    if (body.priority || body.category) {
      const success = await updateTicket(id, {
        priority: body.priority,
        category: body.category,
      });
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update ticket' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
