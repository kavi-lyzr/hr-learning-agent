/**
 * GET /api/ai/conversations
 *
 * Fetch all conversations for a user in an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AgentSession from '@/models/agentSession';
import User from '@/models/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId'); // Lyzr ID
        const organizationId = searchParams.get('organizationId');

        if (!userId || !organizationId) {
            return NextResponse.json(
                { error: 'Missing required parameters: userId and organizationId' },
                { status: 400 }
            );
        }

        // Get user by Lyzr ID
        const user = await User.findOne({ lyzrId: userId });
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Fetch all tutor agent sessions for this user in this organization
        const sessions = await AgentSession.find({
            userId: user._id,
            agentType: 'tutor',
            'context.organizationId': organizationId,
            isActive: true,
        })
            .sort({ lastMessageAt: -1 })
            .limit(50)
            .lean();

        // Transform to conversation format
        const conversations = sessions.map(session => ({
            _id: session._id.toString(),
            sessionId: session.sessionId,
            lastMessageAt: session.lastMessageAt.toISOString(),
            messages: session.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
                attachments: msg.attachments || [],
            })),
            context: session.context,
        }));

        return NextResponse.json({
            success: true,
            conversations,
        });

    } catch (error: unknown) {
        console.error('Error fetching conversations:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch conversations';
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                details: errorMessage,
            },
            { status: 500 }
        );
    }
}
